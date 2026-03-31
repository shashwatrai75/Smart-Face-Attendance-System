import { useState, useEffect } from 'react';
import { getSections, enrollEmployee as enrollEmployeeApi, enrollFace } from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

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
  };

  const isFormValid = () => {
    return (
      selectedDepartmentId &&
      formData.fullName?.trim() &&
      formData.employeeId?.trim() &&
      formData.email?.trim() &&
      formData.phone?.trim() &&
      formData.dateOfBirth?.trim() &&
      formData.gender?.trim() &&
      formData.jobTitle?.trim() &&
      formData.address?.trim() &&
      formData.emergencyContactName?.trim() &&
      formData.emergencyContactPhone?.trim() &&
      formData.joinDate?.trim() &&
      formData.shiftStart?.trim() &&
      formData.shiftEnd?.trim() &&
      formData.employmentStatus?.trim() &&
      faceImages &&
      faceImages.length >= 3
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDepartmentId) {
      setToast({ message: 'Please select a department', type: 'error' });
      return;
    }
    if (!formData.fullName?.trim()) {
      setToast({ message: 'Full name is required', type: 'error' });
      return;
    }
    if (!formData.employeeId?.trim()) {
      setToast({ message: 'Employee ID is required', type: 'error' });
      return;
    }
    if (!formData.email?.trim()) {
      setToast({ message: 'Email is required', type: 'error' });
      return;
    }
    if (!formData.phone?.trim()) {
      setToast({ message: 'Phone is required', type: 'error' });
      return;
    }
    if (!formData.dateOfBirth?.trim()) {
      setToast({ message: 'Date of birth is required', type: 'error' });
      return;
    }
    if (!formData.gender?.trim()) {
      setToast({ message: 'Gender is required', type: 'error' });
      return;
    }
    if (!formData.jobTitle?.trim()) {
      setToast({ message: 'Job title is required', type: 'error' });
      return;
    }
    if (!formData.address?.trim()) {
      setToast({ message: 'Address is required', type: 'error' });
      return;
    }
    if (!formData.emergencyContactName?.trim()) {
      setToast({ message: 'Emergency contact name is required', type: 'error' });
      return;
    }
    if (!formData.emergencyContactPhone?.trim()) {
      setToast({ message: 'Emergency contact phone is required', type: 'error' });
      return;
    }
    if (!formData.joinDate?.trim()) {
      setToast({ message: 'Join date is required', type: 'error' });
      return;
    }
    if (!formData.shiftStart?.trim()) {
      setToast({ message: 'Shift start time is required', type: 'error' });
      return;
    }
    if (!formData.shiftEnd?.trim()) {
      setToast({ message: 'Shift end time is required', type: 'error' });
      return;
    }
    if (!formData.employmentStatus?.trim()) {
      setToast({ message: 'Employment status is required', type: 'error' });
      return;
    }
    if (!faceImages || faceImages.length < 3) {
      setToast({ message: 'Please capture at least 3 face photos', type: 'error' });
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
    'w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const requiredStar = <span className="text-red-500">*</span>;

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Enroll Employee</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Department */}
                <div>
                  <label className={labelClass}>Department {requiredStar}</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select Department</option>
                    {sections.map((sec) => (
                      <option key={sec._id || sec.id} value={sec._id || sec.id}>
                        {sec.sectionName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Information */}
                <h2 className="text-xl font-bold pt-2">Employee Information</h2>
                <div>
                  <label className={labelClass}>Full Name {requiredStar}</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Employee ID {requiredStar}</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => updateForm('employeeId', e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Email {requiredStar}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone {requiredStar}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date of Birth {requiredStar}</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateForm('dateOfBirth', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Gender {requiredStar}</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateForm('gender', e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Job Title {requiredStar}</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => updateForm('jobTitle', e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Address {requiredStar}</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    className={inputClass}
                    rows={3}
                    required
                  />
                </div>

                {/* Emergency Contact */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Emergency Contact
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Emergency Contact Name {requiredStar}</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName}
                        onChange={(e) => updateForm('emergencyContactName', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Emergency Contact Phone {requiredStar}</label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => updateForm('emergencyContactPhone', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Company Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Join Date {requiredStar}</label>
                      <input
                        type="date"
                        value={formData.joinDate}
                        onChange={(e) => updateForm('joinDate', e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Shift Start (24hr) {requiredStar}</label>
                        <input
                          type="time"
                          value={formData.shiftStart}
                          onChange={(e) => updateForm('shiftStart', e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Shift End (24hr) {requiredStar}</label>
                        <input
                          type="time"
                          value={formData.shiftEnd}
                          onChange={(e) => updateForm('shiftEnd', e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Employment Status {requiredStar}</label>
                      <select
                        value={formData.employmentStatus}
                        onChange={(e) => updateForm('employmentStatus', e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="resigned">Resigned</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Face Capture Status */}
                <div>
                  <label className={labelClass}>Face Capture Status</label>
                  <div className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                    {faceImages && faceImages.length > 0 ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {faceImages.length} face photo{faceImages.length > 1 ? 's' : ''} captured
                      </span>
                    ) : (
                      <span className="text-gray-500">No samples captured yet (0/5)</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isFormValid()}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enrolling...' : 'Enroll Employee'}
                </button>
              </form>
            </div>

            {/* Face Capture */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4">Face Capture</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Position the employee&apos;s face in the frame and capture 3–5 photos.
                Use good lighting, center the face, and look forward.
              </p>
              <FaceCamera
                onCapture={handleCapture}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
              />
              {faceImages && faceImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Captured Photos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {faceImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Face sample ${idx + 1}`}
                        className="w-16 h-16 rounded object-cover border dark:border-gray-600"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EnrollEmployee;
