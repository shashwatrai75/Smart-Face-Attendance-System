/**
 * Validates a student Gmail address (must use @gmail.com).
 * Allows common Gmail local-part characters: letters, digits, dots, plus.
 */
function isValidGmailAddress(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const email = raw.trim().toLowerCase();
  if (!email.endsWith('@gmail.com')) return false;
  const local = email.slice(0, -'@gmail.com'.length);
  if (local.length < 1 || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  // Gmail local part (simplified): alnum, dot, plus; must start with alnum
  if (!/^[a-z0-9][a-z0-9._+-]*$/i.test(local)) return false;
  return true;
}

function normalizeStudentEmail(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

module.exports = { isValidGmailAddress, normalizeStudentEmail };
