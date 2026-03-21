/**
 * Send one test message via Twilio (SMS or WhatsApp — same as the app).
 * Usage: node scripts/sendTestSms.js <phone>
 *
 * SMS: TWILIO_FROM_NUMBER  |  WhatsApp: TWILIO_MESSAGING_CHANNEL=whatsapp + TWILIO_WHATSAPP_FROM
 */
require('dotenv').config();
const { sendSmsTwilio, isSmsFullyConfigured, getMessagingChannel } = require('../utils/sms');

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node scripts/sendTestSms.js <phone>');
  process.exit(1);
}

async function main() {
  if (!isSmsFullyConfigured()) {
    const ch = getMessagingChannel();
    console.error(
      ch === 'whatsapp'
        ? 'WhatsApp not configured. Set SMS_ENABLED=true, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886), TWILIO_MESSAGING_CHANNEL=whatsapp'
        : 'SMS not fully configured. Set SMS_ENABLED=true, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env'
    );
    process.exit(1);
  }
  const body = `Smart Face Attendance: test (${getMessagingChannel()}). If you received this, Twilio is working.`;
  try {
    const result = await sendSmsTwilio({ to: phone, body });
    if (result?.skipped) {
      console.error('Skipped:', result.reason);
      process.exit(1);
    }
    console.log('OK:', getMessagingChannel(), 'sent to', phone);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

main();
