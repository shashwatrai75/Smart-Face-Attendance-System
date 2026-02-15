import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClasses, startSession } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const LecturerDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await getClasses();
      setClasses(response.classes || []);
    } catch (err) {
      setToast({ message: 'Failed to load classes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttendance = async (classId) => {
    try {
      const response = await startSession(classId);
      navigate(`/lecturer/attendance?sessionId=${response.sessionId}&classId=${classId}`);
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
    }
  };

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
              My Classes
            </h1>
            <p className="text-gray-600">Manage your classes and start attendance sessions</p>
          </div>
          {classes.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-lg text-center border border-gray-100">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
              <p className="text-gray-500 text-lg">No classes assigned yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem) => (
                <div
                  key={classItem._id || classItem.id}
                  className="bg-white p-6 rounded-2xl shadow-lg hover-lift border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">📚</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{classItem.className}</h3>
                  <p className="text-gray-600 mb-2 font-medium">{classItem.subject}</p>
                  {classItem.schedule && (
                    <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                      <span>🕐</span>
                      {classItem.schedule}
                    </p>
                  )}
                  <button
                    onClick={() => handleStartAttendance(classItem._id || classItem.id)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    Start Attendance
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LecturerDashboard;

