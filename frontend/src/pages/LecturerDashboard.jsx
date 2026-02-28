import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSections, startSession } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const LecturerDashboard = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      setSections(response.sections || []);
    } catch (err) {
      setToast({ message: 'Failed to load sections', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const classSections = sections.filter((s) => s.sectionType === 'class');
  const departmentSections = sections.filter((s) => s.sectionType === 'department');

  const handleStartClassSession = async (section) => {
    const classId = section.classId?._id || section.classId;
    if (!classId) {
      setToast({ message: 'Section has no linked class', type: 'error' });
      return;
    }
    try {
      const response = await startSession(classId);
      navigate(`/lecturer/attendance?sessionId=${response.sessionId}&classId=${classId}&sectionType=class`);
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
    }
  };

  const handleDepartmentCheckIn = (section) => {
    navigate(`/lecturer/attendance?sectionId=${section._id}&sectionType=department`);
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
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
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a section to start attendance or check-in
            </p>
          </div>

          {/* Class Sections - Session-based */}
          {classSections.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Class Sections
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classSections.map((section) => (
                  <div
                    key={section._id}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">📚</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                        Class
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                      {section.sectionName}
                    </h3>
                    {section.classId && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                        {section.classId.className} - {section.classId.subject}
                      </p>
                    )}
                    <button
                      onClick={() => handleStartClassSession(section)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      Start Session
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Sections - Check-in/Check-out */}
          {departmentSections.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Department Sections
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departmentSections.map((section) => (
                  <div
                    key={section._id}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🏢</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                        Department
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                      {section.sectionName}
                    </h3>
                    <button
                      onClick={() => handleDepartmentCheckIn(section)}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-xl hover:from-indigo-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                    >
                      Check-In / Check-Out
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sections.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-lg text-center border border-gray-100 dark:border-gray-700">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-4xl">📂</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No sections assigned yet.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LecturerDashboard;
