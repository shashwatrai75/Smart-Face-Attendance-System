import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getClasses,
  getSections,
  getStudentEmbeddings,
  getDepartmentMemberEmbeddings,
  startSession,
  markAttendance,
  endSession as endSessionApi,
  recordCheckIn,
} from '../api/api';
import { saveAttendanceOffline } from '../offline/syncService';
import { loadModels, detectFace, findBestMatch } from '../ai/faceEngine';
import { getRandomChallenge } from '../ai/livenessChallenges';
import { useOffline } from '../context/OfflineContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import LivenessChallenge from '../components/LivenessChallenge';
import { getCurrentTime, getToday } from '../utils/date';

const LiveAttendance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline } = useOffline();

  const sectionType = searchParams.get('sectionType');
  const sectionIdParam = searchParams.get('sectionId');
  const classIdParam = searchParams.get('classId');
  const sessionIdParam = searchParams.get('sessionId');

  const isDepartmentMode = sectionType === 'department' && sectionIdParam;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const pendingLivenessRef = useRef(null);
  const markPresentRef = useRef(null);
  const resumedRef = useRef(false);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(classIdParam || '');
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState(new Map()); // studentId -> {status, time, name, rollNo}
  const [departmentRecords, setDepartmentRecords] = useState(new Map()); // userId -> { action: 'check-in'|'check-out', time }
  const [sessionId, setSessionId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [toast, setToast] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('Waiting to start...');
  const [pendingLiveness, setPendingLiveness] = useState(null);
  pendingLivenessRef.current = pendingLiveness;

  // Load classes/sections on mount (class mode only)
  useEffect(() => {
    if (!isDepartmentMode) {
      fetchClasses();
    } else {
      fetchSections();
    }
  }, [isDepartmentMode]);

  // Auto-resume class session when navigating with sessionId and classId
  useEffect(() => {
    if (
      !isDepartmentMode &&
      sessionIdParam &&
      classIdParam &&
      !resumedRef.current
    ) {
      resumedRef.current = true;
      setSelectedClassId(classIdParam);
      setSessionId(sessionIdParam);
      const resumeSession = async () => {
        setInitializing(true);
        try {
          if (!modelsReady) {
            await loadModels();
            setModelsReady(true);
          }
          if (!cameraReady) {
            await initializeCamera();
          }
          const studentsResponse = await getStudentEmbeddings(classIdParam);
          setStudents(studentsResponse.students || []);
          setAttendanceRecords(new Map());
          setIsSessionActive(true);
          setDetectionStatus('Face detection active');
          startFaceDetection();
        } catch (err) {
          setToast({ message: err.error || 'Failed to load session', type: 'error' });
          resumedRef.current = false;
        } finally {
          setInitializing(false);
        }
      };
      resumeSession();
    }
  }, [sessionIdParam, classIdParam, isDepartmentMode]);


  const fetchSections = async () => {
    try {
      const response = await getSections();
      setSections(response.sections || []);
    } catch (err) {
      setToast({ message: 'Failed to load sections', type: 'error' });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await getClasses();
      setClasses(response.classes || []);
    } catch (err) {
      setToast({ message: 'Failed to load classes', type: 'error' });
    }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (error) {
      setToast({ message: 'Failed to access camera. Please check permissions.', type: 'error' });
      throw error;
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraReady(false);
    }
  };

  const startDepartmentCheckIn = async () => {
    if (!sectionIdParam) {
      setToast({ message: 'No section selected', type: 'error' });
      return;
    }

    setInitializing(true);
    setDetectionStatus('Initializing...');

    try {
      if (!modelsReady) {
        setDetectionStatus('Loading face recognition models...');
        await loadModels();
        setModelsReady(true);
      }

      if (!cameraReady) {
        setDetectionStatus('Starting camera...');
        await initializeCamera();
      }

      setDetectionStatus('Loading department members...');
      const response = await getDepartmentMemberEmbeddings(sectionIdParam);
      setStudents(response.students || []);

      setDepartmentRecords(new Map());
      setIsSessionActive(true);
      setDetectionStatus('Face detection active - Scan to Check-In or Check-Out');
      setToast({ message: 'Check-in mode active!', type: 'success' });
      startFaceDetection();
    } catch (err) {
      setToast({ message: err.error || 'Failed to start', type: 'error' });
      setDetectionStatus('Failed to start');
    } finally {
      setInitializing(false);
    }
  };

  const startAttendance = async () => {
    if (isDepartmentMode) {
      startDepartmentCheckIn();
      return;
    }

    if (!selectedClassId) {
      setToast({ message: 'Please select a class', type: 'error' });
      return;
    }

    setInitializing(true);
    setDetectionStatus('Initializing...');

    try {
      if (!modelsReady) {
        setDetectionStatus('Loading face recognition models...');
        await loadModels();
        setModelsReady(true);
      }

      if (!cameraReady) {
        setDetectionStatus('Starting camera...');
        await initializeCamera();
      }

      setDetectionStatus('Starting attendance session...');
      const sessionResponse = await startSession(selectedClassId);
      setSessionId(sessionResponse.sessionId);

      setDetectionStatus('Loading student data...');
      const studentsResponse = await getStudentEmbeddings(selectedClassId);
      setStudents(studentsResponse.students || []);

      setAttendanceRecords(new Map());
      setIsSessionActive(true);
      setDetectionStatus('Face detection active');
      setToast({ message: 'Attendance session started!', type: 'success' });
      startFaceDetection();
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
      setDetectionStatus('Failed to start');
    } finally {
      setInitializing(false);
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !modelsReady || !isSessionActive) return;
      if (pendingLivenessRef.current) return; // Pause matching during liveness challenge

      try {
        const detection = await detectFace(videoRef.current);

        // Draw bounding box on canvas
        if (canvasRef.current && detection && videoRef.current.videoWidth > 0) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const box = detection.detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Draw label
          ctx.fillStyle = '#00ff00';
          ctx.font = '16px Arial';
          ctx.fillText('Face Detected', box.x, box.y - 5);
        }

        if (detection) {
          const embedding = Array.from(detection.descriptor);
          const match = findBestMatch(embedding, students, 0.6);

          if (match && (isDepartmentMode || !attendanceRecords.has(match.studentId))) {
            // Require liveness before marking attendance
            setPendingLiveness({
              match,
              challenge: getRandomChallenge(),
            });
          }
        } else if (canvasRef.current) {
          // Clear canvas if no face detected
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, 1000); // Check every 1 second
  };

  const handleLivenessSuccess = useCallback(() => {
    const pending = pendingLivenessRef.current;
    if (!pending || !markPresentRef.current) return;
    setPendingLiveness(null);
    markPresentRef.current(pending.match.studentId, pending.match.fullName, pending.match.rollNo);
  }, []);

  const handleLivenessFail = useCallback(() => {
    setPendingLiveness(null);
    setToast({ message: 'Liveness failed. Try again.', type: 'error' });
  }, []);

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

    // Update local state immediately
    setAttendanceRecords((prev) => {
      const updated = new Map(prev);
      updated.set(studentId, newRecord);
      return updated;
    });

    // Save to backend
    const attendanceData = {
      studentId,
      status: 'present',
      time,
      capturedOffline: !isOnline,
    };

    if (isOnline) {
      try {
        const response = await markAttendance(sessionId, selectedClassId, [attendanceData]);
        const result = response.results?.[0];
        const finalStatus = result?.finalStatus || 'present';
        const isLate = result?.isLate || false;
        const consecutiveLateCount = result?.consecutiveLateCount || 0;
        
        // Update record with final status
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
          type: finalStatus === 'absent' ? 'error' : isLate ? 'warning' : 'success'
        });
      } catch (err) {
        await saveAttendanceOffline(sessionId, selectedClassId, studentId, 'present', time);
        setToast({ message: `${fullName} saved offline`, type: 'warning' });
      }
    } else {
      await saveAttendanceOffline(sessionId, selectedClassId, studentId, 'present', time);
      setToast({ message: `${fullName} saved offline`, type: 'warning' });
    }
  };
  markPresentRef.current = markPresent;

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
        await markAttendance(sessionId, selectedClassId, [attendanceData]);
        setToast({ message: `${student.fullName} marked as ${status}`, type: 'success' });
      } catch (err) {
        await saveAttendanceOffline(sessionId, selectedClassId, studentId, status, time);
        setToast({ message: `${student.fullName} saved offline`, type: 'warning' });
      }
    } else {
      await saveAttendanceOffline(sessionId, selectedClassId, studentId, status, time);
      setToast({ message: `${student.fullName} saved offline`, type: 'warning' });
    }
  };

  const endSession = async () => {
    if (!isSessionActive) return;

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

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
    setModelsReady(false);
    setDetectionStatus(isDepartmentMode ? 'Check-in ended' : 'Session ended');
    setToast({
      message: isDepartmentMode ? 'Check-in session ended' : 'Attendance session ended',
      type: 'success',
    });

    setTimeout(() => {
      navigate('/lecturer/dashboard');
    }, 1500);
  };

  const presentCount = isDepartmentMode
    ? Array.from(departmentRecords.values()).filter((r) => r.action === 'check-in' || r.action === 'check-out').length
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
    : Array.from(attendanceRecords.entries()).map(([studentId, record]) => ({
        studentId,
        ...record,
      }));

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {pendingLiveness && (
        <LivenessChallenge
          videoRef={videoRef}
          challenge={pendingLiveness.challenge}
          studentName={`${pendingLiveness.match.fullName} (${pendingLiveness.match.rollNo})`}
          onSuccess={handleLivenessSuccess}
          onFail={handleLivenessFail}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">Live Attendance Session</h1>

            {/* Top Controls */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 dark:border dark:border-gray-700">
              <div className="flex flex-wrap gap-4 items-end">
                {!isDepartmentMode ? (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      disabled={isSessionActive}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Choose a class...</option>
                      {classes.map((classItem) => (
                        <option key={classItem._id || classItem.id} value={classItem._id || classItem.id}>
                          {classItem.className} - {classItem.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department Check-In / Check-Out
                    </p>
                    <p className="text-xs text-gray-500">Section ID: {sectionIdParam}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {!isSessionActive ? (
                    <button
                      onClick={startAttendance}
                      disabled={(!isDepartmentMode && !selectedClassId) || initializing}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {initializing
                        ? 'Starting...'
                        : isDepartmentMode
                          ? 'Start Check-In'
                          : 'Start Attendance'}
                    </button>
                  ) : (
                    <button
                      onClick={endSession}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      {isDepartmentMode ? 'End Check-In' : 'End Session'}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Status: <span className="font-medium">{detectionStatus}</span>
              </div>
            </div>

            {/* Main Content */}
            {isSessionActive && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Camera Feed */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4">Live Camera Feed</h2>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg border-2 border-gray-300 scale-x-[-1]"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ borderRadius: '0.5rem' }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Position students in front of the camera. Faces will be automatically detected and matched.
                  </p>
                </div>

                {/* Right: Attendance Status Panel */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4">Attendance Status</h2>

                  {/* Statistics Cards */}
                  <div className={`grid gap-3 mb-6 ${isDepartmentMode ? 'grid-cols-2' : 'grid-cols-4'}`}>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                      <div className="text-sm text-gray-600">{isDepartmentMode ? 'Members' : 'Total'}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                      <div className="text-sm text-gray-600">{isDepartmentMode ? 'Scans Today' : 'Present'}</div>
                    </div>
                    {!isDepartmentMode && (
                      <>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                          <div className="text-sm text-gray-600">Late</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{absentCount + unmarkedCount}</div>
                          <div className="text-sm text-gray-600">Absent</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Recognized Students / Department Records */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-3">
                      {isDepartmentMode ? 'Check-In / Check-Out Records' : 'Recognized Students'}
                    </h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {                      recognizedList.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          {isDepartmentMode ? 'No check-ins yet' : 'No students recognized yet'}
                        </p>
                      ) : (
                        recognizedList.map((record) => {
                          const isCheckOut = isDepartmentMode && record.action === 'check-out';
                          const isLate = !isDepartmentMode && (record.isLate || record.status === 'late');
                          const isAbsent = !isDepartmentMode && record.status === 'absent';
                          const bgColor = isDepartmentMode
                            ? isCheckOut ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20' : 'bg-green-50 border-green-200 dark:bg-green-900/20'
                            : isAbsent ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : isLate ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20' : 'bg-green-50 border-green-200 dark:bg-green-900/20';
                          const statusColor = isDepartmentMode ? (isCheckOut ? 'bg-teal-600' : 'bg-green-600') : isAbsent ? 'bg-red-600' : isLate ? 'bg-yellow-600' : 'bg-green-600';
                          const statusText = isDepartmentMode ? (isCheckOut ? '✓ Checked Out' : '✓ Checked In') : isAbsent ? '✗ Absent' : isLate ? '⚠ Late' : '✓ Present';
                          const lastScanTime = record.lastScanTime ? new Date(record.lastScanTime).toLocaleTimeString() : record.time;
                          
                          return (
                            <div
                              key={record.studentId}
                              className={`flex justify-between items-center p-3 ${bgColor} rounded-lg border`}
                            >
                              <div>
                                <p className="font-medium">{record.name}</p>
                                <p className="text-sm text-gray-600">Roll No: {record.rollNo}</p>
                                <p className="text-xs text-gray-500">Scan Time: {lastScanTime}</p>
                                {isDepartmentMode && record.workMinutes && (
                                  <p className="text-xs text-teal-600 font-medium">Work: {record.workMinutes} min</p>
                                )}
                                {!isDepartmentMode && record.consecutiveLateCount > 0 && (
                                  <p className="text-xs text-orange-600 font-semibold">
                                    {record.consecutiveLateCount} consecutive late
                                  </p>
                                )}
                              </div>
                              <span className={`px-3 py-1 ${statusColor} text-white text-sm rounded-full`}>
                                {statusText}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* All Students List with Manual Override (class mode only) */}
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
            )}

            {/* Placeholder when session not active */}
            {!isSessionActive && (
              <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center dark:border dark:border-gray-700">
                <div className="text-6xl mb-4">{isDepartmentMode ? '🏢' : '📹'}</div>
                <h3 className="text-xl font-semibold mb-2">Ready to Start</h3>
                <p className="text-gray-600">
                  {isDepartmentMode
                    ? 'Click "Start Check-In" to begin face-based check-in/check-out.'
                    : 'Select a class and click "Start Attendance" to begin the live session.'}
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
