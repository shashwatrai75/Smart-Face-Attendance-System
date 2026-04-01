import { useMemo, useState, useEffect } from 'react';
import {
  getSections,
  getSectionById,
  getUsers,
  addSectionMember,
  enrollFace,
} from '../api/api';
import FaceCamera from '../components/FaceCamera';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

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
  const [memberQuery, setMemberQuery] = useState('');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [detectionBox, setDetectionBox] = useState(null);

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

  const filteredMembers = useMemo(() => {
    const q = String(memberQuery || '').trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const u = m.userId || m;
      const name = (u.name || '').toString().toLowerCase();
      const email = (u.email || '').toString().toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [memberQuery, members]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <DashboardLayout pageTitle="Employee Face Scan">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader
          title="Employee Face Scan"
          subtitle="Select a department, then capture face samples to enable biometric check-in."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Department selector + members */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Select Department
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
              >
                <option value="">Select department...</option>
                {sections.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Employees</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Pick a member, then capture and save face data.
                  </p>
                </div>
                {canAddMembers && selectedSectionId ? (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700"
                  >
                    + Add Member
                  </button>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M16.2 16.2 21 21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search employees by name or email…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                {loadingSection ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
                    No members in this department.
                    {canAddMembers ? (
                      <>
                        {' '}
                        <button
                          onClick={() => setShowAddMemberModal(true)}
                          className="font-semibold text-indigo-700 hover:underline dark:text-indigo-200"
                        >
                          Add members
                        </button>
                        .
                      </>
                    ) : null}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
                    No matching employees found.
                  </div>
                ) : (
                  <div className="max-h-[520px] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {filteredMembers.map((m) => {
                        const u = m.userId || m;
                        const uid = (u._id || u.id)?.toString();
                        const isEnrolled = enrolledUserIds.includes(uid);
                        const selectedId =
                          selectedMember &&
                          ((selectedMember.userId?._id || selectedMember.userId?.id || selectedMember.userId)?.toString());
                        const isSelected = selectedId && selectedId === uid;
                        const initial = (u.name || u.email || '?').toString().trim().slice(0, 1).toUpperCase();
                        return (
                          <button
                            type="button"
                            key={uid}
                            onClick={() => {
                              setSelectedMember(m);
                              setFaceImages([]);
                            }}
                            className={[
                              'w-full text-left rounded-xl border p-3 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md',
                              isSelected
                                ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-300/30 dark:bg-indigo-500/10'
                                : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/20',
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold dark:bg-white dark:text-slate-900">
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {u.name || u.email}
                                  </div>
                                  <div className="truncate text-xs text-slate-500 dark:text-slate-300/70">
                                    {u.email}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isEnrolled ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
                                    Enrolled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                                    Not enrolled
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Camera + scan */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Biometric Capture</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Align face and click capture. Save after collecting enough samples.
                </p>
              </div>
              {selectedMember ? (
                <div className="hidden sm:block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20">
                  Selected
                </div>
              ) : null}
            </div>

            {selectedMember ? (
              <>
                <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  Capturing for{' '}
                  <span className="font-semibold">
                    {selectedMember.userId?.name || selectedMember.userId?.email}
                  </span>
                  <span className="text-slate-500 dark:text-slate-300/70"> • </span>
                  <span
                    className={[
                      'font-semibold',
                      isFaceDetected ? 'text-emerald-700 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300/70',
                    ].join(' ')}
                  >
                    {isFaceDetected ? 'Face detected' : 'Align face in the frame'}
                  </span>
                </div>

                <div className="mt-4">
                  <FaceCamera
                    onCapture={handleCapture}
                    onError={(err) => setToast({ message: err, type: 'error' })}
                    samplesRequired={5}
                    requireFaceDetected={true}
                    onDetection={({ detected, box }) => {
                      setIsFaceDetected(!!detected);
                      setDetectionBox(box || null);
                    }}
                  />
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
                    Align face and click <span className="font-semibold">Capture</span>. Capture is disabled until a face is detected.
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setFaceImages([]);
                      setIsFaceDetected(false);
                      setDetectionBox(null);
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEnrollFace}
                    disabled={loading || !faceImages || faceImages.length < 3}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {loading ? 'Saving…' : 'Save face data'}
                  </button>
                </div>

                {detectionBox ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-300/70">
                    Detection box: {Math.round(detectionBox.w)}% × {Math.round(detectionBox.h)}%
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/70">
                Select an employee from the left panel to begin biometric enrollment.
              </div>
            )}
          </div>
        </div>
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
    </DashboardLayout>
  );
};

export default EmployeeFaceScan;
