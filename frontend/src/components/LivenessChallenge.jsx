/**
 * LivenessChallenge - Challenge-based liveness detection overlay
 *
 * Displays a random liveness challenge (blink, head turn, smile) that the user
 * must complete within the timeout before attendance can be marked.
 * Uses requestAnimationFrame for smooth, performant detection loop.
 */

import { useEffect, useRef, useState } from 'react';
import {
  getRandomChallenge,
  detectFaceWithLandmarks,
  createChallengeRunner,
} from '../ai/livenessChallenges';

const CHALLENGE_TIMEOUT_SEC = 6;
const DETECTION_INTERVAL_MS = 80; // ~12 fps for balance of responsiveness and performance

const LivenessChallenge = ({
  videoRef,
  challenge: initialChallenge,
  onSuccess,
  onFail,
  onRetry,
  studentName = '',
}) => {
  const [challenge] = useState(() => initialChallenge || getRandomChallenge());
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIMEOUT_SEC);
  const [status, setStatus] = useState('detecting'); // detecting | success | failed
  const [progress, setProgress] = useState({ current: 0, required: challenge.requiredCount || 1 });
  const [noFaceCount, setNoFaceCount] = useState(0);

  const frameRef = useRef(0);
  const timerRef = useRef(null);
  const lastDetectionRef = useRef(0);
  const runnerRef = useRef(null);

  // Initialize challenge runner when challenge type changes
  useEffect(() => {
    runnerRef.current = createChallengeRunner(challenge.type);
    runnerRef.current.reset();
    setTimeLeft(CHALLENGE_TIMEOUT_SEC);
    setStatus('detecting');
    setProgress({ current: 0, required: challenge.requiredCount || 1 });
    setNoFaceCount(0);
    frameRef.current = 0;
  }, [challenge.type, challenge.requiredCount]);

  // Countdown timer - on timeout, show failed state (user can Try Again or Cancel)
  useEffect(() => {
    if (status !== 'detecting') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Detection loop using requestAnimationFrame + throttling
  useEffect(() => {
    let rafId = null;
    let lastRun = 0;

    const runDetection = async () => {
      const now = performance.now();
      if (status !== 'detecting' || !videoRef?.current || !runnerRef.current) {
        rafId = requestAnimationFrame(runDetection);
        return;
      }

      if (now - lastRun < DETECTION_INTERVAL_MS) {
        rafId = requestAnimationFrame(runDetection);
        return;
      }
      lastRun = now;
      lastDetectionRef.current = now;
      frameRef.current += 1;

      try {
        const detection = await detectFaceWithLandmarks(videoRef.current);

        if (!detection) {
          setNoFaceCount((prev) => prev + 1);
          rafId = requestAnimationFrame(runDetection);
          return;
        }

        setNoFaceCount(0);
        const result = runnerRef.current.run(detection, frameRef.current);
        setProgress({
          current: result.progress ?? 0,
          required: result.required ?? 1,
        });

        if (result.passed) {
          setStatus('success');
          if (timerRef.current) clearInterval(timerRef.current);
          onSuccess?.();
          return;
        }
      } catch (err) {
        console.error('Liveness detection error:', err);
      }

      rafId = requestAnimationFrame(runDetection);
    };

    rafId = requestAnimationFrame(runDetection);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [status, videoRef, onSuccess]);

  const handleRetry = () => {
    runnerRef.current?.reset();
    setTimeLeft(CHALLENGE_TIMEOUT_SEC);
    setStatus('detecting');
    setProgress({ current: 0, required: challenge.requiredCount || 1 });
    setNoFaceCount(0);
    frameRef.current = 0;
    onRetry?.();
  };

  const handleCancel = () => {
    onFail?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center">
        {/* Challenge instruction - large, visible */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Please {challenge.label}
        </h2>
        {studentName && (
          <p className="text-gray-600 mb-4">Verifying identity for {studentName}</p>
        )}

        {/* Timer */}
        <div className="mb-6">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${
              timeLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {status === 'detecting' ? timeLeft : status === 'success' ? '✓' : '✗'}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {status === 'detecting' && `${timeLeft}s remaining`}
          </p>
        </div>

        {/* Progress for blink challenge */}
        {challenge.type === 'blink' && status === 'detecting' && (
          <div className="mb-4">
            <p className="text-gray-600">
              Blinks detected: {progress.current} / {progress.required}
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (progress.current / progress.required) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Status messages */}
        {noFaceCount > 15 && status === 'detecting' && (
          <p className="text-amber-600 text-sm mb-4">Position your face in the frame</p>
        )}

        {status === 'success' && (
          <p className="text-green-600 font-semibold mb-4">Liveness verified! Marking attendance...</p>
        )}

        {status === 'failed' && (
          <>
            <p className="text-red-600 font-semibold mb-4">Liveness failed. Try again.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Complete the challenge to prevent spoofing and mark your attendance.
        </p>
      </div>
    </div>
  );
};

export default LivenessChallenge;
export { CHALLENGE_TIMEOUT_SEC };
