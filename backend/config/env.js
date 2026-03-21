require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  // TZ: e.g. 'Asia/Kolkata' - server uses this for "today" date (sessions, attendance). Default: UTC
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOW_SEED: process.env.ALLOW_SEED === 'true',
  // Notifications (Twilio): SMS_ENABLED=true, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
  // Option 1 — WhatsApp sandbox (recommended to try first): Console → Messaging → Try WhatsApp; send "join <code>" from your phone to the sandbox number; then set:
  //   TWILIO_MESSAGING_CHANNEL=whatsapp  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  (use the From value Twilio shows)
  // SMS only: TWILIO_FROM_NUMBER=+1...  |  Production WhatsApp: approved sender instead of sandbox
  // Optional: SMS_DEFAULT_COUNTRY_CODE, SMS_MAX_PER_SESSION, SMS_MAX_PER_RUN, templates in backend/utils/sms.js
};

