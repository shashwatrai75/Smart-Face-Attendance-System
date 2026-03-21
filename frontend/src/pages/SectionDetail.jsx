import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getSectionById,
  getClassSessionsBySection,
  createClassSession,
  updateClassSession,
  deleteClassSession,
  getUsers,
} from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const formatTime = (t) => (t ? t.substring(0, 5) : '–');

const SectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [classSessions, setClassSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    subject: '',
    teacherId: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectionRes, usersRes] = await Promise.all([
        getSectionById(id),
        getUsers(),
      ]);
      setSection(sectionRes.section);
      const memberUsers = (usersRes.users || []).filter(
        (u) => (u.role === 'member' || u.role === 'lecturer' || u.role === 'admin') && u.status === 'active'
      );
      setMembers(memberUsers);

      if (sectionRes.section?.sectionType === 'class') {
        const sessionsRes = await getClassSessionsBySection(id);
        setClassSessions(sessionsRes.classSessions || []);
      } else {
        setClassSessions([]);
      }
    } catch (err) {
      setToast({ message: err.error || 'Failed to load section', type: 'error' });
      setSection(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sessionName || !formData.subject || !formData.teacherId || !formData.startTime || !formData.endTime) {
      setToast({ message: 'All fields are required', type: 'error' });
      return;
    }
    try {
      if (editingSession) {
        await updateClassSession(editingSession._id, formData);
        setToast({ message: 'Class session updated', type: 'success' });
      } else {
        await createClassSession(id, formData);
        setToast({ message: 'Class session created', type: 'success' });
      }
      setShowForm(false);
      setEditingSession(null);
      setFormData({ sessionName: '', subject: '', teacherId: '', startTime: '', endTime: '' });
      fetchData();
    } catch (err) {
      setToast({ message: err.error || 'Failed to save', type: 'error' });
    }
  };

  const handleEdit = (s) => {
    setEditingSession(s);
    setFormData({
      sessionName: s.sessionName || '',
      subject: s.subject || '',
      teacherId: s.teacherId?._id || s.teacherId || '',
      startTime: formatTime(s.startTime),
      endTime: formatTime(s.endTime),
    });
    setShowForm(true);
  };

  const handleDelete = (s) => {
    setConfirmDialog({
      message: `Delete "${s.sessionName}"?`,
      onConfirm: async () => {
        try {
          await deleteClassSession(s._id);
          setToast({ message: 'Deleted', type: 'success' });
          fetchData();
        } catch (err) {
          setToast({ message: err.error || 'Failed', type: 'error' });
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <p className="text-gray-600">Section not found.</p>
            <Link to="/admin/sections" className="text-indigo-600 hover:underline mt-4 inline-block">
              ← Back to Sections
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const isClassSection = section.sectionType === 'class';
  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Link to="/admin/sections" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Back to Sections
          </Link>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-gray-200 dark:border-gray-700">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${
                isClassSection ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {isClassSection ? 'Class Section' : 'Department Section'}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {section.sectionName}
            </h1>
            {section.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-2">{section.description}</p>
            )}
            {isClassSection && (section.classStartTime || section.classEndTime) && (
              <p className="text-sm text-gray-500">
                Class time: {section.startTime || '–'} – {section.endTime || '–'}
              </p>
            )}
          </div>

          {isClassSection && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Class Sessions</h2>
                <button
                  onClick={() => {
                    setEditingSession(null);
                    setFormData({ sessionName: '', subject: '', teacherId: '', startTime: '', endTime: '' });
                    setShowForm(!showForm);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {showForm ? 'Cancel' : 'Create Class Session'}
                </button>
              </div>

              {showForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingSession ? 'Edit Class Session' : 'New Class Session'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className={labelClass}>Session Name</label>
                      <input
                        type="text"
                        value={formData.sessionName}
                        onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Lecture 1"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Subject</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Mathematics"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Teacher</label>
                      <select
                        value={formData.teacherId}
                        onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                        className={inputClass}
                        required
                      >
                        <option value="">Select teacher</option>
                        {members.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Start Time</label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>End Time</label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        {editingSession ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingSession(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classSessions.map((s) => (
                  <div
                    key={s._id}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">{s.sessionName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{s.subject}</p>
                    <p className="text-xs text-gray-500">
                      {s.teacherId?.name || 'N/A'} · {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() =>
                          navigate(
                            `/member/attendance?sectionType=class&sectionId=${id}&classSessionId=${s._id}`
                          )
                        }
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Take Attendance
                      </button>
                      <button onClick={() => handleEdit(s)} className="text-sm text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {classSessions.length === 0 && !showForm && (
                <p className="text-gray-500 py-8 text-center">No class sessions yet. Create one to start attendance.</p>
              )}
            </>
          )}

          {!isClassSection && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600">
                Department sections use check-in/check-out attendance. Go to Live Attendance and select a department section.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SectionDetail;
