import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getSections,
  getSectionById,
  getStudents,
  startSession,
  markAttendance,
  endSession as endSessionApi,
  recordCheckIn,
  verifyFace,
} from '../api/api';
import { saveAttendanceOffline } from '../offline/syncService';
import { useOffline } from '../context/OfflineContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import { getCurrentTime, getToday } from '../utils/date';
import { useAuth } from '../context/AuthContext';

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

  // Lecturers may only use class attendance; block department (check-in) mode
  useEffect(() => {
    if (user?.role === 'lecturer' && isDepartmentMode) {
      navigate('/lecturer/dashboard', { replace: true });
    }
  }, [user?.role, isDepartmentMode, navigate]);

  const videoRef = useRef(null);

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
  const [statusText, setStatusText] = useState('Waiting to start...');
  const [isScanning, setIsScanning] = useState(false);

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
        console.log('Camera started / restarted');
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      setCameraReady(false);
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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraReady(false);
    }
  };

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
        setStatusText('Camera ready. Click "Scan Face" to check-in/out.');
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

      setStatusText('Loading student data...');
      const studentsResponse = await getStudents(sessionResponse.sectionId || sectionIdForStudents);
      setStudents(studentsResponse.students || []);

      setAttendanceRecords(new Map());
      setIsSessionActive(true);
      setStatusText('Camera ready. Click "Scan Face" to recognize students.');
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
    isDepartmentMode,
    sectionIdParam,
    resolvedSectionId,
    selectedSectionId,
    recordCheckIn,
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
      updated.set(studentId, newRecord);
      return updated;
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
        const finalStatus = result?.finalStatus || 'present';
        const isLate = result?.isLate || false;
        const consecutiveLateCount = result?.consecutiveLateCount || 0;

        setAttendanceRecords((prev) => {
          const updated = new Map(prev);
          const record = updated.get(studentId);
          if (record) {
            updated.set(studentId, {
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
      } catch (err) {
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

    const time = getCurrentTime();
    const newRecord = {
      status,
      time,
      name: student.fullName,
      rollNo: student.rollNo,
    };

    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      updated.set(studentId, newRecord);
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
        await markAttendance({
          sessionId,
          sectionId: resolvedSectionId,
          classSessionId: classSessionIdParam || null,
          recognizedStudents: [attendanceData],
        });
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
    setStatusText(isDepartmentMode ? 'Check-in ended' : 'Session ended');
    setToast({
      message: isDepartmentMode ? 'Check-in session ended' : 'Attendance session ended',
      type: 'success',
    });

    setTimeout(() => {
      navigate('/lecturer/dashboard');
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
  const unmarkedCount = isDepartmentMode
    ? 0
    : students.length - presentCount - lateCount - absentCount;
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

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">Live Attendance Session</h1>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 dark:border dark:border-gray-700">
              <div className="flex flex-wrap gap-4 items-end">
                {!isDepartmentMode ? (
                  <div className="flex-1 min-w-[200px]">
                    {isClassSessionMode || (sectionIdParam && isClassSectionMode) ? (
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Section: {sectionIdParam || selectedSectionId}
                      </p>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Section (Class)
                        </label>
                        <select
                          value={selectedSectionId}
                          onChange={(e) => setSelectedSectionId(e.target.value)}
                          disabled={isSessionActive}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                          <option value="">Choose a section...</option>
                          {sections.map((sec) => (
                            <option key={sec._id || sec.id} value={sec._id || sec.id}>
                              {sec.sectionName}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department Check-In / Check-Out
                    </p>
                    <p className="text-xs text-gray-500">Section ID: {sectionIdParam}</p>
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  {!isSessionActive ? (
                    <button
                      onClick={startAttendance}
                      disabled={!canStartClassMode || initializing}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {initializing
                        ? 'Starting...'
                        : isDepartmentMode
                          ? 'Start Check-In'
                          : 'Start Attendance'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleScanClick}
                        disabled={isScanning}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {isDepartmentMode ? 'Scan Face' : 'Scan & Mark'}
                      </button>
                      <button
                        onClick={endSession}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        {isDepartmentMode ? 'End Check-In' : 'End Session'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Status: <span className="font-medium">{statusText}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">Live Camera Feed</h2>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border-2 border-gray-300 scale-x-[-1]"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Position the person in front of the camera, then click &quot;Scan Face&quot;.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">Attendance Status</h2>

                <div
                  className={`grid gap-3 mb-6 ${isDepartmentMode ? 'grid-cols-2' : 'grid-cols-4'}`}
                >
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                    <div className="text-sm text-gray-600">
                      {isDepartmentMode ? 'Members' : 'Total'}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                    <div className="text-sm text-gray-600">
                      {isDepartmentMode ? 'Scans Today' : 'Present'}
                    </div>
                  </div>
                  {!isDepartmentMode && (
                    <>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                        <div className="text-sm text-gray-600">Late</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {absentCount + unmarkedCount}
                        </div>
                        <div className="text-sm text-gray-600">Absent</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">
                    {isDepartmentMode
                      ? 'Check-In / Check-Out Records'
                      : 'Recognized Students'}
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {recognizedList.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {isDepartmentMode ? 'No check-ins yet' : 'No students recognized yet'}
                      </p>
                    ) : (
                      recognizedList.map((record) => {
                        const isCheckOut =
                          isDepartmentMode && record.action === 'check-out';
                        const isLate =
                          !isDepartmentMode && (record.isLate || record.status === 'late');
                        const isAbsent = !isDepartmentMode && record.status === 'absent';
                        const bgColor = isDepartmentMode
                          ? isCheckOut
                            ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20'
                            : 'bg-green-50 border-green-200 dark:bg-green-900/20'
                          : isAbsent
                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20'
                            : isLate
                              ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20'
                              : 'bg-green-50 border-green-200 dark:bg-green-900/20';
                        const statusColor = isDepartmentMode
                          ? isCheckOut
                            ? 'bg-teal-600'
                            : 'bg-green-600'
                          : isAbsent
                            ? 'bg-red-600'
                            : isLate
                              ? 'bg-yellow-600'
                              : 'bg-green-600';
                        const statusText = isDepartmentMode
                          ? isCheckOut
                            ? '✓ Checked Out'
                            : '✓ Checked In'
                          : isAbsent
                            ? '✗ Absent'
                            : isLate
                              ? '⚠ Late'
                              : '✓ Present';
                        const lastScanTime = record.lastScanTime
                          ? new Date(record.lastScanTime).toLocaleTimeString()
                          : record.time;

                        return (
                          <div
                            key={record.studentId}
                            className={`flex justify-between items-center p-3 ${bgColor} rounded-lg border`}
                          >
                            <div>
                              <p className="font-medium">{record.name}</p>
                              <p className="text-sm text-gray-600">Roll No: {record.rollNo}</p>
                              <p className="text-xs text-gray-500">
                                Scan Time: {lastScanTime}
                              </p>
                              {isDepartmentMode && record.workMinutes && (
                                <p className="text-xs text-teal-600 font-medium">
                                  Work: {record.workMinutes} min
                                </p>
                              )}
                              {!isDepartmentMode && record.consecutiveLateCount > 0 && (
                                <p className="text-xs text-orange-600 font-semibold">
                                  {record.consecutiveLateCount} consecutive late
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-3 py-1 ${statusColor} text-white text-sm rounded-full`}
                            >
                              {statusText}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {!isDepartmentMode && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">All Students</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {students.map((student) => {
                        const record = attendanceRecords.get(student.id);
                        return (
                          <div
                            key={student.id}
                            className={`flex justify-between items-center p-2 rounded ${record
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50 border border-gray-200'
                              }`}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{student.fullName}</p>
                              <p className="text-xs text-gray-600">Roll: {student.rollNo}</p>
                              {(student.dateOfBirth || student.gender) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {student.dateOfBirth && (
                                    <>DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</>
                                  )}
                                  {student.dateOfBirth && student.gender && ' • '}
                                  {student.gender && (
                                    <>{student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}</>
                                  )}
                                </p>
                              )}
                              {(student.guardianName || student.guardianPhone) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Guardian: {student.guardianName || '—'} {student.guardianPhone ? `• ${student.guardianPhone}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {record ? (
                                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                                  {record.status}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualMark(student.id, 'present')}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Mark Present
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isSessionActive && (
              <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center dark:border dark:border-gray-700">
                <div className="text-6xl mb-4">{isDepartmentMode ? '🏢' : '📹'}</div>
                <h3 className="text-xl font-semibold mb-2">Ready to Start</h3>
                <p className="text-gray-600">
                  {isDepartmentMode
                    ? 'Click "Start Check-In" to begin face-based check-in/check-out.'
                    : 'Select a section and click "Start Attendance" to begin the live session.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LiveAttendance;
