/**
 * Parse "HH:mm" or "H:mm" to minutes since midnight.
 * @param {string} timeStr
 * @returns {number} minutes 0-1439, or NaN if invalid
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
};

/**
 * Get current time in minutes since midnight (local timezone).
 */
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Get today's date in YYYY-MM-DD.
 * Uses TZ env var if set (e.g. Asia/Kolkata) so server date matches org timezone.
 */
const todayDate = () => {
  const tz = process.env.TZ || 'UTC';
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // en-CA yields YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Compare date strings YYYY-MM-DD. Returns -1, 0, or 1.
 */
const compareDates = (a, b) => {
  if (!a || !b) return 0;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

module.exports = {
  timeToMinutes,
  nowMinutes,
  todayDate,
  compareDates,
};
