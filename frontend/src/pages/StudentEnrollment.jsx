import { useState, useEffect } from 'react';
import { getSections, enrollStudent, enrollFace } from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';
import { isValidGmailAddress } from '../utils/studentGmail';
import { guardianPhoneDigitsOnly, guardianPhoneTenDigitError } from '../utils/guardianPhone';

const VALIDATION_FIELD_ORDER = [
  'selectedSectionId',
  'fullName',
  'rollNo',
  'email',
  'dateOfBirth',
  'gender',
  'guardianName',
  'guardianPhone',
  'faceImages',
];

const inputBaseClass =
  'w-full rounded-lg border bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 dark:bg-slate-950/30 dark:text-white';

/** Map API error text to form field keys so the same red highlight appears as for client validation. */
function mapEnrollApiErrorToFields(message) {
  const text = String(message || '');
  const lower = text.toLowerCase();
  const out = {};
  // Do not match "Missing: … roll number …" — only real duplicate / conflict messages.
  if (
    lower.includes('already exists') &&
    (lower.includes('roll number') || lower.includes('rollnumber') || lower.includes('roll no'))
  ) {
    out.rollNo = text;
  } else if (lower.includes('gmail') || lower.includes('@gmail.com')) out.email = text;
  else if (lower.includes('guardian phone') || lower.includes('phone already')) out.guardianPhone = text;
  else if (lower.includes('phone') && (lower.includes('digit') || lower.includes('required'))) out.guardianPhone = text;
  else if (lower.includes('section not found') || lower.includes('container section') || lower.includes('class-type sections')) {
    out.selectedSectionId = text;
  }
  return out;
}

const StudentEnrollment = () => {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    rollNo: '',
    email: '',
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

  const fieldRing = (key) =>
    errors[key]
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40 dark:border-rose-500'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/40 dark:border-white/10';

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
    const emailTrim = formData.email?.trim() || '';
    if (!emailTrim) {
      next.email = 'Student Gmail is required.';
    } else if (!isValidGmailAddress(emailTrim)) {
      next.email = 'Enter a valid Gmail address (must end with @gmail.com).';
    }
    if (!formData.dateOfBirth?.trim()) next.dateOfBirth = 'Date of birth is required.';
    if (!formData.gender?.trim()) next.gender = 'Gender is required.';
    if (!formData.guardianName?.trim()) next.guardianName = 'Guardian name is required.';
    const guardianPhoneDigits = guardianPhoneDigitsOnly(formData.guardianPhone);
    const guardianPhoneErr = guardianPhoneTenDigitError(guardianPhoneDigits);
    if (guardianPhoneErr) next.guardianPhone = guardianPhoneErr;
    if (!faceImages || faceImages.length < 3) next.faceImages = 'Capture at least 3 face samples.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const parts = VALIDATION_FIELD_ORDER.filter((k) => nextErrors[k]).map((k) => nextErrors[k]);
      const count = parts.length;
      const summary =
        count > 1
          ? `Please fix ${count} issues:\n${parts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
          : parts[0] || 'Please fix the highlighted fields.';
      setToast({
        message: summary,
        type: 'error',
        duration: Math.min(3500 + count * 1200, 16000),
      });
      return;
    }

    setLoading(true);
    try {
      const res = await enrollStudent({
        ...formData,
        guardianPhone: guardianPhoneDigitsOnly(formData.guardianPhone),
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
      setFormData({
        fullName: '',
        rollNo: '',
        email: '',
        dateOfBirth: '',
        gender: '',
        guardianName: '',
        guardianPhone: '',
      });
      setFaceImages([]);
      setSelectedSectionId('');
    } catch (err) {
      const msg = err.error || err.message || 'Failed to enroll student';
      const fieldErrors = mapEnrollApiErrorToFields(msg);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      setToast({ message: msg, type: 'error', duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Enroll Student">
      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={typeof toast.duration === 'number' ? toast.duration : 3000}
          onClose={() => setToast(null)}
        />
      ) : null}

      <div className="space-y-6">
        <PageHeader
          title="Enroll Student"
          subtitle="Create a student profile and capture face samples for biometric attendance."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: Form */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
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
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('selectedSectionId')}`}
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
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('fullName')}`}
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
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('rollNo')}`}
                      placeholder="e.g. 24"
                    />
                    {errors.rollNo ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.rollNo}</p> : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Student Gmail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setErrors((prev) => {
                          if (!prev.email) return prev;
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }}
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('email')}`}
                      placeholder="name@gmail.com"
                    />
                    {errors.email ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.email}</p> : null}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Must be a valid @gmail.com address (school Google accounts).
                    </p>
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
                      className={`${inputBaseClass} ${fieldRing('dateOfBirth')}`}
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
                      className={`${inputBaseClass} ${fieldRing('gender')}`}
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
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('guardianName')}`}
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
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      value={formData.guardianPhone}
                      onChange={(e) => {
                        const digits = guardianPhoneDigitsOnly(e.target.value).slice(0, 10);
                        setFormData({ ...formData, guardianPhone: digits });
                        setErrors((prev) => {
                          if (!prev.guardianPhone) return prev;
                          const next = { ...prev };
                          delete next.guardianPhone;
                          return next;
                        });
                      }}
                      className={`${inputBaseClass} placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fieldRing('guardianPhone')}`}
                      placeholder="10-digit number (e.g. 9826728973)"
                    />
                    {errors.guardianPhone ? (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.guardianPhone}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Enter exactly 10 digits. Letters and symbols are removed as you type.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
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
          <div
            className={`rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-900/40 ${
              errors.faceImages
                ? 'border-rose-500 ring-2 ring-rose-500/30 dark:border-rose-500'
                : 'border-slate-200/70 dark:border-white/10'
            }`}
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Face Capture</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                Align face inside the frame. Capture 3–5 samples. Status badges under the camera include live scan when
                your browser supports it.
              </p>
            </div>

            <div className="mt-4">
              <FaceCamera
                onCapture={handleCapture}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
                requireFaceDetected={false}
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
