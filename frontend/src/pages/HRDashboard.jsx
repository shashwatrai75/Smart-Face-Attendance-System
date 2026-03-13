import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const DepartmentBadge = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
    {name}
  </span>
);

const HRDashboard = () => {
  const { user } = useAuth();
  const departmentName = user?.department?.name || null;

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
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
        </main>
      </div>
    </div>
  );
};

export default HRDashboard;
