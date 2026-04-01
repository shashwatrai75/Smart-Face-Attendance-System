import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../api/api';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TimePickerField from '../components/TimePickerField';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';
import SectionCard from '../components/sections/SectionCard';
import SectionCardSkeleton from '../components/sections/SectionCardSkeleton';

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
    'w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300/70 mb-1.5';

  const rootSections = sections.filter((s) => !s.parentSectionId);
  const childrenOf = (parentId) =>
    sections.filter((s) => s.parentSectionId && String(s.parentSectionId) === String(parentId));

  return (
    <DashboardLayout pageTitle="Manage Sections">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <div className="space-y-6">
        <PageHeader
          title="Manage Sections"
          subtitle="Create and organize classes and departments"
          actions={
            <button
              type="button"
              onClick={() => {
                setEditingSection(null);
                resetForm();
                setShowForm((v) => !v);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              {showForm ? 'Cancel' : '+ Add Section'}
            </button>
          }
        />

          {showForm && (
            <div className="max-w-3xl rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
              <h2 className="text-lg font-semibold mb-1 text-slate-900 dark:text-white">
                {editingSection ? 'Edit Section' : 'New Section'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300/70">
                {editingSection ? 'Update section settings and schedule.' : 'Add a new class or department section.'}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Section Info</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Section Name</label>
                      <input
                        type="text"
                        value={formData.sectionName}
                        onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                        className={`${inputClass} ${errors.sectionName ? 'border-rose-400/60 ring-1 ring-rose-400/30' : ''}`}
                        placeholder="e.g. Class 10, CS 101, HR Department"
                        required
                      />
                      {errors.sectionName && (
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.sectionName}</p>
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
                  </div>
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

                <div className="space-y-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Schedule Info</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        className={`${inputClass} ${errors.endDate ? 'border-rose-400/60 ring-1 ring-rose-400/30' : ''}`}
                      />
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.endDate}</p>
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
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.startTime}</p>
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
                        <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{errors.endTime}</p>
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
                    rows={3}
                    placeholder="Optional notes"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
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
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-100 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                Sections
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-300/70">
                {sections.length} total
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <SectionCardSkeleton count={6} />
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-slate-900/40">
                <div className="mx-auto max-w-md">
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">No sections created yet</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Create your first class or department to start enrolling and tracking attendance.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(null);
                      resetForm();
                      setShowForm(true);
                    }}
                    className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  >
                    + Add Section
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rootSections.map((section) => {
                  const kids = childrenOf(section._id);
                  const metaParts = [];
                  if (section.startTime || section.endTime) metaParts.push(`${section.startTime || '–'}–${section.endTime || '–'}`);
                  if (section.startDate || section.endDate) metaParts.push(`${section.startDate || '–'} to ${section.endDate || '–'}`);
                  const meta = metaParts.join(' · ');
                  return (
                    <div key={section._id} className="space-y-3">
                      <SectionCard
                        section={section}
                        subtitle={section.description || (kids.length ? `${kids.length} subclasses` : '')}
                        rightMeta={meta || undefined}
                        onEdit={() => handleEdit(section)}
                        onDelete={() => handleDelete(section)}
                      />

                      {kids.length > 0 ? (
                        <div className="space-y-3 pl-2">
                          {kids.map((child) => (
                            <SectionCard
                              key={child._id}
                              section={child}
                              subtitle={`Under: ${section.sectionName}`}
                              rightMeta={child.description || ''}
                              onEdit={() => handleEdit(child)}
                              onDelete={() => handleDelete(child)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    </DashboardLayout>
  );
};

export default SectionManagement;
