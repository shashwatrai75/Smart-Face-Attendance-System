import { useState, useEffect } from 'react';
import { getStats } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.stats || {
        totalUsers: 0,
        activeTeachers: 0,
        totalClasses: 0,
        totalStudents: 0,
        totalAttendance: 0,
        todayAttendance: 0,
      });
    } catch (err) {
      setToast({ message: 'Failed to load stats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, color: 'from-blue-500 to-blue-600', icon: '👥' },
    { label: 'Active Teachers', value: stats?.activeTeachers || 0, color: 'from-green-500 to-green-600', icon: '👨‍🏫' },
    { label: 'Total Classes', value: stats?.totalClasses || 0, color: 'from-purple-500 to-purple-600', icon: '📚' },
    { label: 'Total Students', value: stats?.totalStudents || 0, color: 'from-indigo-500 to-indigo-600', icon: '🎓' },
    { label: 'Total Attendance', value: stats?.totalAttendance || 0, color: 'from-orange-500 to-orange-600', icon: '✅' },
    { label: "Today's Attendance", value: stats?.todayAttendance || 0, color: 'from-red-500 to-red-600', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Overview of your attendance system</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((card, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-lg hover-lift border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm font-medium mb-1">{card.label}</p>
                    <p className={`text-4xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                      {card.value}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${Math.min((card.value / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

