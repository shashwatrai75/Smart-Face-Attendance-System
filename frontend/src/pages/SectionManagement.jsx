import { useState, useEffect } from 'react';
import {
  getSections,
  getClasses,
  createSection,
  updateSection,
  deleteSection,
} from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const formatDateForInput = (d) => {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.split('T')[0];
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const formatTimeForInput = (t) => {
  if (!t || typeof t !== 'string') return '';
  const match = t.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const h = match[1].padStart(2, '0');
  const m = (match[2] || '00').padStart(2, '0');
  return `${h}:${m}`;
};

const defaultForm = () => ({
  sectionName: '',
  sectionType: 'class',
  classId: '',
  startDate: '',
  endDate: '',
  classStartTime: '',
  classEndTime: '',
  shiftStartTime: '',
  shiftEndTime: '',
  description: '',
});

const SectionManagement = () => {
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState(defaultForm());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectionsRes, classesRes] = await Promise.all([getSections(), getClasses()]);
      setSections(sectionsRes.sections || []);
      setClasses(classesRes.classes || []);
    } catch (err) {
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.sectionName.trim()) e.sectionName = 'Section name is required';
    if (formData.sectionType === 'class') {
      if (!formData.classId) e.classId = 'Please select a class';
      if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
        e.endDate = 'End date must be after start date';
      }
      if (!formData.classStartTime) e.classStartTime = 'Class start time is required';
      if (!formData.classEndTime) e.classEndTime = 'Class end time is required';
      if (formData.classStartTime && formData.classEndTime) {
        const [sh, sm] = formData.classStartTime.split(':').map(Number);
        const [eh, em] = formData.classEndTime.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (startMin >= endMin) e.classEndTime = 'End time must be after start time';
      }
    }
    if (formData.sectionType === 'department') {
      if (formData.shiftStartTime && formData.shiftEndTime) {
        const [sh, sm] = formData.shiftStartTime.split(':').map(Number);
        const [eh, em] = formData.shiftEndTime.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (startMin >= endMin) e.shiftEndTime = 'Shift end time must be after start time';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = {
        sectionName: formData.sectionName.trim(),
        sectionType: formData.sectionType,
        description: formData.description.trim() || undefined,
      };
      if (formData.sectionType === 'class') {
        payload.classId = formData.classId;
        payload.startDate = formData.startDate || undefined;
        payload.endDate = formData.endDate || undefined;
        payload.classStartTime = formData.classStartTime || undefined;
        payload.classEndTime = formData.classEndTime || undefined;
      } else {
        payload.startDate = formData.startDate || undefined;
        payload.shiftStartTime = formData.shiftStartTime || undefined;
        payload.shiftEndTime = formData.shiftEndTime || undefined;
      }

      if (editingSection) {
        await updateSection(editingSection._id, payload);
        setToast({ message: 'Section updated', type: 'success' });
      } else {
        await createSection(payload);
        setToast({ message: 'Section created', type: 'success' });
      }
      setShowForm(false);
      setEditingSection(null);
      setFormData(defaultForm());
      setErrors({});
      fetchData();
    } catch (err) {
      setToast({ message: err.error || 'Failed to save section', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData(defaultForm());
    setErrors({});
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData({
      sectionName: section.sectionName || '',
      sectionType: section.sectionType || 'class',
      classId: section.classId?._id || section.classId || '',
      startDate: formatDateForInput(section.startDate),
      endDate: formatDateForInput(section.endDate),
      classStartTime: formatTimeForInput(section.classStartTime),
      classEndTime: formatTimeForInput(section.classEndTime),
      shiftStartTime: formatTimeForInput(section.shiftStartTime),
      shiftEndTime: formatTimeForInput(section.shiftEndTime),
      description: section.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (section) => {
    setConfirmDialog({
      title: 'Delete Section',
      message: `Delete "${section.sectionName}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteSection(section._id);
          setToast({ message: 'Section deleted', type: 'success' });
          fetchData();
        } catch (err) {
          setToast({ message: err.error || 'Failed to delete', type: 'error' });
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const inputClass =
    'w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Manage Sections
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Create and manage Class and Department sections with date and time settings
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSection(null);
                resetForm();
                setShowForm(!showForm);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg"
            >
              {showForm ? 'Cancel' : '+ Add Section'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                {editingSection ? 'Edit Section' : 'New Section'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className={labelClass}>Section Name</label>
                  <input
                    type="text"
                    value={formData.sectionName}
                    onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                    className={`${inputClass} ${errors.sectionName ? 'border-red-500' : ''}`}
                    placeholder="e.g. CS 101 A"
                    required
                  />
                  {errors.sectionName && (
                    <p className="mt-1 text-sm text-red-500">{errors.sectionName}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Section Type</label>
                  <select
                    value={formData.sectionType}
                    onChange={(e) =>
                      setFormData({ ...formData, sectionType: e.target.value, classId: '' })
                    }
                    className={inputClass}
                  >
                    <option value="class">Class Section</option>
                    <option value="department">Department Section</option>
                  </select>
                </div>

                {formData.sectionType === 'class' && (
                  <>
                    <div>
                      <label className={labelClass}>Link to Class</label>
                      <select
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                        className={`${inputClass} ${errors.classId ? 'border-red-500' : ''}`}
                        required={formData.sectionType === 'class'}
                      >
                        <option value="">Select class...</option>
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.className} - {c.subject}
                          </option>
                        ))}
                      </select>
                      {errors.classId && (
                        <p className="mt-1 text-sm text-red-500">{errors.classId}</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700/50">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Class Duration Settings
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Start Date</label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>End Date</label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className={`${inputClass} ${errors.endDate ? 'border-red-500' : ''}`}
                          />
                          {errors.endDate && (
                            <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Class Start Time</label>
                          <input
                            type="time"
                            value={formData.classStartTime}
                            onChange={(e) =>
                              setFormData({ ...formData, classStartTime: e.target.value })
                            }
                            className={`${inputClass} ${errors.classStartTime ? 'border-red-500' : ''}`}
                            required={formData.sectionType === 'class'}
                          />
                          {errors.classStartTime && (
                            <p className="mt-1 text-sm text-red-500">{errors.classStartTime}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelClass}>Class End Time</label>
                          <input
                            type="time"
                            value={formData.classEndTime}
                            onChange={(e) =>
                              setFormData({ ...formData, classEndTime: e.target.value })
                            }
                            className={`${inputClass} ${errors.classEndTime ? 'border-red-500' : ''}`}
                            required={formData.sectionType === 'class'}
                          />
                          {errors.classEndTime && (
                            <p className="mt-1 text-sm text-red-500">{errors.classEndTime}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {formData.sectionType === 'department' && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Work Shift Settings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Start Date</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({ ...formData, startDate: e.target.value })
                          }
                          className={inputClass}
                          placeholder="Department / employee start"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Shift Start Time</label>
                        <input
                          type="time"
                          value={formData.shiftStartTime}
                          onChange={(e) =>
                            setFormData({ ...formData, shiftStartTime: e.target.value })
                          }
                          className={`${inputClass} ${errors.shiftStartTime ? 'border-red-500' : ''}`}
                        />
                        {errors.shiftStartTime && (
                          <p className="mt-1 text-sm text-red-500">{errors.shiftStartTime}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Shift End Time</label>
                        <input
                          type="time"
                          value={formData.shiftEndTime}
                          onChange={(e) =>
                            setFormData({ ...formData, shiftEndTime: e.target.value })
                          }
                          className={`${inputClass} ${errors.shiftEndTime ? 'border-red-500' : ''}`}
                        />
                        {errors.shiftEndTime && (
                          <p className="mt-1 text-sm text-red-500">{errors.shiftEndTime}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={inputClass}
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
                  >
                    {editingSection ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingSection(null);
                      resetForm();
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div
                key={section._id}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      section.sectionType === 'class'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                    }`}
                  >
                    {section.sectionType === 'class' ? 'Class Section' : 'Department Section'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(section)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(section)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {section.sectionName}
                </h3>
                {section.sectionType === 'class' && section.classId && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {section.classId.className} - {section.classId.subject}
                  </p>
                )}
                {section.sectionType === 'class' && (section.classStartTime || section.classEndTime) && (
                  <p className="text-xs text-gray-500">
                    Class: {section.classStartTime || '–'} – {section.classEndTime || '–'}
                    {section.startDate || section.endDate
                      ? ` · ${section.startDate || '–'} to ${section.endDate || '–'}`
                      : ''}
                  </p>
                )}
                {section.sectionType === 'department' && (section.shiftStartTime || section.shiftEndTime) && (
                  <p className="text-xs text-gray-500">
                    Shift: {section.shiftStartTime || '–'} – {section.shiftEndTime || '–'}
                    {section.startDate ? ` · From ${section.startDate}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
          {sections.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No sections yet. Create one to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SectionManagement;
