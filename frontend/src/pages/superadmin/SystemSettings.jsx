import { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../../api/api';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Loader from '../../components/Loader';
import Toast from '../../components/Toast';

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSystemSettings();
      setSettings(res.settings || {});
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to load settings', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleChange = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSystemSettings(settings);
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to save settings', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 flex items-center justify-center"><Loader /></main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configure global system and AI settings</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI and Face Recognition</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Similarity Threshold (0.45 – 0.75)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.45"
                    max="0.75"
                    value={settings.similarityThreshold ?? 0.6}
                    onChange={(e) =>
                      handleChange(
                        'similarityThreshold',
                        parseFloat(e.target.value) || 0.6
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lower values are more permissive, higher values are stricter.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Face Images per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxFaceImages ?? 5}
                    onChange={(e) =>
                      handleChange(
                        'maxFaceImages',
                        parseInt(e.target.value, 10) || 5
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Liveness Mode
                  </label>
                  <select
                    value={settings.livenessMode || 'low'}
                    onChange={(e) => handleChange('livenessMode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="none">None (No liveness)</option>
                    <option value="low">Low (Blink only)</option>
                    <option value="high">High (Blink + head movement)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (minutes)</label>
                  <input type="number" min="5" max="120" value={settings.sessionTimeoutMinutes ?? 30}
                    onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value, 10) || 30)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Login Attempts</label>
                  <input type="number" min="3" max="10" value={settings.maxLoginAttempts ?? 5}
                    onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value, 10) || 5)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"> {saving ? 'Saving...' : 'Save Settings'} </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default SystemSettings;
