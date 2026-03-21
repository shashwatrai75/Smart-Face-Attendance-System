import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notifyEmployeeNoCheckInSMS } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';

const DepartmentBadge = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
    {name}
  </span>
);

const HRDashboard = () => {
  const { user } = useAuth();
  const departmentName = user?.department?.name || null;
  const [toast, setToast] = useState(null);
  const [smsBusy, setSmsBusy] = useState(false);

  const handleNoCheckInSms = async () => {
    if (
      !window.confirm(
        'Send SMS to employees who have not checked in today? (Uses their profile phone number and Twilio.)'
      )
    ) {
      return;
    }
    setSmsBusy(true);
    try {
      const res = await notifyEmployeeNoCheckInSMS({});
      setToast({
        message: `SMS: ${res.sent} sent, ${res.failed} failed, ${res.skipped} skipped (no phone). ${res.hitCap ? 'Cap reached.' : ''}`,
        type: res.sent > 0 ? 'success' : 'error',
      });
    } catch (err) {
      setToast({ message: err?.error || 'SMS request failed', type: 'error' });
    } finally {
      setSmsBusy(false);
    }
  };

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Supervisor Dashboard
              </h1>
              {departmentName && (
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                  Department: <span className="text-gray-900 dark:text-white">{departmentName}</span>
                </span>
              )}
            </div>
            {!departmentName && (
              <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                No department assigned. Contact office admin to assign your department.
              </p>
            )}
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Employee enrollment, face scan, and attendance
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/hr/enroll-employee"
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">👤</span>
                </div>
                {departmentName && <DepartmentBadge name={departmentName} />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Enroll Employee</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Register new employees with face capture</p>
            </Link>
            <Link
              to="/hr/face-scan"
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📷</span>
                </div>
                {departmentName && <DepartmentBadge name={departmentName} />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Employee Face Scan</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add face data for existing department members</p>
            </Link>
            <Link
              to="/hr/attendance"
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📹</span>
                </div>
                {departmentName && <DepartmentBadge name={departmentName} />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Live Attendance</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Face-based check-in for departments</p>
            </Link>
            <Link
              to="/hr/history"
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📜</span>
                </div>
                {departmentName && <DepartmentBadge name={departmentName} />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">History</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">View check-in and attendance history</p>
            </Link>
            <Link
              to="/hr/reports"
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📈</span>
                </div>
                {departmentName && <DepartmentBadge name={departmentName} />}
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reports</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Attendance and summary reports</p>
            </Link>
          </div>

          <div className="mt-8 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 max-w-3xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Employee SMS (no check-in)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Sends a message to each department member&apos;s <strong>phone number on file</strong> if they did not
              check in today (server date). Admins can use the same API with an optional department filter.
            </p>
            <button
              type="button"
              disabled={smsBusy || !departmentName}
              onClick={handleNoCheckInSms}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {smsBusy ? 'Sending…' : 'Notify employees (no check-in today)'}
            </button>
            {!departmentName && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                Assign a department to your account to enable this action.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HRDashboard;
