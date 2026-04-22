/** Keep only digits (strips letters, spaces, +, etc.). */
function guardianPhoneDigitsOnly(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

/**
 * @returns {string|null} Error message, or null if value is exactly 10 digits.
 */
function guardianPhoneTenDigitError(digits) {
  if (digits.length === 0) {
    return 'Guardian phone is required. Enter exactly 10 digits.';
  }
  if (digits.length !== 10) {
    return 'Guardian phone must be exactly 10 digits (numbers only, no letters).';
  }
  return null;
}

module.exports = { guardianPhoneDigitsOnly, guardianPhoneTenDigitError };
