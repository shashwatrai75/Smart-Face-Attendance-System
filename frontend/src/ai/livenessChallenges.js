/**
 * Liveness Challenge Detection Utilities
 *
 * Challenge-based anti-spoofing for attendance marking.
 * Uses FaceLandmark68Net landmarks for EAR, head position, and smile detection.
 */

import * as faceapi from 'face-api.js';

// Challenge definitions
export const CHALLENGES = [
  { id: 'blink', type: 'blink', label: 'Blink Twice', requiredCount: 2 },
  { id: 'head_left', type: 'head_left', label: 'Turn Head Left', requiredCount: 1 },
  { id: 'smile', type: 'smile', label: 'Smile', requiredCount: 1 },
];

/**
 * Returns a randomly selected challenge for anti-spoofing verification.
 */
export const getRandomChallenge = () => {
  const idx = Math.floor(Math.random() * CHALLENGES.length);
  return CHALLENGES[idx];
};

// =============================================================================
// BLINK DETECTION - Eye Aspect Ratio (EAR)
// =============================================================================
// EAR Formula: EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
// Where p0-p5 are the 6 eye landmark points (left corner, upper, right corner, lower)
// When eyes are OPEN: EAR ≈ 0.25-0.35
// When eyes are CLOSED: EAR drops below ~0.2 (eyelids cover the eye)
// A "blink" = EAR transitions: high → low → high
// =============================================================================

const EAR_OPEN_THRESHOLD = 0.25;
const EAR_CLOSED_THRESHOLD = 0.18;
const BLINK_DEBOUNCE_FRAMES = 3; // Min frames between blinks to avoid double-count

/**
 * Calculate Eye Aspect Ratio for one eye.
 * Lower EAR = more closed eye.
 */
const calculateEAR = (eyePoints) => {
  if (!eyePoints || eyePoints.length < 6) return 1;
  // Vertical distances (upper to lower lid)
  const vertical1 = Math.abs(eyePoints[1].y - eyePoints[5].y);
  const vertical2 = Math.abs(eyePoints[2].y - eyePoints[4].y);
  // Horizontal distance (eye width)
  const horizontal = Math.abs(eyePoints[0].x - eyePoints[3].x) || 1;
  return (vertical1 + vertical2) / (2 * horizontal);
};

/**
 * Blink detector state (persists across frames)
 */
const createBlinkDetector = () => {
  let blinkCount = 0;
  let wasClosed = false;
  let closedFrameCount = 0;
  let lastBlinkFrame = -BLINK_DEBOUNCE_FRAMES - 1;

  return {
    reset: () => {
      blinkCount = 0;
      wasClosed = false;
      closedFrameCount = 0;
      lastBlinkFrame = -BLINK_DEBOUNCE_FRAMES - 1;
    },
    update: (landmarks, frameIndex) => {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const leftEAR = calculateEAR(leftEye);
      const rightEAR = calculateEAR(rightEye);
      const avgEAR = (leftEAR + rightEAR) / 2;

      const isClosed = avgEAR < EAR_CLOSED_THRESHOLD;
      const isOpen = avgEAR > EAR_OPEN_THRESHOLD;

      if (isClosed) {
        closedFrameCount++;
        wasClosed = true;
      } else if (isOpen && wasClosed) {
        // Transition from closed to open = completed blink
        const framesSinceLastBlink = frameIndex - lastBlinkFrame;
        if (closedFrameCount >= 2 && framesSinceLastBlink > BLINK_DEBOUNCE_FRAMES) {
          blinkCount++;
          lastBlinkFrame = frameIndex;
        }
        wasClosed = false;
        closedFrameCount = 0;
      } else if (isOpen) {
        wasClosed = false;
        closedFrameCount = 0;
      }

      return { blinkCount, avgEAR };
    },
    getBlinkCount: () => blinkCount,
  };
};

// =============================================================================
// HEAD TURN DETECTION
// =============================================================================
// Logic: Compare nose X position to face center X.
// "Turn head left" (user's left) = nose moves RIGHT in screen coords (mirrored camera).
// We require: noseX < faceCenterX - threshold (nose shifted left of center = user turned left)
// Threshold: 30px or ~15% of face width for robustness across distances.
// =============================================================================

const HEAD_TURN_THRESHOLD_RATIO = 0.12; // Nose must be this fraction of face width from center

