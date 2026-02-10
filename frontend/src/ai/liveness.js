import * as faceapi from 'face-api.js';

let lastLandmarks = null;
let blinkCount = 0;
let headTurnCount = 0;

export const checkLiveness = async (videoElement) => {
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) {
      return { passed: false, reason: 'No face detected' };
    }

    const landmarks = detection.landmarks;

    // Simple blink detection (check eye aspect ratio)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEyeAspectRatio = calculateEyeAspectRatio(leftEye);
    const rightEyeAspectRatio = calculateEyeAspectRatio(rightEye);

    const avgAspectRatio = (leftEyeAspectRatio + rightEyeAspectRatio) / 2;

    // If eyes are closed (low aspect ratio), count as blink
    if (avgAspectRatio < 0.25) {
      blinkCount++;
    }

    // Simple head turn detection (check nose position relative to face)
    const nose = landmarks.getNose();
    const faceBox = detection.detection.box;
    const noseX = nose[0].x;
    const faceCenterX = faceBox.x + faceBox.width / 2;

    const headTurn = Math.abs(noseX - faceCenterX) / faceBox.width;

    if (headTurn > 0.15) {
      headTurnCount++;
    }

    // Pass if we detected at least one blink or head turn
    if (blinkCount >= 1 || headTurnCount >= 1) {
      return { passed: true, blinkCount, headTurnCount };
    }

    return { passed: false, reason: 'Please blink or turn your head slightly' };
  } catch (error) {
    console.error('Liveness check error:', error);
    return { passed: false, reason: 'Liveness check failed' };
  }
};

const calculateEyeAspectRatio = (eyePoints) => {
  // Vertical distances
  const vertical1 = Math.abs(eyePoints[1].y - eyePoints[5].y);
  const vertical2 = Math.abs(eyePoints[2].y - eyePoints[4].y);

  // Horizontal distance
  const horizontal = Math.abs(eyePoints[0].x - eyePoints[3].x);

  // Eye Aspect Ratio
  return (vertical1 + vertical2) / (2 * horizontal);
};

export const resetLiveness = () => {
  blinkCount = 0;
  headTurnCount = 0;
  lastLandmarks = null;
};

