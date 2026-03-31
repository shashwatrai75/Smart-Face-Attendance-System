import { useState, useEffect } from 'react';
import { getSections, enrollStudent, enrollFace } from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSectionId) {
      setToast({ message: 'Please select a section', type: 'error' });
      return;
    }
    if (!formData.guardianName?.trim()) {
      setToast({ message: 'Guardian name is required', type: 'error' });
      return;
    }
    if (!formData.guardianPhone?.trim()) {
      setToast({ message: 'Guardian phone is required', type: 'error' });
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
    if (!faceImages || faceImages.length < 3) {
      setToast({ message: 'Please capture at least 3 face photos', type: 'error' });
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
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Enroll Student</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4">Student Information</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section (Class)
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Guardian Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Guardian Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Full name of parent/guardian"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Guardian Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Contact number"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Face Capture Status
                  </label>
                  <div className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {faceImages && faceImages.length > 0 ? (
                      <span className="text-green-600">
                        ✓ {faceImages.length} face photo{faceImages.length > 1 ? 's' : ''} captured
                      </span>
                    ) : (
                      <span className="text-gray-500">No samples captured yet</span>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !faceImages || faceImages.length < 3}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4">Face Capture</h2>
              <p className="text-sm text-gray-600 mb-4">
                Position the student&apos;s face in the camera and capture 3–5 photos.
                Use good lighting, center the face, and look straight at the camera.
              </p>
              <FaceCamera
                onCapture={handleCapture}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
              />
              {faceImages && faceImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Captured Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {faceImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Face sample ${idx + 1}`}
                        className="w-16 h-16 rounded object-cover border"
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

export default StudentEnrollment;
