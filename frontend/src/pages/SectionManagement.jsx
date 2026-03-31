import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TimePickerField from '../components/TimePickerField';

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

const defaultSubclass = () => ({ name: '', startTime: '', endTime: '' });

const defaultForm = () => ({
  sectionName: '',
  sectionType: 'class',
  needSubclasses: false,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  description: '',
  subclasses: [defaultSubclass()],
});

const SectionManagement = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
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
      const res = await getSections();
      setSections(res.sections || []);
    } catch (err) {
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.sectionName.trim()) e.sectionName = 'Section name is required';
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      e.endDate = 'End date must be after start date';
    }
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (startMin >= endMin) e.endTime = 'End time must be after start time';
    }
    if (formData.needSubclasses && !editingSection) {
      const subs = formData.subclasses || [];
      const filled = subs.filter((s) => (s.name || '').trim());
      if (filled.length === 0) {
        e.subclasses = 'Add at least one subclass';
      } else {
        const names = filled.map((s) => (s.name || '').trim());
        const seen = new Set();
        for (const n of names) {
          const lower = n.toLowerCase();
          if (seen.has(lower)) {
            e.subclasses = `Duplicate subclass name: "${n}"`;
            break;
          }
          seen.add(lower);
        }
        if (!e.subclasses) {
          for (let i = 0; i < subs.length; i++) {
            const s = subs[i];
            if (!(s.name || '').trim()) continue;
            const st = s.startTime || '';
            const et = s.endTime || '';
            if (st && et) {
              const [sh, sm] = st.split(':').map(Number);
              const [eh, em] = et.split(':').map(Number);
              const startMin = sh * 60 + (sm || 0);
              const endMin = eh * 60 + (em || 0);
              if (startMin >= endMin) {
                e[`subclass_${i}`] = 'End time must be after start time';
                break;
              }
            }
          }
        }
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
        hasSubclasses: formData.needSubclasses,
        description: formData.description.trim() || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
      };

      if (editingSection) {
        payload.hasSubclasses = formData.hasSubclasses ?? formData.needSubclasses;
        await updateSection(editingSection._id, payload);
        setToast({ message: 'Section updated', type: 'success' });
      } else {
        if (formData.needSubclasses && (formData.subclasses || []).length > 0) {
          payload.subclasses = formData.subclasses
            .filter((s) => (s.name || '').trim())
            .map((s) => ({
              name: (s.name || '').trim(),
              startTime: s.startTime || undefined,
              endTime: s.endTime || undefined,
            }));
        }
        const res = await createSection(payload);
        const section = res.data?.section || res.section;
        setToast({ message: 'Section created', type: 'success' });
        if (section?.hasSubclasses) {
          setShowForm(false);
          setFormData(defaultForm());
          fetchData();
          navigate(`/admin/sections/${section._id}`);
          return;
        }
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
      ...defaultForm(),
      sectionName: section.sectionName || '',
      sectionType: section.sectionType || 'class',
      needSubclasses: section.hasSubclasses === true,
      hasSubclasses: section.hasSubclasses === true,
      startDate: formatDateForInput(section.startDate),
      endDate: formatDateForInput(section.endDate),
      startTime: formatTimeForInput(section.startTime),
      endTime: formatTimeForInput(section.endTime),
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

  const rootSections = sections.filter((s) => !s.parentSectionId);
  const childrenOf = (parentId) =>
    sections.filter((s) => s.parentSectionId && String(s.parentSectionId) === String(parentId));

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
                Create and manage Class and Department sections
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
                    placeholder="e.g. Class 10, CS 101, or HR Department"
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
                    onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="class">Class (Education)</option>
                    <option value="department">Department (Office)</option>
                  </select>
                </div>

                {!editingSection && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="needSubclasses"
                      checked={formData.needSubclasses}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          needSubclasses: checked,
                          subclasses: checked ? [defaultSubclass()] : [],
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="needSubclasses" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Need Subclasses
                    </label>
                  </div>
                )}

                {!editingSection && formData.needSubclasses && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-5 bg-indigo-50/50 dark:bg-indigo-950/20"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Subclasses
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            subclasses: [...(prev.subclasses || []), defaultSubclass()],
                          }))
                        }
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        + Add Another Subclass
                      </button>
                    </div>
                    {errors.subclasses && (
                      <p className="mb-3 text-sm text-red-500">{errors.subclasses}</p>
                    )}
                    <div className="space-y-4">
                      {(formData.subclasses || []).map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm transition-opacity duration-200"
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Subclass {idx + 1}
                            </span>
                            {(formData.subclasses || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (formData.subclasses || []).filter((_, i) => i !== idx);
                                  setFormData({ ...formData, subclasses: next });
                                }}
                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className={labelClass}>Subclass Name</label>
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => {
                                  const next = [...(formData.subclasses || [])];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setFormData({ ...formData, subclasses: next });
                                }}
                                className={inputClass}
                                placeholder="e.g. A, B, or Morning Batch"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Start Time</label>
                              <TimePickerField
                                value={sub.startTime}
                                onChange={(v) => {
                                  const next = [...(formData.subclasses || [])];
                                  next[idx] = { ...next[idx], startTime: v };
                                  setFormData({ ...formData, subclasses: next });
                                }}
                                placeholder="08:00"
                                hasError={!!errors[`subclass_${idx}`]}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>End Time</label>
                              <TimePickerField
                                value={sub.endTime}
                                onChange={(v) => {
                                  const next = [...(formData.subclasses || [])];
                                  next[idx] = { ...next[idx], endTime: v };
                                  setFormData({ ...formData, subclasses: next });
                                }}
                                placeholder="10:00"
                                hasError={!!errors[`subclass_${idx}`]}
                              />
                              {errors[`subclass_${idx}`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`subclass_${idx}`]}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editingSection && editingSection.parentSectionId == null && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasSubclassesEdit"
                      checked={formData.hasSubclasses}
                      onChange={(e) => setFormData({ ...formData, hasSubclasses: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="hasSubclassesEdit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Subclasses
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      (Cannot disable while subclasses exist)
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {formData.sectionType === 'class' ? 'Class' : 'Shift'} Duration (Optional)
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
                      <label className={labelClass}>Start Time</label>
                      <TimePickerField
                        value={formData.startTime}
                        onChange={(v) => setFormData({ ...formData, startTime: v })}
                        placeholder="HH:MM"
                        hasError={!!errors.startTime}
                      />
                      {errors.startTime && (
                        <p className="mt-1 text-sm text-red-500">{errors.startTime}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>End Time</label>
                      <TimePickerField
                        value={formData.endTime}
                        onChange={(v) => setFormData({ ...formData, endTime: v })}
                        placeholder="HH:MM"
                        hasError={!!errors.endTime}
                      />
                      {errors.endTime && (
                        <p className="mt-1 text-sm text-red-500">{errors.endTime}</p>
                      )}
                    </div>
                  </div>
                </div>

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

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Section Hierarchy</h2>
            {rootSections.map((section) => (
              <div key={section._id} className="space-y-2">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          section.sectionType === 'class'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}
                      >
                        {section.sectionType === 'class' ? 'Class' : 'Department'}
                      </span>
                      {section.hasSubclasses && (
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Container</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        to={`/admin/sections/${section._id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Manage
                      </Link>
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
                  {(section.startTime || section.endTime) && (
                    <p className="text-xs text-gray-500">
                      {section.startTime || '–'} – {section.endTime || '–'}
                      {section.startDate || section.endDate
                        ? ` · ${section.startDate || '–'} to ${section.endDate || '–'}`
                        : ''}
                    </p>
                  )}
                </div>
                {childrenOf(section._id).length > 0 && (
                  <div className="ml-6 pl-4 border-l-4 border-l-indigo-400 space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2">
                      ├── Subclasses
                    </p>
                    {childrenOf(section._id).map((child) => (
                      <div
                        key={child._id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{child.sectionName}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Under: {section.sectionName}</p>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to={`/admin/sections/${child._id}`}
                              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                              Manage
                            </Link>
                            <button
                              onClick={() => handleEdit(child)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(child)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {sections.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No sections yet. Create one to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SectionManagement;
