const bcrypt = require('bcrypt');

function normalizeSecurityAnswer(s) {
  return String(s ?? '').trim().toLowerCase();
}

async function hashSecurityAnswer(plain) {
  return bcrypt.hash(normalizeSecurityAnswer(plain), 12);
}

async function compareSecurityAnswer(plain, storedHash) {
  if (!plain || !storedHash) return false;
  return bcrypt.compare(normalizeSecurityAnswer(plain), storedHash);
}

module.exports = {
  normalizeSecurityAnswer,
  hashSecurityAnswer,
  compareSecurityAnswer,
};
