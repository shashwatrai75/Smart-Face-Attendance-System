import { useState, useEffect } from 'react';
import { getSections, enrollEmployee as enrollEmployeeApi, enrollFace } from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

const EnrollEmployee = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    jobTitle: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    joinDate: '',
    shiftStart: '',
    shiftEnd: '',
    employmentStatus: 'active',
  });
  const [faceImages, setFaceImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchDepartments();
  }, [user?.sectionId]);

  const fetchDepartments = async () => {
    try {
      const response = await getSections();
      const all = response.sections || [];
      const deptSections = all.filter(
        (s) => s.sectionType === 'department' && (s.parentSectionId || !s.hasSubclasses)
      );
      setSections(deptSections);
      // HR: pre-select assigned department when only one or when user.sectionId matches
      if (user?.sectionId && deptSections.length > 0) {
        const assignedId = (user.sectionId && (user.sectionId.id || user.sectionId._id || user.sectionId)).toString();
        const match = deptSections.find((s) => (s._id || s.id).toString() === assignedId);
        if (match) setSelectedDepartmentId((match._id || match.id).toString());
        else if (deptSections.length === 1) setSelectedDepartmentId((deptSections[0]._id || deptSections[0].id).toString());
      }
    } catch (err) {
      setToast({ message: 'Failed to load departments', type: 'error' });
    }
  };

  const handleCapture = (capturedSamples) => {
    setFaceImages(capturedSamples || []);
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!selectedDepartmentId) next.selectedDepartmentId = 'Please select a department.';
    if (!formData.fullName?.trim()) next.fullName = 'Full name is required.';
    if (!formData.employeeId?.trim()) next.employeeId = 'Employee ID is required.';
    if (!formData.email?.trim()) next.email = 'Email is required.';
    if (!formData.phone?.trim()) next.phone = 'Phone is required.';
    if (!formData.gender?.trim()) next.gender = 'Gender is required.';
    if (!formData.jobTitle?.trim()) next.jobTitle = 'Job title is required.';
    if (!formData.joinDate?.trim()) next.joinDate = 'Join date is required.';
    if (!formData.address?.trim()) next.address = 'Address is required.';
    if (!formData.emergencyContactName?.trim()) next.emergencyContactName = 'Emergency contact name is required.';
    if (!formData.emergencyContactPhone?.trim()) next.emergencyContactPhone = 'Emergency contact phone is required.';
    if (!faceImages || faceImages.length < 3) next.faceImages = 'Capture at least 3 face photos.';
    return next;
  };

  const isFormValid = () => {
    const next = validate();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setToast({ message: 'Please fix the highlighted fields.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const result = await enrollEmployeeApi({
        ...formData,
        departmentId: selectedDepartmentId,
      });
      const user = result.user || {};
      const userId = user.id || user._id;

      if (userId && Array.isArray(faceImages)) {
        for (const img of faceImages) {
          try {
            await enrollFace({
              targetType: 'user',
              targetId: userId,
              imageBase64: img,
            });
          } catch (err) {
            console.error('Failed to enroll employee face image', err);
          }
        }
      }
      setToast({
        message: result.tempPassword
          ? `Employee enrolled successfully. Temporary password: ${result.tempPassword} (share with employee securely)`
          : 'Employee enrolled successfully',
        type: 'success',
      });
      setErrors({});
      setFormData({
        fullName: '',
        employeeId: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        jobTitle: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        joinDate: '',
        shiftStart: '',
        shiftEnd: '',
        employmentStatus: 'active',
      });
      setFaceImages([]);
      setSelectedDepartmentId('');
    } catch (err) {
      setToast({ message: err.error || 'Failed to enroll employee', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1';
  const requiredStar = <span className="text-red-500">*</span>;
  const helpText = (msg) =>
    msg ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{msg}</p> : null;

  return (
    <DashboardLayout pageTitle="Enroll Employee">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader
          title="Enroll Employee"
          subtitle="Create a new employee profile and capture face samples for biometric attendance."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Form */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Basic Info</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Required details for the employee profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Full Name {requiredStar}</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => updateForm('fullName', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Aditi Sharma"
                    />
                    {helpText(errors.fullName)}
                  </div>

                  <div>
                    <label className={labelClass}>Employee ID {requiredStar}</label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => updateForm('employeeId', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. EMP-1024"
                    />
                    {helpText(errors.employeeId)}
                  </div>

                  <div>
                    <label className={labelClass}>Email {requiredStar}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className={inputClass}
                      placeholder="name@company.com"
                    />
                    {helpText(errors.email)}
                  </div>

                  <div>
                    <label className={labelClass}>Phone {requiredStar}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. +91 98765 43210"
                    />
                    {helpText(errors.phone)}
                  </div>

                  <div>
                    <label className={labelClass}>Gender {requiredStar}</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateForm('gender', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {helpText(errors.gender)}
                  </div>

                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200/70 dark:bg-white/10" />

              {/* Job Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Job Info</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Department and role details used for attendance grouping.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Department {requiredStar}</label>
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => {
                        setSelectedDepartmentId(e.target.value);
                        setErrors((prev) => {
                          if (!prev.selectedDepartmentId) return prev;
                          const next = { ...prev };
                          delete next.selectedDepartmentId;
                          return next;
                        });
                      }}
                      className={inputClass}
                    >
                      <option value="">Select Department</option>
                      {sections.map((sec) => (
                        <option key={sec._id || sec.id} value={sec._id || sec.id}>
                          {sec.sectionName}
                        </option>
                      ))}
                    </select>
                    {helpText(errors.selectedDepartmentId)}
                  </div>

                  <div>
                    <label className={labelClass}>Job Title {requiredStar}</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => updateForm('jobTitle', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. HR Executive"
                    />
                    {helpText(errors.jobTitle)}
                  </div>

                  <div>
                    <label className={labelClass}>Join Date {requiredStar}</label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => updateForm('joinDate', e.target.value)}
                      className={inputClass}
                    />
                    {helpText(errors.joinDate)}
                  </div>

                  <div>
                    <label className={labelClass}>Employment Status</label>
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => updateForm('employmentStatus', e.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="resigned">Resigned</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200/70 dark:bg-white/10" />

              {/* Additional Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Additional Info</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Contact and address information.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Address {requiredStar}</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      className={inputClass}
                      rows={3}
                      placeholder="Street, city, state, postal code"
                    />
                    {helpText(errors.address)}
                  </div>

                  <div>
                    <label className={labelClass}>Emergency Contact {requiredStar}</label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => updateForm('emergencyContactName', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Rohan Sharma"
                    />
                    {helpText(errors.emergencyContactName)}
                  </div>

                  <div>
                    <label className={labelClass}>Emergency Phone {requiredStar}</label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => updateForm('emergencyContactPhone', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. +91 90000 00000"
                    />
                    {helpText(errors.emergencyContactPhone)}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? 'Enrolling…' : 'Enroll Employee'}
                </button>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                  Tip: Capture 3–5 clear face samples in good lighting before submitting.
                </p>
              </div>
            </form>
          </div>

          {/* RIGHT: Face Capture */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Face Capture</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Align face within the frame and capture 3–5 samples.
                </p>
              </div>
              <div className="hidden sm:block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20">
                Biometric
              </div>
            </div>

            <div className="mt-4">
              <FaceCamera
                onCapture={(samples) => {
                  setFaceImages(samples || []);
                  setErrors((prev) => {
                    if (!prev.faceImages) return prev;
                    const next = { ...prev };
                    delete next.faceImages;
                    return next;
                  });
                }}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
              />
              {helpText(errors.faceImages)}
            </div>

            {faceImages && faceImages.length > 0 ? (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Captured Samples</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300/70">{faceImages.length} saved</p>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {faceImages.slice(0, 10).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Face sample ${idx + 1}`}
                      className="aspect-square w-full rounded-lg border border-slate-200 object-cover shadow-sm dark:border-white/10"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
                No samples yet. Click <span className="font-semibold">Capture</span> a few times until it says Complete.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EnrollEmployee;
