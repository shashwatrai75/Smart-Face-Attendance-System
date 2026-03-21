const https = require('https');
const logger = require('./logger');

/**
 * E.164 helper: if phone has no +, prepend SMS_DEFAULT_COUNTRY_CODE (digits only, e.g. 977 for Nepal).
 */
const formatSmsTo = (phone) => {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) return trimmed;
  const defaultCc = String(process.env.SMS_DEFAULT_COUNTRY_CODE || '').trim();
  if (!defaultCc) return trimmed;
  const ccDigits = defaultCc.replace(/[^\d]/g, '');
  const phoneDigits = trimmed.replace(/[^\d]/g, '');
  if (!ccDigits || !phoneDigits) return trimmed;
  return `+${ccDigits}${phoneDigits}`;
};

/** `sms` (default) or `whatsapp` — Twilio WhatsApp uses the same Messages API with whatsapp: prefixes. */
const getMessagingChannel = () => {
  const c = String(process.env.TWILIO_MESSAGING_CHANNEL || 'sms').toLowerCase();
  return c === 'whatsapp' ? 'whatsapp' : 'sms';
};

const whatsappFromAddress = () => {
  let raw = String(process.env.TWILIO_WHATSAPP_FROM || '').trim().replace(/\s/g, '');
  if (!raw) return null;
  if (raw.toLowerCase().startsWith('whatsapp:')) return raw;
  const inner = raw.startsWith('+') ? raw : formatSmsTo(raw);
  return inner ? `whatsapp:${inner}` : null;
};

const formatWhatsAppTo = (phone) => {
  const inner = formatSmsTo(phone);
  return inner ? `whatsapp:${inner}` : null;
};

const isSmsFullyConfigured = () => {
  if (process.env.SMS_ENABLED !== 'true') return false;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return false;
  if (getMessagingChannel() === 'whatsapp') {
    return !!whatsappFromAddress();
  }
  return !!process.env.TWILIO_FROM_NUMBER;
};

/**
 * Default: short guardian notice that the student did not attend today.
 * Override with env SMS_ABSENT_MESSAGE — placeholders: {name}, {rollNo}, {date}, {section}
 */
/**
 * After student enrollment — placeholders: {name}, {rollNo}, {section}, {guardianName}
 */
const buildStudentEnrolledGuardianMessage = (student, sectionName) => {
  const tpl =
    process.env.SMS_ENROLL_GUARDIAN_MESSAGE ||
    'Thank you. {name} (Roll {rollNo}) is now enrolled in {section}. Guardian: {guardianName}.';
  return tpl
    .replace(/\{name\}/g, student?.fullName || 'Student')
    .replace(/\{rollNo\}/g, student?.rollNo || '-')
    .replace(/\{section\}/g, sectionName || 'class')
    .replace(/\{guardianName\}/g, student?.guardianName || '');
};

/**
 * When an admin creates a user account linked to a student — placeholders: {studentName}, {rollNo}, {section}, {email}, {accountName}
 */
const buildLinkedStudentAccountGuardianMessage = (user, student, sectionName) => {
  const tpl =
    process.env.SMS_LINKED_STUDENT_GUARDIAN_MESSAGE ||
    'Notice: A portal account was created for {studentName} (Roll {rollNo}) in {section}. Email: {email}. Contact the institution for login help.';
  return tpl
    .replace(/\{studentName\}/g, student?.fullName || 'Student')
    .replace(/\{rollNo\}/g, student?.rollNo || '-')
    .replace(/\{section\}/g, sectionName || 'class')
    .replace(/\{email\}/g, user?.email || '')
    .replace(/\{accountName\}/g, user?.name || '');
};

/**
 * Employee did not check in to department today — placeholders: {name}, {section}, {date}
 */
