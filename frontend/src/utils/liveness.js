import { checkLiveness as rawCheckLiveness, resetLiveness as rawResetLiveness } from '../ai/liveness';

/**
 * Run a single-shot liveness check using face-api.js landmarks.
 * Returns { passed: boolean, reason?: string }.
 */
export const runLivenessCheck = async (videoElement) => {
  if (!videoElement) {
    return { passed: false, reason: 'Camera not ready' };
  }
  try {
    const result = await rawCheckLiveness(videoElement);
    return result || { passed: false, reason: 'Liveness check failed' };
  } catch (err) {
    console.error('Liveness check error:', err);
    return { passed: false, reason: 'Liveness check failed' };
  }
};

export const resetLiveness = () => {
  try {
    rawResetLiveness();
  } catch (err) {
    // ignore
  }
};

