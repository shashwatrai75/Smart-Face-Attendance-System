import { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../../api/api';
import Loader from '../../components/Loader';
import Toast from '../../components/Toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import PageHeader from '../../components/userManagement/PageHeader';

const DEFAULTS = {
  enableFaceRecognition: true,
  enableLivenessDetection: true,
  similarityThreshold: 0.6, // 0.45 - 0.75
  maxFaceImages: 5, // 1 - 10
  livenessMode: 'low', // none | low | high
  sessionTimeoutMinutes: 30, // 5 - 120
  maxLoginAttempts: 5, // 3 - 10
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const SettingsCard = ({ title, subtitle, icon, children }) => (
  <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm space-y-4 transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white text-base dark:bg-white dark:text-slate-900">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">{subtitle}</p> : null}
      </div>
    </div>
    <div className="h-px bg-slate-200/70 dark:bg-white/10" />
    {children}
  </section>
);

const FieldLabel = ({ label, tooltip }) => (
  <div className="flex items-center gap-2">
    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    {tooltip ? (
      <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200">
        ?
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
          {tooltip}
        </span>
      </span>
    ) : null}
  </div>
);

const InputField = ({ label, tooltip, helper, icon, children }) => (
  <div className="space-y-1.5">
    <FieldLabel label={label} tooltip={tooltip} />
    <div className="relative">
      {icon ? <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{icon}</div> : null}
      <div className={icon ? 'pl-9' : ''}>{children}</div>
    </div>
    {helper ? <p className="text-xs text-slate-500 dark:text-slate-300/70">{helper}</p> : null}
  </div>
);

const ToggleSwitch = ({ checked, onChange, label, helper }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">{helper}</div> : null}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/15',
      ].join(' ')}
      aria-pressed={checked}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-300',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  </div>
);

const SystemSettings = () => {
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSystemSettings();
      const next = { ...DEFAULTS, ...(res.settings || {}) };
      setSettings(next);
      setInitialSettings(next);
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
      setInitialSettings(settings);
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to save settings', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="System Settings">
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      </DashboardLayout>
    );
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  return (
    <DashboardLayout pageTitle="System Settings">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          title="System Settings"
          subtitle="Manage system configuration and security"
          actions={
            <button
              type="button"
              onClick={() => setSettings({ ...DEFAULTS, ...(initialSettings || {}) })}
              disabled={!dirty || saving}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
            >
              Reset to Default
            </button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <SettingsCard
            title="Face Recognition Settings"
            subtitle="Control biometric capture, matching strictness, and liveness checks."
            icon="👤"
          >
            <div className="space-y-4">
              <ToggleSwitch
                checked={!!settings.enableFaceRecognition}
                onChange={(v) => handleChange('enableFaceRecognition', v)}
                label="Enable Face Recognition"
                helper="Disabling this turns off biometric verification across the system."
              />
              <ToggleSwitch
                checked={!!settings.enableLivenessDetection}
                onChange={(v) => handleChange('enableLivenessDetection', v)}
                label="Enable Liveness Detection"
                helper="Helps prevent spoofing using photos or video replays."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField
                  label="Similarity Threshold"
                  tooltip="Lower is more permissive (higher false positives). Higher is stricter (higher false negatives)."
                  helper={`Current: ${(settings.similarityThreshold ?? DEFAULTS.similarityThreshold).toFixed(2)} (range 0.45–0.75)`}
                >
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.45"
                      max="0.75"
                      step="0.01"
                      value={settings.similarityThreshold ?? DEFAULTS.similarityThreshold}
                      onChange={(e) =>
                        handleChange(
                          'similarityThreshold',
                          clamp(parseFloat(e.target.value) || DEFAULTS.similarityThreshold, 0.45, 0.75)
                        )
                      }
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300/70">
                      <span>0.45 (Permissive)</span>
                      <span>0.75 (Strict)</span>
                    </div>
                  </div>
                </InputField>
              </div>

              <InputField
                label="Max Face Images per User"
                tooltip="Limits how many enrolled samples are stored per user. Higher can improve matching but costs storage."
                helper="Recommended: 5"
              >
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxFaceImages ?? DEFAULTS.maxFaceImages}
                  onChange={(e) =>
                    handleChange('maxFaceImages', clamp(parseInt(e.target.value, 10) || DEFAULTS.maxFaceImages, 1, 10))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                />
              </InputField>

              <InputField
                label="Detection Mode"
                tooltip="Controls the liveness behavior during verification."
                helper="Higher modes may reduce spoofing but increase friction."
              >
                <select
                  value={settings.livenessMode || DEFAULTS.livenessMode}
                  onChange={(e) => handleChange('livenessMode', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                >
                  <option value="none">None (No liveness)</option>
                  <option value="low">Low (Blink only)</option>
                  <option value="high">High (Blink + head movement)</option>
                </select>
              </InputField>
            </div>
          </SettingsCard>

          <div className="h-px bg-slate-200/70 dark:bg-white/10" />

          <SettingsCard
            title="Security Settings"
            subtitle="Limit access risks and enforce safer session behavior."
            icon="🔒"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputField
                label="Session Timeout"
                tooltip="How long a user can stay logged in without activity."
                helper={`Auto logout after ${settings.sessionTimeoutMinutes ?? DEFAULTS.sessionTimeoutMinutes} minutes`}
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 8v5l3 2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 21a9 9 0 1 0-9-9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path d="M3 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              >
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.sessionTimeoutMinutes ?? DEFAULTS.sessionTimeoutMinutes}
                  onChange={(e) =>
                    handleChange(
                      'sessionTimeoutMinutes',
                      clamp(parseInt(e.target.value, 10) || DEFAULTS.sessionTimeoutMinutes, 5, 120)
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                />
              </InputField>

              <InputField
                label="Max Login Attempts"
                tooltip="Limits the number of failed logins before lockout."
                helper="Recommended: 5"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 11V8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                }
              >
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.maxLoginAttempts ?? DEFAULTS.maxLoginAttempts}
                  onChange={(e) =>
                    handleChange(
                      'maxLoginAttempts',
                      clamp(parseInt(e.target.value, 10) || DEFAULTS.maxLoginAttempts, 3, 10)
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                />
              </InputField>
            </div>
          </SettingsCard>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSettings(initialSettings)}
              disabled={!dirty || saving}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
            >
              Discard changes
            </button>
            <button
              type="submit"
              disabled={saving || !dirty}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;
