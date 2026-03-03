import { useState, useEffect } from 'react';
import {
  getSections,
  getSectionById,
  getUsers,
  addSectionMember,
  enrollFace,
} from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const EmployeeFaceScan = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [sectionDetails, setSectionDetails] = useState(null);
  const [enrolledUserIds, setEnrolledUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [faceImages, setFaceImages] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const canAddMembers = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr';

  useEffect(() => {
    fetchSections();
    if (canAddMembers) fetchUsers();
  }, [canAddMembers]);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSectionDetails();
    } else {
      setSectionDetails(null);
      setEnrolledUserIds([]);
    }
  }, [selectedSectionId]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const response = await getSections();
      const all = response.sections || [];
      const deptSections = all.filter((s) => s.sectionType === 'department');
      setSections(deptSections);
      if (deptSections.length > 0 && (!selectedSectionId || !deptSections.some((s) => (s._id || s.id) === selectedSectionId))) {
        setSelectedSectionId(deptSections[0]._id || deptSections[0].id);
      }
    } catch (err) {
      setToast({ message: err.error || 'Failed to load departments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (err) {
      setToast({ message: err.error || 'Failed to load users', type: 'error' });
    }
  };

  const fetchSectionDetails = async () => {
    if (!selectedSectionId) return;
    setLoadingSection(true);
    try {
      const response = await getSectionById(selectedSectionId);
      setSectionDetails(response.section || null);
    } catch (err) {
      setToast({ message: err.error || 'Failed to load department details', type: 'error' });
    } finally {
      setLoadingSection(false);
    }
  };

  const members = sectionDetails?.members || [];
  const memberUserIds = members.map((m) => (m.userId?._id || m.userId?.id || m.userId)?.toString());

  const handleCapture = (capturedSamples) => {
    setFaceImages(capturedSamples || []);
  };

  const handleEnrollFace = async () => {
    if (!selectedMember || !faceImages || faceImages.length < 3 || !selectedSectionId) {
      setToast({ message: 'Please capture at least 3 face photos first', type: 'error' });
      return;
    }
    const userId = selectedMember.userId?._id || selectedMember.userId?.id || selectedMember.userId;
    if (!userId) {
      setToast({ message: 'Invalid member', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      for (const img of faceImages) {
        try {
          await enrollFace({
            targetType: 'user',
            targetId: userId,
            imageBase64: img,
          });
        } catch (err) {
          console.error('Failed to enroll department face image', err);
        }
      }
      setToast({ message: 'Face enrolled successfully', type: 'success' });
      setSelectedMember(null);
      setFaceImages([]);
      // Refresh users so enrolled markers stay accurate
      fetchUsers();
    } catch (err) {
      setToast({ message: err.error || 'Failed to enroll face', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberUserId || !selectedSectionId) return;
    setAddingMember(true);
    try {
      await addSectionMember(selectedSectionId, addMemberUserId);
      setToast({ message: 'Member added successfully', type: 'success' });
      setShowAddMemberModal(false);
      setAddMemberUserId('');
      fetchSectionDetails();
    } catch (err) {
      setToast({ message: err.error || 'Failed to add member', type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const usersNotInSection = users.filter((u) => {
    const uid = (u._id || u.id).toString();
    return !memberUserIds.includes(uid);
  });

  // Derive enrolled user IDs based on users having stored face images
  useEffect(() => {
    if (!sectionDetails) {
      setEnrolledUserIds([]);
      return;
    }
    const members = sectionDetails.members || [];
    const ids = members
      .map((m) => (m.userId?._id || m.userId?.id || m.userId)?.toString())
      .filter(Boolean)
      .filter((id) => {
        const u = users.find((user) => (user._id || user.id).toString() === id);
        return u && Array.isArray(u.faceImages) && u.faceImages.length > 0;
      });
    setEnrolledUserIds(ids);
  }, [sectionDetails, users]);

  if (loading && sections.length === 0) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-2">Employee Face Scan</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Select a department, then capture face data for each member to enable face-based check-in.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4">Department</h2>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select department...</option>
                  {sections.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.sectionName} {s.startTime && `(${s.startTime}–${s.endTime || ''})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Members</h2>
                  {canAddMembers && selectedSectionId && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      + Add Member
                    </button>
                  )}
                </div>
                {loadingSection ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 py-4">
                    No members in this department.{' '}
                    {canAddMembers && (
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="text-blue-600 hover:underline"
                      >
                        Add members
                      </button>
                    )}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {members.map((m) => {
                      const u = m.userId || m;
                      const uid = (u._id || u.id)?.toString();
                      const isEnrolled = enrolledUserIds.includes(uid);
                      const isSelected = selectedMember && (selectedMember.userId?._id || selectedMember.userId?.id)?.toString() === uid;
                      return (
                        <div
                          key={uid}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{u.name || u.email}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEnrolled ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                ✓ Enrolled
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedMember(m);
                                  setFaceImages([]);
                                }}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                Enroll Face
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Face Capture</h2>
              {selectedMember ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Capturing face for{' '}
                    <strong>{selectedMember.userId?.name || selectedMember.userId?.email}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Position the employee&apos;s face in the frame and capture 3–5 photos. Use good
                    lighting and ask them to look forward.
                  </p>
                  <FaceCamera
                    onCapture={handleCapture}
                    onError={(err) => setToast({ message: err, type: 'error' })}
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
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedMember(null);
                        setFaceImages([]);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEnrollFace}
                      disabled={loading || !faceImages || faceImages.length < 3}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Enrolling...' : 'Enroll Face'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                  <p className="mb-2">Select a member from the list and click &quot;Enroll Face&quot; to capture their face.</p>
                  <p className="text-sm">Members already enrolled will show a green checkmark.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add Member to Department</h3>
            <select
              value={addMemberUserId}
              onChange={(e) => setAddMemberUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg mb-4"
            >
              <option value="">Select user...</option>
              {usersNotInSection.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            {usersNotInSection.length === 0 && (
              <p className="text-sm text-gray-500 mb-4">All users are already in this department.</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberUserId('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!addMemberUserId || addingMember}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {addingMember ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFaceScan;
