import { useState, useEffect } from 'react';
import { getSections, enrollStudent, enrollFace } from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

const StudentEnrollment = () => {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    rollNo: '',
    dateOfBirth: '',
    gender: '',
    guardianName: '',
    guardianPhone: '',
  });
  const [faceImages, setFaceImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [allSections, setAllSections] = useState([]);
  const [errors, setErrors] = useState({});
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      const all = response.sections || [];
      setAllSections(all);
      const classSections = all.filter(
        (s) => s.sectionType === 'class' && (s.parentSectionId || !s.hasSubclasses)
      );
      setSections(classSections);
    } catch (err) {
      setToast({ message: 'Failed to load sections', type: 'error' });
    }
  };

  const handleCapture = (capturedSamples) => {
    // capturedSamples is an array of Base64-encoded JPEGs from FaceCamera
    setFaceImages(capturedSamples || []);
    setErrors((prev) => {
      if (!prev.faceImages) return prev;
      const next = { ...prev };
      delete next.faceImages;
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!selectedSectionId) next.selectedSectionId = 'Section is required.';
    if (!formData.fullName?.trim()) next.fullName = 'Full name is required.';
    if (!formData.rollNo?.trim()) next.rollNo = 'Roll number is required.';
    if (!formData.dateOfBirth?.trim()) next.dateOfBirth = 'Date of birth is required.';
    if (!formData.gender?.trim()) next.gender = 'Gender is required.';
    if (!formData.guardianName?.trim()) next.guardianName = 'Guardian name is required.';
    if (!formData.guardianPhone?.trim()) next.guardianPhone = 'Guardian phone is required.';
    if (!faceImages || faceImages.length < 3) next.faceImages = 'Capture at least 3 face samples.';
    return next;
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
      const res = await enrollStudent({
        ...formData,
        sectionId: selectedSectionId,
      });
      const student = res.student || {};
      const studentId = student.id || student._id;

      if (studentId && Array.isArray(faceImages)) {
        for (const img of faceImages) {
          try {
            await enrollFace({
              targetType: 'student',
              targetId: studentId,
              imageBase64: img,
            });
          } catch (err) {
            // Continue trying remaining images but surface an error
            console.error('Failed to enroll face image', err);
          }
        }
      }

      setToast({ message: 'Student enrolled successfully', type: 'success' });
      setErrors({});
      setFormData({ fullName: '', rollNo: '', dateOfBirth: '', gender: '', guardianName: '', guardianPhone: '' });
      setFaceImages([]);
      setSelectedSectionId('');
    } catch (err) {
      setToast({ message: err.error || 'Failed to enroll student', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Enroll Student">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader
          title="Enroll Student"
          subtitle="Create a student profile and capture face samples for biometric attendance."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Form */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Student Info</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Basic details required for enrollment.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Section {<span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value);
                        setErrors((prev) => {
                          if (!prev.selectedSectionId) return prev;
                          const next = { ...prev };
                          delete next.selectedSectionId;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                    >
                      <option value="">Select Section</option>
                      {sections.map((sec) => {
                        const parentId = (sec.parentSectionId?._id || sec.parentSectionId)?.toString();
                        const parent = parentId && allSections.find((s) => (s._id || s.id)?.toString() === parentId);
                        const label = parent ? `${parent.sectionName} › ${sec.sectionName}` : sec.sectionName;
                        return (
                          <option key={sec._id || sec.id} value={sec._id || sec.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {errors.selectedSectionId ? (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.selectedSectionId}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        setErrors((prev) => {
                          if (!prev.fullName) return prev;
                          const next = { ...prev };
                          delete next.fullName;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                      placeholder="e.g. Riya Verma"
                    />
                    {errors.fullName ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.fullName}</p> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Roll Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.rollNo}
                      onChange={(e) => {
                        setFormData({ ...formData, rollNo: e.target.value });
                        setErrors((prev) => {
                          if (!prev.rollNo) return prev;
                          const next = { ...prev };
                          delete next.rollNo;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                      placeholder="e.g. 24"
                    />
                    {errors.rollNo ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.rollNo}</p> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        setFormData({ ...formData, dateOfBirth: e.target.value });
                        setErrors((prev) => {
                          if (!prev.dateOfBirth) return prev;
                          const next = { ...prev };
                          delete next.dateOfBirth;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                    />
                    {errors.dateOfBirth ? (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.dateOfBirth}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData({ ...formData, gender: e.target.value });
                        setErrors((prev) => {
                          if (!prev.gender) return prev;
                          const next = { ...prev };
                          delete next.gender;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.gender}</p> : null}
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200/70 dark:bg-white/10" />

              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Guardian Info</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Used for notifications and safety.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Guardian Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) => {
                        setFormData({ ...formData, guardianName: e.target.value });
                        setErrors((prev) => {
                          if (!prev.guardianName) return prev;
                          const next = { ...prev };
                          delete next.guardianName;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                      placeholder="Full name of parent/guardian"
                    />
                    {errors.guardianName ? (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.guardianName}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Guardian Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, guardianPhone: e.target.value });
                        setErrors((prev) => {
                          if (!prev.guardianPhone) return prev;
                          const next = { ...prev };
                          delete next.guardianPhone;
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                      placeholder="Contact number"
                    />
                    {errors.guardianPhone ? (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.guardianPhone}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || !faceImages || faceImages.length < 3}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? 'Enrolling…' : 'Enroll Student'}
                </button>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                  Capture at least 3 samples before submitting.
                </p>
              </div>
            </form>
          </div>

          {/* RIGHT: Face capture */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Face Capture</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Align face inside the frame. Capture 3–5 samples.
                </p>
              </div>
              <div
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                  isFaceDetected
                    ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20'
                    : 'bg-slate-500/10 text-slate-700 ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
                ].join(' ')}
              >
                {isFaceDetected ? 'Face detected' : 'No face'}
              </div>
            </div>

            <div className="mt-4">
              <FaceCamera
                onCapture={handleCapture}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
                requireFaceDetected={true}
                onDetection={({ detected }) => setIsFaceDetected(!!detected)}
              />
              {errors.faceImages ? (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{errors.faceImages}</p>
              ) : null}
            </div>

            {faceImages && faceImages.length > 0 ? (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Captured Samples</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300/70">{faceImages.length}/5 samples</p>
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
                Align face inside the frame and click <span className="font-semibold">Capture</span>.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentEnrollment;
