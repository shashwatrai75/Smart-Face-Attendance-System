import { useState, useEffect } from 'react';
import { getSessionHistory, getSessionDetails, getClasses, getAttendanceHistory } from '../api/api';
import { formatDate, formatDateTime } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const canViewTeacherAttendance = user?.role === 'superadmin' || user?.role === 'admin';
  const isViewer = user?.role === 'viewer';
  const [sessions, setSessions] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const [filters, setFilters] = useState({
    classId: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!isViewer) fetchClasses();
      fetchSessions();
    } catch (err) {
      console.error('Error initializing AttendanceHistory:', err);
      setError('Failed to initialize page');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewer, filters.classId, filters.startDate, filters.endDate]);

  const fetchClasses = async () => {
    try {
      const response = await getClasses();
      if (response && response.classes) {
        setClasses(Array.isArray(response.classes) ? response.classes : []);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
      setClasses([]);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      if (isViewer) {
        const params = {};
        if (filters.startDate) params.dateFrom = filters.startDate;
        if (filters.endDate) params.dateTo = filters.endDate;
        const response = await getAttendanceHistory(params);
        if (response && response.attendance) {
          setMyAttendance(Array.isArray(response.attendance) ? response.attendance : []);
        } else {
          setMyAttendance([]);
        }
      } else {
        const params = {};
        if (filters.classId) params.classId = filters.classId;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        const response = await getSessionHistory(params);
        if (response && response.sessions) {
          setSessions(Array.isArray(response.sessions) ? response.sessions : []);
        } else {
          setSessions([]);
        }
      }
    } catch (err) {
      console.error('Sessions fetch error:', err);
      setToast({ message: err?.error || err?.response?.data?.error || 'Failed to load attendance history', type: 'error' });
      if (isViewer) {
        setMyAttendance([]);
      } else {
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    fetchSessions();
  };

  const handleViewDetails = async (sessionId) => {
    if (!sessionId) {
      setToast({ message: 'Invalid session ID', type: 'error' });
      return;
    }
    setLoadingDetails(true);
    setShowModal(true);
    try {
      const response = await getSessionDetails(sessionId);
      if (response) {
        setSessionDetails(response);
        setSelectedSession(sessionId);
      } else {
        setToast({ message: 'No session details found', type: 'error' });
      }
    } catch (err) {
      console.error('Session details error:', err);
      setToast({ message: err?.error || 'Failed to load session details', type: 'error' });
      setSessionDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSessionDetails(null);
    setSelectedSession(null);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      excused: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader />
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchClasses();
                  fetchSessions();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ minHeight: '100vh' }}>
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Sidebar />
        <main className="flex-1 p-8" style={{ backgroundColor: '#f9fafb' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {isViewer ? 'My Attendance' : 'Attendance History'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isViewer ? 'View your attendance records' : 'View previously recorded attendance sessions'}
            </p>
          </div>

          {/* Tabs - Teacher Attendance only for superadmin/admin */}
          {!isViewer && canViewTeacherAttendance && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'sessions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Student Attendance
              </button>
              <button
                onClick={() => setActiveTab('teacher')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'teacher'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Teacher Attendance
              </button>
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className={`grid grid-cols-1 gap-4 ${isViewer ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {!isViewer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={filters.classId}
                    onChange={(e) => handleFilterChange('classId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Classes</option>
                    {classes.map((classItem) => (
                      <option key={classItem._id || classItem.id} value={classItem._id || classItem.id}>
                        {classItem.className}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleApplyFilters}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* My Attendance Table - Viewer only */}
          {isViewer && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                          No attendance records found. Contact administrator if your account is not linked to a student record.
                        </td>
                      </tr>
                    ) : (
                      myAttendance.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.date ? formatDate(record.date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.classId?.className || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(record.status)}`}>
                              {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.time || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sessions Table - Admin, Lecturer (hidden for viewer) */}
          {!isViewer && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg
                            className="w-12 h-12 text-gray-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-lg font-medium">No attendance records found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session._id || session.sessionId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.date ? formatDate(session.date) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{session.className || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{session.subject || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.totalStudents ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {session.presentCount ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {session.absentCount ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.duration || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewDetails(session.sessionId || session._id)}
                            disabled={!session.sessionId && !session._id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Session Details Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                    {sessionDetails?.session && (
                      <p className="text-sm text-gray-600 mt-1">
                        {sessionDetails.session.className} - {formatDate(sessionDetails.session.date)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader />
                    </div>
                  ) : sessionDetails ? (
                    <>
                      {/* Session Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {sessionDetails.session.totalStudents}
                          </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Present</p>
                          <p className="text-2xl font-bold text-green-900">
                            {sessionDetails.session.presentCount}
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Absent</p>
                          <p className="text-2xl font-bold text-red-900">
                            {sessionDetails.session.absentCount}
                          </p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Late</p>
                          <p className="text-2xl font-bold text-yellow-900">
                            {sessionDetails.session.lateCount}
                          </p>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Lecturer:</span>{' '}
                            <span className="text-gray-900">{sessionDetails.session.lecturerName}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Duration:</span>{' '}
                            <span className="text-gray-900">{sessionDetails.session.duration}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Start Time:</span>{' '}
                            <span className="text-gray-900">
                              {new Date(sessionDetails.session.startTime).toLocaleString()}
                            </span>
                          </div>
                          {sessionDetails.session.endTime && (
                            <div>
                              <span className="font-medium text-gray-700">End Time:</span>{' '}
                              <span className="text-gray-900">
                                {new Date(sessionDetails.session.endTime).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Attendance Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Roll No
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time Marked
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Scan Time
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Late Count
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sessionDetails.studentAttendance?.map((student, index) => (
                              <tr key={student.studentId || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.rollNo}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.studentName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                                      student.status
                                    )}`}
                                  >
                                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {student.timestamp ? (
                                    formatDateTime(
                                      student.timestamp.split(' ')[0],
                                      student.timestamp.split(' ')[1]
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {student.lastScanTime ? (
                                    formatDateTime(
                                      new Date(student.lastScanTime).toISOString().split('T')[0],
                                      new Date(student.lastScanTime).toTimeString().split(' ')[0]
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {student.consecutiveLateCount > 0 ? (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                      {student.consecutiveLateCount} consecutive
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No session details available
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AttendanceHistory;
