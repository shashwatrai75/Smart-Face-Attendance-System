import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getCalendarAttendance, getClasses, getStudents, getUsers } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const AttendanceCalendar = () => {
  const { user } = useAuth();
  const canSelectTeacherOrStudent = user?.role === 'superadmin' || user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isViewer = user?.role === 'viewer';

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeDate, setActiveDate] = useState(new Date());
  const [byDate, setByDate] = useState({});
  const [details, setDetails] = useState([]);
  const [summary, setSummary] = useState({ totalPresent: 0, totalLate: 0, totalAbsent: 0, attendancePercent: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [filters, setFilters] = useState({
    classId: '',
    studentId: '',
    lecturerId: '',
  });

  const month = activeDate.getMonth() + 1;
  const year = activeDate.getFullYear();

  useEffect(() => {
    if (canSelectTeacherOrStudent) {
      getClasses().then((r) => setClasses(r.classes || [])).catch(() => setClasses([]));
      getUsers().then((r) => {
        const users = r.users || [];
        setLecturers(users.filter((u) => u.role === 'lecturer'));
      }).catch(() => setLecturers([]));
    } else if (isLecturer) {
      getClasses().then((r) => setClasses(r.classes || [])).catch(() => setClasses([]));
    }
  }, [canSelectTeacherOrStudent, isLecturer]);

  useEffect(() => {
    if (filters.classId && (canSelectTeacherOrStudent || isLecturer)) {
      getStudents(filters.classId).then((r) => setStudents(r.students || [])).catch(() => setStudents([]));
    } else {
      setStudents([]);
    }
  }, [filters.classId, canSelectTeacherOrStudent, isLecturer]);

  useEffect(() => {
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, filters.classId, filters.studentId, filters.lecturerId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (filters.classId) params.classId = filters.classId;
      if (filters.studentId) params.studentId = filters.studentId;
      if (filters.lecturerId) params.lecturerId = filters.lecturerId;

      const response = await getCalendarAttendance(params);
      setByDate(response.byDate || {});
      setDetails(response.details || []);
      setSummary(response.summary || { totalPresent: 0, totalLate: 0, totalAbsent: 0, attendancePercent: 0 });
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to load calendar data', type: 'error' });
      setByDate({});
      setDetails([]);
      setSummary({ totalPresent: 0, totalLate: 0, totalAbsent: 0, attendancePercent: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const d = new Date(date);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const data = byDate[str];
    if (!data || (data.present === 0 && data.late === 0 && data.absent === 0)) return '';
    if (data.absent > 0) return '!bg-red-500 !text-white';
    if (data.late > 0) return '!bg-yellow-400 !text-gray-900';
    return '!bg-green-500 !text-white';
  };

  const handleDateClick = (value) => {
    const d = new Date(value);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(str);
    setShowModal(true);
  };

  const getRecordsForDate = (dateStr) => details.filter((r) => r.date === dateStr);

  const closeModal = () => {
    setShowModal(false);
    setSelectedDateStr(null);
  };

  const getStatusBadge = (status) => {
    const map = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      excused: 'bg-blue-100 text-blue-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const selectedRecords = selectedDateStr ? getRecordsForDate(selectedDateStr) : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Calendar</h1>
            <p className="text-gray-600 mt-1">View attendance by date with role-based filters</p>
          </div>

          {/* Filters - role-based */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(canSelectTeacherOrStudent || isLecturer) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={filters.classId}
                    onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {canSelectTeacherOrStudent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    <select
                      value={filters.studentId}
                      onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Students</option>
                      {students.map((s) => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.fullName} ({s.rollNo})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                    <select
                      value={filters.lecturerId}
                      onChange={(e) => setFilters({ ...filters, lecturerId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Teachers</option>
                      {lecturers.map((u) => (
                        <option key={u._id || u.id} value={u._id || u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded bg-green-500" />
              Present
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded bg-yellow-400" />
              Late
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded bg-red-500" />
              Absent
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Present</p>
              <p className="text-2xl font-bold text-green-600">{summary.totalPresent}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Late</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.totalLate}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Absent</p>
              <p className="text-2xl font-bold text-red-600">{summary.totalAbsent}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Attendance %</p>
              <p className="text-2xl font-bold text-blue-600">{summary.attendancePercent}%</p>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader />
              </div>
            ) : (
              <div className="flex justify-center">
                <Calendar
                  onChange={setActiveDate}
                  value={activeDate}
                  onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveDate(activeStartDate)}
                  onClickDay={handleDateClick}
                  tileClassName={getTileClassName}
                  className="w-full max-w-md mx-auto"
                />
              </div>
            )}
          </div>

          {/* Date Details Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Attendance for {selectedDateStr}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedRecords.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No attendance records for this date</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedRecords.map((rec) => (
                        <div
                          key={rec._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {rec.studentId?.fullName || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {rec.classId?.className || 'N/A'} • {rec.time || '—'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(rec.status)}`}>
                            {rec.status?.charAt(0).toUpperCase() + rec.status?.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
