import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getSections,
  getSectionById,
  getStudents,
  startSession,
  markAttendance,
  heartbeatSession,
  endSession as endSessionApi,
  recordCheckIn,
  verifyFace,
  getSessionDetails,
  getSessionHistory,
} from '../api/api';
import { saveAttendanceOffline } from '../offline/syncService';
import { useOffline } from '../context/OfflineContext';
import Toast from '../components/Toast';
import { getCurrentTime, getToday } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

const SAMPLE_W = 64;
const SAMPLE_H = 64;
/** Mean luma (0–255) below this ⇒ treat as black / no visible picture */
const BLACK_FEED_MEAN_MAX = 28;
/** Std dev of luma below this ⇒ flat / solid / covered lens */
const FLAT_FEED_STD_MAX = 7;

/**
 * Sample the current video frame for brightness and contrast (mirrors server “blank” idea).
 * @returns {{ mean: number, std: number } | null}
 */
function measureVideoFrameLuma(canvas, video) {
  if (!video?.videoWidth || !video?.videoHeight || !canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  canvas.width = SAMPLE_W;
  canvas.height = SAMPLE_H;
  ctx.imageSmoothingEnabled = false;
  try {
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  } catch {
    return null;
  }
  let data;
  try {
    data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
  } catch {
    return null;
  }
  const n = SAMPLE_W * SAMPLE_H;
  const lums = new Float32Array(n);
  let li = 0;
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    lums[li++] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  let sum = 0;
  for (let j = 0; j < n; j += 1) sum += lums[j];
  const mean = sum / n;
  let varAcc = 0;
  for (let j = 0; j < n; j += 1) {
    const d = lums[j] - mean;
    varAcc += d * d;
  }
  const std = Math.sqrt(varAcc / n);
  return { mean, std };
}

function getCameraFeedWarningFromStats(stats) {
  if (!stats) return null;
  const { mean, std } = stats;
  if (mean < BLACK_FEED_MEAN_MAX) {
    return 'Camera feed looks black or too dark. Add light, unblock the lens, or pick another camera.';
  }
  if (std < FLAT_FEED_STD_MAX) {
    return 'Camera feed looks blank or flat (lens covered or almost no detail).';
  }
  return null;
}

const LiveAttendance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline } = useOffline();
  const { user } = useAuth();

  const sectionType = searchParams.get('sectionType');
  const sectionIdParam = searchParams.get('sectionId');
  const classSessionIdParam = searchParams.get('classSessionId');
  const sessionIdParam = searchParams.get('sessionId');

  const isDepartmentMode = sectionType === 'department' && sectionIdParam;
  const isClassSessionMode = sectionType === 'class' && sectionIdParam && classSessionIdParam;
  const isClassSectionMode = sectionType === 'class' && sectionIdParam && !classSessionIdParam;

  // Members may only use class attendance; block department (check-in) mode
  useEffect(() => {
    if (user?.role === 'member' && isDepartmentMode) {
      navigate('/member/dashboard', { replace: true });
    }
  }, [user?.role, isDepartmentMode, navigate]);

  // Block live attendance when today's roll is already complete (all present/late, no absents) for this section
  useEffect(() => {
    if (user?.role !== 'member' || isDepartmentMode || isClassSessionMode || !sectionIdParam || !isClassSectionMode) {
      return;
    }
    if (!isOnline) return;

    let cancelled = false;
    const run = async () => {
      const today = getToday();
      if (sessionIdParam) {
        try {
          const d = await getSessionDetails(sessionIdParam);
          if (!cancelled && d?.session && !d.session.endTime) return;
        } catch {
          // stale session id — continue to completion check
        }
      }
      try {
        const res = await getSessionHistory({ sectionId: sectionIdParam, startDate: today, endDate: today });
        const sessions = Array.isArray(res?.sessions) ? res.sessions : [];
        const hasActive = sessions.some((s) => !s.endTime);
        if (hasActive) return;
        const completed = sessions
          .filter((s) => s.endTime)
          .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
        const last = completed[0];
        if (!last) return;
        const t = Number(last.totalStudents || 0);
        const a = Number(last.absentCount ?? 0);
        if (t > 0 && a === 0 && !cancelled) {
          setToast({
            message:
              "Today's attendance is already complete for this section. You can start again tomorrow.",
            type: 'warning',
          });
          navigate('/member/dashboard', { replace: true });
        }
      } catch {
        // ignore network errors
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    user?.role,
    sectionIdParam,
    sessionIdParam,
    isDepartmentMode,
    isClassSessionMode,
    isClassSectionMode,
    isOnline,
    navigate,
  ]);

  const videoRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const cameraIssueToastSentRef = useRef(false);

  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(sectionIdParam || '');
  const [resolvedSectionId, setResolvedSectionId] = useState(sectionIdParam || '');
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState(new Map());
  const [departmentRecords, setDepartmentRecords] = useState(new Map());
  const [sessionId, setSessionId] = useState(sessionIdParam || null);
  const [isSessionActive, setIsSessionActive] = useState(!!sessionIdParam);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [toast, setToast] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFeedWarning, setCameraFeedWarning] = useState(null);
  const [statusText, setStatusText] = useState('Waiting to start...');
  const [isScanning, setIsScanning] = useState(false);
  const [activeSectionName, setActiveSectionName] = useState('');
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [liveFeed, setLiveFeed] = useState([]); // [{key,name,time,status}]

  useEffect(() => {
    if (!isDepartmentMode) {
      fetchSections();
    }
  }, [isDepartmentMode]);

  // Helper to (re)start the camera stream
  const restartCamera = useCallback(async () => {
    try {
      // Stop any existing tracks first
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject;
        if (oldStream && typeof oldStream.getTracks === 'function') {
          oldStream.getTracks().forEach((t) => t.stop());
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        if (typeof videoRef.current.play === 'function') {
          await videoRef.current.play().catch(() => { });
        }
        setCameraReady(true);
        cameraIssueToastSentRef.current = false;
        console.log('Camera started / restarted');
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      setCameraReady(false);
      setCameraFeedWarning(null);
      cameraIssueToastSentRef.current = false;
      setToast({
        message: 'Failed to access camera. Please check permissions.',
        type: 'error',
      });
    }
  }, []);

  // Start camera as soon as page loads
  useEffect(() => {
    restartCamera();
  }, [restartCamera]);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      const all = response.sections || [];
      const classSections = all.filter((s) => s.sectionType === 'class');
      setSections(classSections);
    } catch (err) {
      setToast({ message: 'Failed to load sections', type: 'error' });
    }
  };

  const resolveSectionName = useCallback(async (secId) => {
    if (!secId) return;
    try {
      const res = await getSectionById(secId);
      const sec = res?.section;
      setActiveSectionName(sec?.sectionName || '');
    } catch {
      // ignore
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraReady(false);
      setCameraFeedWarning(null);
      cameraIssueToastSentRef.current = false;
    }
  };

  // Warn when preview goes black or flat (driver glitch, wrong device, lens covered).
  useEffect(() => {
    if (!cameraReady) {
      setCameraFeedWarning(null);
      cameraIssueToastSentRef.current = false;
      return;
    }

    const tick = () => {
      const video = videoRef.current;
      const canvas = analysisCanvasRef.current;
      if (!video || !canvas) return;
      const stats = measureVideoFrameLuma(canvas, video);
      const next = getCameraFeedWarningFromStats(stats);
      setCameraFeedWarning(next);
      if (next && !cameraIssueToastSentRef.current) {
        cameraIssueToastSentRef.current = true;
        setToast({ message: next, type: 'warning' });
      }
      if (!next) {
        cameraIssueToastSentRef.current = false;
      }
    };

    const id = window.setInterval(tick, 1200);
    tick();
    return () => window.clearInterval(id);
  }, [cameraReady]);

  // If the underlying video track stops unexpectedly (device change, driver issue),
  // automatically try to restart the camera so scanning can continue.
  useEffect(() => {
    const video = videoRef.current;
    const stream = video && video.srcObject;
    if (!cameraReady || !stream || typeof stream.getVideoTracks !== 'function') {
      return;
    }

    const [track] = stream.getVideoTracks();
    if (!track) return;

    const handleEnded = () => {
      console.warn('Video track ended or became inactive. Restarting camera...');
      restartCamera();
    };

    track.addEventListener('ended', handleEnded);
    track.addEventListener('inactive', handleEnded);

    return () => {
      track.removeEventListener('ended', handleEnded);
      track.removeEventListener('inactive', handleEnded);
    };
  }, [cameraReady, restartCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startAttendance = async () => {
    if (isDepartmentMode) {
      if (!sectionIdParam) {
        setToast({ message: 'No section selected', type: 'error' });
        return;
      }

      setInitializing(true);
      setStatusText('Starting camera...');

      try {
        if (!cameraReady) {
          setToast({
            message: 'Camera is not ready. Please allow camera access and reload the page.',
            type: 'error',
          });
          setStatusText('Camera not ready');
          return;
        }
        setDepartmentRecords(new Map());
        setIsSessionActive(true);
        setSessionStartedAt(new Date());
        setStatusText('Camera ready. Click Verify to check-in/out.');
        setActiveSectionName('');
        setToast({ message: 'Check-in mode active!', type: 'success' });
      } catch (err) {
        setToast({ message: err.error || 'Failed to start', type: 'error' });
        setStatusText('Failed to start');
      } finally {
        setInitializing(false);
      }
      return;
    }

    let sectionIdForStudents = sectionIdParam || selectedSectionId;
    if (isClassSessionMode) {
      try {
        const sectionRes = await getSectionById(sectionIdParam);
        const sec = sectionRes.section;
        if (!sec) {
          setToast({ message: 'Section not found', type: 'error' });
          return;
        }
        sectionIdForStudents = sec._id;
        setResolvedSectionId(sectionIdForStudents);
      } catch (err) {
        setToast({ message: err.error || 'Failed to load section', type: 'error' });
        return;
      }
    } else if (!sectionIdForStudents && !selectedSectionId) {
      setToast({ message: 'Please select a section', type: 'error' });
      return;
    } else {
      sectionIdForStudents = sectionIdForStudents || selectedSectionId;
      setResolvedSectionId(sectionIdForStudents);
    }

    if (!sectionIdForStudents) {
      setToast({ message: 'Please select a section', type: 'error' });
      return;
    }

    setInitializing(true);
    setStatusText('Initializing...');

    try {
      if (!cameraReady) {
        setToast({
          message: 'Camera is not ready. Please allow camera access and reload the page.',
          type: 'error',
        });
        setStatusText('Camera not ready');
        return;
      }

      setStatusText('Starting attendance session...');
      const startPayload = isClassSessionMode
        ? { classSessionId: classSessionIdParam }
        : { sectionId: sectionIdForStudents };
      const sessionResponse = await startSession(startPayload);
      setSessionId(sessionResponse.sessionId);
      setResolvedSectionId(sessionResponse.sectionId || sectionIdForStudents);
      setSessionStartedAt(new Date());
      resolveSectionName(sessionResponse.sectionId || sectionIdForStudents);

      setStatusText('Loading student data...');
      const studentsResponse = await getStudents(sessionResponse.sectionId || sectionIdForStudents);
      setStudents(studentsResponse.students || []);

      setAttendanceRecords(new Map());
      setLiveFeed([]);
      setIsSessionActive(true);
      setStatusText('Camera ready. Click Scan & Mark to recognize students.');
      setToast({ message: 'Attendance session started!', type: 'success' });
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
      setStatusText('Failed to start');
    } finally {
      setInitializing(false);
    }
  };

  const captureFrameBase64 = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const performScan = useCallback(async () => {
    if (!isSessionActive || !cameraReady) return;
    const imageBase64 = captureFrameBase64();
    if (!imageBase64) {
      setToast({ message: 'Camera not ready. Please wait a moment.', type: 'error' });
      return;
    }

    setIsScanning(true);
    try {
      if (!isDepartmentMode && isOnline && sessionId) {
        try {
          await heartbeatSession(sessionId);
        } catch (err) {
          const msg = err?.error || err?.response?.data?.error || '';
          if (String(msg).toLowerCase().includes('session')) {
            setToast({ message: msg || 'Session is no longer active', type: 'warning' });
            await endSession();
            return;
          }
        }
      }

      const sectionIdForVerify = isDepartmentMode
        ? sectionIdParam
        : resolvedSectionId || sectionIdParam || selectedSectionId;

      const response = await verifyFace({
        imageBase64,
        sectionId: sectionIdForVerify,
      });

      if (!response.matched || !response.user) {
        setToast({ message: 'No matching face found in this section.', type: 'warning' });
        return;
      }

      const matched = response.user;

      if (isDepartmentMode) {
        try {
          const checkRes = await recordCheckIn(sectionIdParam, matched.id);
          const action = checkRes.action || 'check-in';
          const record = checkRes.record || {};
          const now = new Date();
          setDepartmentRecords((prev) => {
            const updated = new Map(prev);
            updated.set(matched.id, {
              action,
              time: now,
              workMinutes: record.workMinutes,
              name: matched.name,
              rollNo: matched.email,
            });
            return updated;
          });
          const msg =
            action === 'check-out' && record.workMinutes
              ? `✓ ${matched.name} checked out. Work: ${record.workMinutes} min`
              : `✓ ${matched.name} checked in`;
          setToast({ message: msg, type: 'success' });
        } catch (err) {
          setToast({ message: err.error || 'Failed to record', type: 'error' });
        }
      } else {
        await markPresent(matched.id, matched.fullName, matched.rollNo);
      }
    } catch (err) {
      console.error('Verification error', err);
      setToast({ message: err.error || 'Failed to verify face', type: 'error' });
    } finally {
      setIsScanning(false);
    }
  }, [
    isSessionActive,
    cameraReady,
    isOnline,
    isDepartmentMode,
    sectionIdParam,
    resolvedSectionId,
    selectedSectionId,
    recordCheckIn,
    sessionId,
  ]);

  const handleScanClick = () => {
    if (!isSessionActive) return;
    performScan();
  };

  const markPresent = async (studentId, fullName, rollNo) => {
    if (isDepartmentMode) {
      try {
        const response = await recordCheckIn(sectionIdParam, studentId);
        const action = response.action || 'check-in';
        const record = response.record || {};
        setDepartmentRecords((prev) => {
          const updated = new Map(prev);
          updated.set(studentId, {
            action,
            time: new Date(),
            workMinutes: record.workMinutes,
            name: fullName,
            rollNo,
          });
          return updated;
        });
        const msg =
          action === 'check-out' && record.workMinutes
            ? `✓ ${fullName} checked out. Work: ${record.workMinutes} min`
            : `✓ ${fullName} checked in`;
        setToast({ message: msg, type: 'success' });
      } catch (err) {
        setToast({ message: err.error || 'Failed to record', type: 'error' });
      }
      return;
    }

    const sid = String(studentId);
    const prior = attendanceRecords.get(sid);
    if (prior?.status) {
      setToast({
        message: 'Attendance already happened for this session.',
        type: 'warning',
      });
      return;
    }

    const time = getCurrentTime();
    const newRecord = {
      status: 'present',
      time,
      name: fullName,
      rollNo,
      lastScanTime: new Date(),
    };

    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      updated.set(sid, newRecord);
      return updated;
    });

    setLiveFeed((prev) => {
      const row = {
        key: sid,
        studentId: sid,
        name: fullName,
        time: new Date().toLocaleTimeString(),
        status: 'present',
      };
      const rest = prev.filter((e) => String(e.studentId) !== sid);
      return [row, ...rest].slice(0, 50);
    });

    const attendanceData = {
      studentId,
      status: 'present',
      time,
      capturedOffline: !isOnline,
    };

    if (isOnline) {
      try {
        const response = await markAttendance({
          sessionId,
          sectionId: resolvedSectionId,
          classSessionId: classSessionIdParam || null,
          recognizedStudents: [attendanceData],
        });
        const result = response.results?.[0];
        if (result?.status === 'already_marked') {
          setToast({
            message:
              result.message || 'Attendance already happened for this session.',
            type: 'warning',
          });
          return;
        }

        const finalStatus = result?.finalStatus || 'present';
        const isLate = result?.isLate || false;
        const consecutiveLateCount = result?.consecutiveLateCount || 0;

        setAttendanceRecords((prev) => {
          const updated = new Map(prev);
          const record = updated.get(sid);
          if (record) {
            updated.set(sid, {
              ...record,
              status: finalStatus,
              isLate,
              consecutiveLateCount,
            });
          }
          return updated;
        });

        let message = `✓ ${fullName} (${rollNo}) marked ${finalStatus}`;
        if (isLate && finalStatus === 'late') {
          message += ` (Late - ${consecutiveLateCount} consecutive)`;
        } else if (finalStatus === 'absent') {
          message += ` (3 consecutive late attendances)`;
        }

        setToast({
          message,
          type: finalStatus === 'absent' ? 'error' : isLate ? 'warning' : 'success',
        });

        setLiveFeed((prev) => {
          const rest = prev.filter((e) => String(e.studentId) !== sid);
          const head = prev.find((e) => String(e.studentId) === sid);
          if (!head) return prev;
          return [{ ...head, status: finalStatus }, ...rest];
        });
      } catch (err) {
        const msg = err?.error || err?.response?.data?.error || '';
        const lower = String(msg).toLowerCase();
        if (lower.includes('session not found') || lower.includes('session is not active')) {
          setToast({ message: 'Session ended due to inactivity. Please check Reports for session summaries.', type: 'warning' });
          await endSession();
          return;
        }
        await saveAttendanceOffline(sessionId, resolvedSectionId, studentId, 'present', time);
        setToast({ message: `${fullName} saved offline`, type: 'warning' });
      }
    } else {
      await saveAttendanceOffline(sessionId, resolvedSectionId, studentId, 'present', time);
      setToast({ message: `${fullName} saved offline`, type: 'warning' });
    }
  };
  const handleManualMark = async (studentId, status) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const sid = String(studentId);
    const prior = attendanceRecords.get(sid);
    if (prior?.status) {
      setToast({
        message: 'Attendance already happened for this session.',
        type: 'warning',
      });
      return;
    }

    const time = getCurrentTime();
    const newRecord = {
      status,
      time,
      name: student.fullName,
      rollNo: student.rollNo,
    };

    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      updated.set(sid, newRecord);
      return updated;
    });

    const attendanceData = {
      studentId,
      status,
      time,
      capturedOffline: !isOnline,
    };

    if (isOnline) {
      try {
        const response = await markAttendance({
          sessionId,
          sectionId: resolvedSectionId,
          classSessionId: classSessionIdParam || null,
          recognizedStudents: [attendanceData],
        });
        const result = response.results?.[0];
        if (result?.status === 'already_marked') {
          setToast({
            message:
              result.message || 'Attendance already happened for this session.',
            type: 'warning',
          });
          return;
        }
        setToast({ message: `${student.fullName} marked as ${status}`, type: 'success' });
      } catch (err) {
        await saveAttendanceOffline(sessionId, resolvedSectionId, studentId, status, time);
        setToast({ message: `${student.fullName} saved offline`, type: 'warning' });
      }
    } else {
      await saveAttendanceOffline(sessionId, resolvedSectionId, studentId, status, time);
      setToast({ message: `${student.fullName} saved offline`, type: 'warning' });
    }
  };

  const endSession = async () => {
    if (!isSessionActive) return;

    stopCamera();

    if (!isDepartmentMode && sessionId && isOnline) {
      try {
        await endSessionApi(sessionId);
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }

    setIsSessionActive(false);
    setSessionId(null);
    setSessionStartedAt(null);
    setStatusText(isDepartmentMode ? 'Check-in ended' : 'Session ended');
    setToast({
      message: isDepartmentMode ? 'Check-in session ended' : 'Attendance session ended',
      type: 'success',
    });

    setTimeout(() => {
      navigate('/member/dashboard');
    }, 1500);
  };

  const presentCount = isDepartmentMode
    ? Array.from(departmentRecords.values()).filter(
      (r) => r.action === 'check-in' || r.action === 'check-out'
    ).length
    : Array.from(attendanceRecords.values()).filter((r) => r.status === 'present').length;
  const lateCount = isDepartmentMode
    ? 0
    : Array.from(attendanceRecords.values()).filter((r) => r.status === 'late').length;
  const absentCount = isDepartmentMode
    ? 0
    : Array.from(attendanceRecords.values()).filter((r) => r.status === 'absent').length;
  const markedCount =
    !isDepartmentMode ? presentCount + lateCount + absentCount : 0;
  const rosterSize = students.length;
  const unmarkedCount = isDepartmentMode
    ? 0
    : Math.max(0, rosterSize - markedCount);
  const statsTotal = isDepartmentMode ? rosterSize : Math.max(rosterSize, markedCount);
  const recognizedList = isDepartmentMode
    ? Array.from(departmentRecords.entries()).map(([userId, record]) => ({
      studentId: userId,
      ...record,
      name: students.find((s) => s.id === userId)?.fullName || 'Unknown',
      rollNo: students.find((s) => s.id === userId)?.rollNo || '',
    }))
    : Array.from(attendanceRecords.entries()).map(([sid, record]) => ({
      studentId: sid,
      ...record,
    }));

  const canStartClassMode =
    isDepartmentMode
      ? !!sectionIdParam
      : !!sectionIdParam || !!selectedSectionId;

  // Timer tick (for UI)
  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = useMemo(() => {
    if (!isSessionActive || !sessionStartedAt) return '00:00';
    const ms = nowTick - new Date(sessionStartedAt).getTime();
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [isSessionActive, sessionStartedAt, nowTick]);

  // Poll session details for multi-device "realtime"
  useEffect(() => {
    if (!isOnline || !sessionId || !isSessionActive || isDepartmentMode) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await getSessionDetails(sessionId);
        const list = Array.isArray(res?.studentAttendance) ? res.studentAttendance : [];
        setAttendanceRecords((prev) => {
          const next = new Map(prev);
          for (const st of list) {
            const sid = st.studentId || st.id;
            if (!sid) continue;
            const existing = next.get(String(sid));
            const serverHasMark =
              st.timestamp != null && st.timestamp !== '';
            let status = (st.status || '').toLowerCase() || existing?.status || 'present';
            if (
              !serverHasMark &&
              status === 'absent' &&
              existing?.status &&
              ['present', 'late', 'excused'].includes(existing.status)
            ) {
              status = existing.status;
            }
            const time = st.timestamp ? String(st.timestamp) : existing?.time || '';
            next.set(String(sid), {
              ...(existing || {}),
              status,
              time,
              name: st.studentName || existing?.name,
              rollNo: st.rollNo || existing?.rollNo,
              lastScanTime: st.lastScanTime ? new Date(st.lastScanTime) : existing?.lastScanTime,
              consecutiveLateCount: st.consecutiveLateCount || existing?.consecutiveLateCount || 0,
            });
          }
          return next;
        });
      } catch {
        // ignore transient errors
      }
    };
    const id = window.setInterval(() => {
      if (!alive) return;
      poll();
    }, 4000);
    poll();
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [isOnline, sessionId, isSessionActive, isDepartmentMode]);

  return (
    <DashboardLayout pageTitle="Live Attendance">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="space-y-6">
        <PageHeader
          title="Live Attendance"
          subtitle="Real-time biometric attendance tracking"
          actions={
            <div className="flex items-center gap-2">
              {!isSessionActive ? (
                <button
                  type="button"
                  onClick={startAttendance}
                  disabled={!canStartClassMode || initializing}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {initializing ? 'Starting…' : isDepartmentMode ? 'Start Check-In' : 'Start Session'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleScanClick}
                    disabled={isScanning}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-emerald-700 hover:shadow-md disabled:opacity-60"
                  >
                    {isDepartmentMode ? 'Verify' : 'Scan & Mark'}
                  </button>
                  <button
                    type="button"
                    onClick={endSession}
                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-rose-700 hover:shadow-md"
                  >
                    End
                  </button>
                </>
              )}
            </div>
          }
        />

        {/* Live panel */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {isSessionActive ? 'Active Session' : 'No active session'}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                Section:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {activeSectionName || (resolvedSectionId || selectedSectionId || sectionIdParam || '—')}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                Status: <span className="font-semibold text-slate-700 dark:text-slate-200">{statusText}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isDepartmentMode && !(isClassSessionMode || (sectionIdParam && isClassSectionMode)) ? (
                <div className="min-w-[240px]">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                    Select Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    disabled={isSessionActive}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    <option value="">Choose…</option>
                    {sections.map((sec) => (
                      <option key={sec._id || sec.id} value={sec._id || sec.id}>
                        {sec.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">
                  Time running
                </div>
                <div key={elapsed} className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                  {elapsed}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: camera */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Camera Preview</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">
                  Align your face in the frame, then use Verify or Scan & Mark.
                </div>
              </div>
              <div
                className={[
                  'text-xs font-semibold',
                  !cameraReady
                    ? 'text-rose-600 dark:text-rose-300'
                    : cameraFeedWarning
                      ? 'text-amber-700 dark:text-amber-200'
                      : 'text-emerald-600 dark:text-emerald-300',
                ].join(' ')}
              >
                {!cameraReady ? 'Camera blocked' : cameraFeedWarning ? 'Check camera feed' : 'Camera ready'}
              </div>
            </div>

            <div className="relative mt-4 aspect-video w-full min-h-[220px] overflow-hidden rounded-2xl border border-slate-200/70 bg-black dark:border-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 block h-full w-full object-cover object-center [transform:scaleX(-1)]"
              />
              {cameraReady && cameraFeedWarning ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-amber-500/95 px-3 py-2 text-center text-xs font-semibold text-amber-950 shadow-sm dark:bg-amber-600/95 dark:text-amber-50"
                  role="status"
                >
                  {cameraFeedWarning}
                </div>
              ) : null}
            </div>
            <canvas ref={analysisCanvasRef} width={SAMPLE_W} height={SAMPLE_H} className="sr-only" aria-hidden="true" />
          </div>

          {/* Right: live list + stats */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Live Attendance Feed</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">
                  New detections appear instantly.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-white/5">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300/70">Total</div>
                  <div key={statsTotal} className="text-lg font-semibold text-slate-900 dark:text-white">{statsTotal}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center dark:bg-emerald-400/10">
                  <div className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-200/80">Present</div>
                  <div key={presentCount} className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{presentCount}</div>
                </div>
                {!isDepartmentMode ? (
                  <>
                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-center dark:bg-amber-400/10">
                      <div className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-200/80">Late</div>
                      <div key={lateCount} className="text-lg font-semibold text-amber-900 dark:text-amber-200">{lateCount}</div>
                    </div>
                    <div className="rounded-xl bg-rose-50 px-3 py-2 text-center dark:bg-rose-400/10">
                      <div className="text-[11px] font-semibold text-rose-700/80 dark:text-rose-200/80">Absent</div>
                      <div key={absentCount + unmarkedCount} className="text-lg font-semibold text-rose-800 dark:text-rose-200">{absentCount + unmarkedCount}</div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {liveFeed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
                  No detections yet. Click <span className="font-semibold">Scan</span> to add students live.
                </div>
              ) : (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {liveFeed.map((s) => (
                    <div
                      key={s.key}
                      className="live-row-in flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-sm font-semibold">
                          {(s.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{s.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-300/70">{s.time}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
                        {String(s.status || 'present').toLowerCase() === 'late' ? 'Late' : String(s.status || 'present').toLowerCase() === 'absent' ? 'Absent' : 'Present'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveAttendance;
