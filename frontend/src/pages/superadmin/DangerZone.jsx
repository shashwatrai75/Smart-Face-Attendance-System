import { useState, useEffect } from 'react';
import { purgeAttendance, purgeData, getSections } from '../../api/api';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Toast from '../../components/Toast';

const DangerZone = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purgeType, setPurgeType] = useState('attendance');
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState([]);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    getSections().then((r) => setSections(r.sections || [])).catch(() => setSections([]));
  }, []);

  const handlePurgeAttendance = async () => {
    if (confirmText !== 'PURGE') return;
    setLoading(true);
    try {
      await purgeAttendance(sectionId ? { sectionId } : {});
      setToast({ message: 'Attendance purged successfully', type: 'success' });
      setConfirmText('');
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Purge failed', type: 'error' });
    } finally { setLoading(false); }
  };

  const handlePurgeData = async () => {
    if (confirmText !== 'PURGE' || !purgeType) return;
    setLoading(true);
    try {
      await purgeData(purgeType);
      setToast({ message: 'Data purged successfully', type: 'success' });
      setConfirmText('');
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Purge failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Danger Zone</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Irreversible actions. Use with extreme caution.</p>
          </div>
          <div className="space-y-6 max-w-2xl">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">Purge Attendance</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">Remove attendance records. Optionally filter by section.</p>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white mb-4 mr-2">
                <option value="">All sections</option>
                {sections.map((s) => <option key={s._id} value={s._id}>{s.sectionName}</option>)}
              </select>
              <input placeholder="Type PURGE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white mr-2" />
              <button onClick={handlePurgeAttendance} disabled={confirmText !== 'PURGE' || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">Purge Attendance</button>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">Purge System Data</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">Remove attendance sessions and records. Cannot be undone.</p>
              <select value={purgeType} onChange={(e) => setPurgeType(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white mb-4 mr-2">
                <option value="sessions">Sessions only</option>
                <option value="attendance">Attendance only</option>
                <option value="all">All (sessions + attendance)</option>
              </select>
              <input placeholder="Type PURGE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white mr-2" />
              <button onClick={handlePurgeData} disabled={confirmText !== 'PURGE' || loading} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">Purge Data</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DangerZone;
