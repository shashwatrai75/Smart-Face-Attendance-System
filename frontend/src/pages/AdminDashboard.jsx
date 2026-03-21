import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, notifyEmployeeNoCheckInSMS, sendTestSms } from '../api/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import Toast from '../components/Toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [empSmsBusy, setEmpSmsBusy] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSmsBusy, setTestSmsBusy] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSendTestSms = async (e) => {
    e.preventDefault();
    const to = testPhone.trim();
    if (!to) {
      setToast({ message: 'Enter a phone number', type: 'error' });
      return;
    }
    setTestSmsBusy(true);
    try {
      await sendTestSms({ to });
      setToast({ message: 'Test message sent (check SMS or WhatsApp).', type: 'success' });
    } catch (err) {
      setToast({ message: err?.error || 'Test SMS failed', type: 'error' });
    } finally {
      setTestSmsBusy(false);
    }
  };

  const handleEmployeeNoCheckInSms = async () => {
    if (
      !window.confirm(
        'Send SMS to all employees (all departments) who did not check in today? Requires Twilio and phone numbers on user profiles.'
      )
    ) {
      return;
    }
    setEmpSmsBusy(true);
    try {
      const res = await notifyEmployeeNoCheckInSMS({});
      setToast({
        message: `Employee SMS: ${res.sent} sent, ${res.failed} failed, ${res.skipped} skipped.${res.hitCap ? ' Limit reached.' : ''}`,
        type: res.sent > 0 ? 'success' : 'error',
      });
    } catch (err) {
      setToast({ message: err?.error || 'SMS request failed', type: 'error' });
    } finally {
      setEmpSmsBusy(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.stats || {
        totalUsers: 0,
        activeMembers: 0,
        totalSections: 0,
        totalStudents: 0,
        totalAttendance: 0,
        todayAttendance: 0,
      });
    } catch (err) {
      setToast({ message: 'Failed to load stats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, color: 'from-blue-500 to-blue-600', icon: '👥' },
    { label: 'Active Members', value: stats?.activeMembers || 0, color: 'from-green-500 to-green-600', icon: '👨‍🏫' },
    { label: 'Total Sections', value: stats?.totalSections || 0, color: 'from-purple-500 to-purple-600', icon: '📚' },
    { label: 'Total Students', value: stats?.totalStudents || 0, color: 'from-indigo-500 to-indigo-600', icon: '🎓' },
    { label: 'Total Attendance', value: stats?.totalAttendance || 0, color: 'from-orange-500 to-orange-600', icon: '✅' },
    { label: "Today's Attendance", value: stats?.todayAttendance || 0, color: 'from-red-500 to-red-600', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader />
          </main>
        </div>
      </div>
    );
  }

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
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Office Admin Dashboard
            </h1>
            <p className="text-gray-600">Overview of your attendance system</p>
          </div>
          <Link
            to="/admin/sections"
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700 flex items-center gap-4 mb-6"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">📂</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Sections</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Create and manage Class and Department sections
              </p>
            </div>
            <span className="ml-auto text-indigo-600 dark:text-indigo-400 font-medium">→</span>
          </Link>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Department check-in reminders</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              SMS employees who have <strong>not checked in today</strong> (all departments). Supervisors can run the
              same action for their department only from the Supervisor Dashboard.
            </p>
            <button
              type="button"
              disabled={empSmsBusy}
              onClick={handleEmployeeNoCheckInSms}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {empSmsBusy ? 'Sending…' : 'SMS: no check-in today (all departments)'}
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Twilio test (SMS or WhatsApp)</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 space-y-3">
              <p>
                <strong className="text-gray-800 dark:text-gray-200">Option 1: Quick test (sandbox) — recommended</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm pl-0.5">
                <li>
                  In{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 underline"
                  >
                    Twilio Console → Messaging → Try WhatsApp
                  </a>
                  , copy your sandbox <strong>join code</strong> and the sandbox <strong>From</strong> number.
                </li>
                <li>
                  On the phone you will test with, open WhatsApp and send <code className="text-xs">join &lt;your-code&gt;</code> to that Twilio sandbox number (this opts the number in).
                </li>
                <li>
                  Set <code className="text-xs">TWILIO_MESSAGING_CHANNEL=whatsapp</code>,{' '}
                  <code className="text-xs">TWILIO_WHATSAPP_FROM=whatsapp:+14155238886</code> (use the exact value Twilio shows; often this number), plus{' '}
                  <code className="text-xs">SMS_ENABLED=true</code> and your SID / token. Restart the backend.
                </li>
                <li>
                  Use <strong>the same opted-in number</strong> in the field below and send a test. Only sandbox-joined numbers receive messages until you move to production.
                </li>
              </ol>
              <p className="text-xs sm:text-sm">
                <strong>SMS (no WhatsApp):</strong> leave channel unset or <code className="text-xs">sms</code> and set{' '}
                <code className="text-xs">TWILIO_FROM_NUMBER</code>.{' '}
                <strong>Production WhatsApp:</strong> use an approved Twilio WhatsApp sender instead of the sandbox number.
              </p>
            </div>
            <form onSubmit={handleSendTestSms} className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+9779814908244 or 9814908244"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={testSmsBusy}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {testSmsBusy ? 'Sending…' : 'Send test message'}
              </button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((card, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover-lift border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm font-medium mb-1">{card.label}</p>
                    <p className={`text-4xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                      {card.value}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${Math.min((card.value / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

