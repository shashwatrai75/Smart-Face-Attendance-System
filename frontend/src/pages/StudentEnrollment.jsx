import { useState, useEffect } from 'react';
import { getClasses, enrollStudent } from '../api/api';
import { computeAverageEmbedding } from '../ai/faceEngine';
import FaceCamera from '../components/FaceCamera';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const StudentEnrollment = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    rollNo: '',
  });
  const [samples, setSamples] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await getClasses();
      setClasses(response.classes || []);
    } catch (err) {
      setToast({ message: 'Failed to load classes', type: 'error' });
    }
  };

  const handleCapture = (capturedSamples) => {
    const averageEmbedding = computeAverageEmbedding(capturedSamples);
    setSamples(averageEmbedding);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassId) {
      setToast({ message: 'Please select a class', type: 'error' });
      return;
    }
    if (!samples) {
      setToast({ message: 'Please capture face samples first', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await enrollStudent({
        ...formData,
        classId: selectedClassId,
        embeddingFloatArray: samples,
        embeddingVersion: 1,
      });
      setToast({ message: 'Student enrolled successfully', type: 'success' });
      setFormData({ fullName: '', rollNo: '' });
      setSamples(null);
      setSelectedClassId('');
    } catch (err) {
      setToast({ message: err.error || 'Failed to enroll student', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Enroll Student</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Student Information</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((classItem) => (
                      <option key={classItem._id || classItem.id} value={classItem._id || classItem.id}>
                        {classItem.className} - {classItem.subject}
                      </option>
                    ))}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Face Capture Status
                  </label>
                  <div className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {samples ? (
                      <span className="text-green-600">✓ Face captured (5 samples)</span>
                    ) : (
                      <span className="text-gray-500">No samples captured yet</span>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !samples}
                  className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Face Capture</h2>
              <p className="text-sm text-gray-600 mb-4">
                Position your face in the camera and capture 5 samples. The system will create an average embedding.
                <strong className="block mt-2 text-red-600">
                  Note: No photos are stored. Only face embeddings are saved.
                </strong>
              </p>
              <FaceCamera
                onCapture={handleCapture}
                onError={(error) => setToast({ message: error, type: 'error' })}
                samplesRequired={5}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentEnrollment;