/**
 * Check if user has turned head left.
 * "Left" = user's left. In front camera, turning left moves nose to the RIGHT of face center.
 * So we require: noseX > faceCenterX + threshold.
 */
const checkHeadTurnLeft = (landmarks, faceBox) => {
  const nose = landmarks.getNose();
  if (!nose || nose.length === 0) return false;

  const noseTip = nose[3] || nose[0];
  const noseX = noseTip.x;
  const faceCenterX = faceBox.x + faceBox.width / 2;
  const threshold = Math.max(30, faceBox.width * HEAD_TURN_THRESHOLD_RATIO);
  const diff = noseX - faceCenterX;

  // Nose to the right of center = user turned head left (positive diff)
  return diff >= threshold;
};

// =============================================================================
// SMILE DETECTION
// =============================================================================
// Logic: Use mouth landmarks (points 48-67 in 68-point model).
// Mouth width = distance between left and right corners.
// Smile = mouth width expands beyond neutral baseline.
// We store initial (neutral) mouth width and require expansion of ~15%+ to detect smile.
// =============================================================================

const SMILE_EXPANSION_RATIO = 1.15; // Mouth must expand 15% from neutral
const MOUTH_CORNER_LEFT = 0;
const MOUTH_CORNER_RIGHT = 6;

/**
 * Get mouth corner points from landmarks.
 * FaceLandmark68: points 48 and 54 are left/right mouth corners.
 */
const getMouthWidth = (landmarks) => {
  const mouth = landmarks.getMouth?.();
  if (mouth && mouth.length >= 7) {
    const left = mouth[MOUTH_CORNER_LEFT];
    const right = mouth[MOUTH_CORNER_RIGHT];
    return Math.hypot(right.x - left.x, right.y - left.y);
  }
  const positions = landmarks.positions;
  if (positions && positions.length > 54) {
    const left = positions[48];
    const right = positions[54];
    return Math.hypot(right.x - left.x, right.y - left.y);
  }
  return null;
};

/**
 * Smile detector state (tracks neutral mouth width)
 */
const createSmileDetector = () => {
  let neutralMouthWidth = null;

  return {
    reset: () => {
      neutralMouthWidth = null;
    },
    update: (landmarks) => {
      const mouthWidth = getMouthWidth(landmarks);
      if (mouthWidth === null) return false;

      if (neutralMouthWidth === null) {
        neutralMouthWidth = mouthWidth;
        return false;
      }

      const expansionRatio = mouthWidth / neutralMouthWidth;
      return expansionRatio >= SMILE_EXPANSION_RATIO;
    },
  };
};

// =============================================================================
// MAIN CHALLENGE RUNNER
// =============================================================================

/**
 * Run challenge verification using face-api.js detection.
 * Returns detection result with landmarks, or null if no face.
 */
export const detectFaceWithLandmarks = async (videoElement) => {
  if (!videoElement || videoElement.videoWidth === 0) return null;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.5,
  });

  const detection = await faceapi
    .detectSingleFace(videoElement, options)
    .withFaceLandmarks();

  return detection;
};

/**
 * Creates a challenge runner for the given challenge type.
 * Returns { run, reset } where run(landmarks, faceBox, frameIndex) returns { passed, progress }.
 */
export const createChallengeRunner = (challengeType) => {
  const blinkDetector = createBlinkDetector();
  const smileDetector = createSmileDetector();

  const reset = () => {
    blinkDetector.reset();
    smileDetector.reset();
  };

  const run = (detection, frameIndex) => {
    if (!detection?.landmarks) return { passed: false, progress: 0 };

    const { landmarks } = detection;
    const faceBox = detection.detection.box;

    switch (challengeType) {
      case 'blink': {
        const { blinkCount } = blinkDetector.update(landmarks, frameIndex);
        const required = CHALLENGES.find((c) => c.type === 'blink')?.requiredCount ?? 2;
        return {
          passed: blinkCount >= required,
          progress: Math.min(blinkCount, required),
          required,
        };
      }
      case 'head_left': {
        const passed = checkHeadTurnLeft(landmarks, faceBox);
        return {
          passed,
          progress: passed ? 1 : 0,
          required: 1,
        };
      }
      case 'smile': {
        const passed = smileDetector.update(landmarks);
        return {
          passed,
          progress: passed ? 1 : 0,
          required: 1,
        };
      }
      default:
        return { passed: false, progress: 0, required: 1 };
    }
  };

  return { run, reset };
};