const buildEmployeeNoCheckInMessage = (user, sectionName, dateStr) => {
  const tpl =
    process.env.SMS_EMPLOYEE_NO_CHECKIN_MESSAGE ||
    'Notice: {name}, you did not check in today ({date}) for {section}. Please contact your supervisor if this is an error.';
  return tpl
    .replace(/\{name\}/g, user?.name || 'Employee')
    .replace(/\{section\}/g, sectionName || 'your department')
    .replace(/\{date\}/g, dateStr || '');
};

const buildAbsentGuardianMessage = (student, sectionName, dateStr) => {
  const name = student?.fullName || 'Student';
  const rollNo = student?.rollNo || '-';
  const section = sectionName || 'class';
  const date = dateStr || '';
  const tpl =
    process.env.SMS_ABSENT_MESSAGE ||
    'Notice: {name} (Roll {rollNo}) did not attend today ({date}) for {section}.';
  return tpl
    .replace(/\{name\}/g, name)
    .replace(/\{rollNo\}/g, rollNo)
    .replace(/\{date\}/g, date)
    .replace(/\{section\}/g, section);
};

/**
 * Send SMS or WhatsApp (Twilio) depending on TWILIO_MESSAGING_CHANNEL.
 * Exported as sendSmsTwilio for backward compatibility with existing callers.
 */
const sendSmsTwilio = ({ to, body, timeoutMs = 4000 }) => {
  if (process.env.SMS_ENABLED !== 'true') return Promise.resolve({ skipped: true, reason: 'MESSAGING_DISABLED' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return Promise.resolve({ skipped: true, reason: 'TWILIO_CONFIG_MISSING' });

  const channel = getMessagingChannel();
  let fromAddr;
  let toAddr;
  if (channel === 'whatsapp') {
    fromAddr = whatsappFromAddress();
    toAddr = formatWhatsAppTo(to);
    if (!fromAddr) return Promise.resolve({ skipped: true, reason: 'WHATSAPP_FROM_MISSING' });
    if (!toAddr) return Promise.resolve({ skipped: true, reason: 'TO_MISSING' });
  } else {
    fromAddr = process.env.TWILIO_FROM_NUMBER;
    toAddr = formatSmsTo(to);
    if (!fromAddr) return Promise.resolve({ skipped: true, reason: 'SMS_FROM_MISSING' });
    if (!toAddr) return Promise.resolve({ skipped: true, reason: 'TO_MISSING' });
  }

  const postData = new URLSearchParams({ To: toAddr, From: fromAddr, Body: String(body || '') }).toString();

  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
    auth: `${accountSid}:${authToken}`,
  };

  const label = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ success: true, channel });
        reject(new Error(`Twilio ${label} failed (${res.statusCode}): ${data}`));
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Twilio ${label} request timeout`)));
    req.write(postData);
    req.end();
  });
};

/**
 * Send absent notice to each student's guardian. Skips missing phones.
 * @returns {{ sent: number, failed: number, skipped: number }}
 */
const sendAbsentNoticesToGuardians = async (students, { sectionName, dateStr, max = 50 }) => {
  const cap = Number.isFinite(max) && max > 0 ? max : 50;
  const list = (students || []).slice(0, cap);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const st of list) {
    if (!st.guardianPhone) {
      skipped++;
      continue;
    }
    const body = buildAbsentGuardianMessage(st, sectionName, dateStr);
    try {
      const result = await sendSmsTwilio({ to: st.guardianPhone, body });
      if (result?.skipped) {
        skipped++;
        logger.warn(`Notify skipped (${result.reason}) for guardian of ${st.fullName}`);
      } else {
        sent++;
      }
    } catch (err) {
      failed++;
      logger.warn(`Notify failed for ${st.guardianPhone}: ${err.message}`);
    }
  }

  return { sent, failed, skipped };
};

module.exports = {
  formatSmsTo,
  getMessagingChannel,
  sendSmsTwilio,
  isSmsFullyConfigured,
  buildAbsentGuardianMessage,
  buildStudentEnrolledGuardianMessage,
  buildLinkedStudentAccountGuardianMessage,
  buildEmployeeNoCheckInMessage,
  sendAbsentNoticesToGuardians,
};
