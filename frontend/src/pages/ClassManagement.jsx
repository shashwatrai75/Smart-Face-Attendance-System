import { useState, useEffect } from 'react';
import { getClasses, createClass, updateClass, deleteClass, getUsers } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    className: '',
    subject: '',
    lecturerId: '',
    schedule: '',
    section: '',
    room: '',
    semester: '',
    academicYear: '',
    description: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchLecturers();
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

  const fetchLecturers = async () => {
    try {
      const response = await getUsers();
      const lecturerUsers = (response.users || []).filter(
        (u) => u.role === 'lecturer' && u.status === 'active'
      );
      setLecturers(lecturerUsers);
    } catch (err) {
      console.error('Failed to load lecturers:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClass(formData);
      setToast({ message: 'Class created successfully', type: 'success' });
      setShowForm(false);
      setFormData({
        className: '',
        subject: '',
        lecturerId: '',
        schedule: '',
        section: '',
        room: '',
        semester: '',
        academicYear: '',
        description: '',
      });
      fetchClasses();
    } catch (err) {
      setToast({ message: err.error || 'Failed to create class', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClass(id);
      setToast({ message: 'Class deleted successfully', type: 'success' });
      fetchClasses();
    } catch (err) {
      setToast({ message: err.error || 'Failed to delete class', type: 'error' });
    }
    setConfirmDialog(null);
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Class Management</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Create Class'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-bold mb-4">Create New Class</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lecturer
                  </label>
                  <select
                    value={formData.lecturerId}
                    onChange={(e) => setFormData({ ...formData, lecturerId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Lecturer</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer._id || lecturer.id} value={lecturer._id || lecturer.id}>
                        {lecturer.name} ({lecturer.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Mon, Wed, Fri 10:00 AM"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., A, B, Section 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 101, Lab A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Spring, Fall, Semester 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 2023-2024"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    rows="2"
                    placeholder="Brief description of the class"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Class
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lecturer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((classItem) => (
                  <tr key={classItem._id || classItem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {classItem.className}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.lecturerId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.schedule || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.room || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.section || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classItem.semester || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            message: `Are you sure you want to delete ${classItem.className}?`,
                            onConfirm: () => handleDelete(classItem._id || classItem.id),
                          })
                        }
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClassManagement;

