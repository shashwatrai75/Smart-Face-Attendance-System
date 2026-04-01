import { useRef, useEffect, useMemo, useState } from 'react';

const FaceCamera = ({
  onCapture,
  onError,
  samplesRequired = 5,
  requireFaceDetected = false,
  onDetection,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [samples, setSamples] = useState([]);
  const [status, setStatus] = useState('Initializing...');
  const [videoOrientation, setVideoOrientation] = useState(0); // Correct rotation in degrees
  const done = samples.length >= samplesRequired;
  const [faceBox, setFaceBox] = useState(null); // { x, y, w, h } in percentages
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const detectLoopRef = useRef(null);
  const detectorRef = useRef(null);

  const progressLabel = useMemo(() => {
    if (done) return 'Complete';
    if (!isStreaming) return 'Offline';
    return 'Ready';
  }, [done, isStreaming]);

  useEffect(() => {
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // REMOVED: Auto-detection for better performance
  // Detection only happens when user clicks "Capture Sample"

  const initializeCamera = async () => {
    try {
      await startCamera();
    } catch (error) {
      console.error('Initialization error:', error);
      onError?.('Failed to initialize. Please check browser console for details.');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Prefer front-facing camera
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready and detect orientation
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              const video = videoRef.current;
              const w = video.videoWidth || 0;
              const h = video.videoHeight || 0;
              // Detect if device supplies rotated (portrait) video; correct for landscape display
              let orient = 0;
              if (w > 0 && h > 0 && h > w) {
                // Portrait video in landscape container: rotate 90deg to display upright
                orient = 90;
              }
              setVideoOrientation(orient);
              setIsStreaming(true);
              setStatus('Camera ready. Position your face in the frame with good lighting.');
              resolve();
            };
          }
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      let errorMessage = 'Failed to access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
      }
      onError?.(errorMessage);
    }
  };

  const stopCamera = () => {
    if (detectLoopRef.current) {
      window.cancelAnimationFrame(detectLoopRef.current);
      detectLoopRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  // Lightweight realtime detection using Shape Detection API (Chrome)
  useEffect(() => {
    if (!isStreaming) return;
    const video = videoRef.current;
    if (!video) return;

    // FaceDetector is available on Chromium-based browsers. If not available, we still allow capture.
    const FaceDetectorCtor = window.FaceDetector;
    if (!FaceDetectorCtor) return;

    try {
      detectorRef.current = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      detectorRef.current = null;
      return;
    }

    let alive = true;
    let lastRunAt = 0;
    const tick = async (t) => {
      if (!alive) return;
      detectLoopRef.current = window.requestAnimationFrame(tick);

      // throttle to ~6fps
      if (t - lastRunAt < 160) return;
      lastRunAt = t;

      const det = detectorRef.current;
      if (!det || !video.videoWidth || !video.videoHeight) return;

      try {
        const faces = await det.detect(video);
        const face = Array.isArray(faces) && faces.length > 0 ? faces[0] : null;
        if (!face?.boundingBox) {
          setIsFaceDetected(false);
          setFaceBox(null);
          onDetection?.({ detected: false, box: null });
          return;
        }

        const bb = face.boundingBox;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        const x = Math.max(0, Math.min(100, (bb.x / vw) * 100));
        const y = Math.max(0, Math.min(100, (bb.y / vh) * 100));
        const w = Math.max(0, Math.min(100, (bb.width / vw) * 100));
        const h = Math.max(0, Math.min(100, (bb.height / vh) * 100));

        // Mirror compensation: we draw mirrored capture, and the preview feels mirrored;
        // boundingBox is in the unmirrored coordinate space, so flip horizontally.
        const xMirrored = Math.max(0, Math.min(100, 100 - x - w));

        const box = { x: xMirrored, y, w, h };
        setIsFaceDetected(true);
        setFaceBox(box);
        onDetection?.({ detected: true, box });
      } catch {
        // detection errors should not block camera usage
      }
    };

    detectLoopRef.current = window.requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (detectLoopRef.current) {
        window.cancelAnimationFrame(detectLoopRef.current);
        detectLoopRef.current = null;
      }
    };
  }, [isStreaming, onDetection]);

  const retake = () => {
    setSamples([]);
    setStatus(isStreaming ? 'Camera ready. Position your face in the frame with good lighting.' : 'Initializing...');
    onCapture?.([]);
  };

  const captureSample = async () => {
    if (!videoRef.current || !isStreaming) return;
    if (requireFaceDetected && !isFaceDetected) {
      setStatus('No face detected. Align your face within the frame and try again.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas || !video.videoWidth || !video.videoHeight) {
        setStatus('Camera not ready. Please wait a moment.');
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.save();
      // Mirror for a natural front-camera experience
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      setSamples((prev) => {
        const newSamples = [...prev, dataUrl];
        if (newSamples.length >= samplesRequired) {
          setStatus('Complete! Samples captured.');
          setTimeout(() => {
            onCapture?.(newSamples);
          }, 200);
        } else {
          setStatus(`✓ Sample ${newSamples.length}/${samplesRequired} captured`);
        }
        return newSamples;
      });
    } catch (error) {
      console.error('Capture error:', error);
      onError?.('Failed to capture face. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={[
          'camera-wrapper relative w-full overflow-hidden rounded-2xl border bg-black shadow-sm',
          isFaceDetected
            ? 'border-emerald-400/50 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_48px_rgba(16,185,129,0.14)]'
            : 'border-slate-200 dark:border-white/10',
        ].join(' ')}
        style={{ aspectRatio: '16/9' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `rotate(${videoOrientation}deg)`,
            transformOrigin: 'center center',
          }}
        />
        {/* Biometric overlay */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/15" />
          {/* Center face frame */}
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-cyan-300/85 shadow-[0_0_0_1px_rgba(34,211,238,0.16),0_0_40px_rgba(0,255,255,0.18)]" />
          {/* Glow layer */}
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-[0_0_40px_rgba(0,255,255,0.28)]" />
          {/* Full width scan line */}
          <div className="animate-scan absolute left-0 w-full h-1 bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/25 face-radar" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/25 face-radar-delayed" />
        </div>
        {/* Bounding box (if supported) */}
        {faceBox ? (
          <div
            className="pointer-events-none absolute rounded-xl border border-emerald-300/70 bg-emerald-400/5 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
            style={{
              left: `${faceBox.x}%`,
              top: `${faceBox.y}%`,
              width: `${faceBox.w}%`,
              height: `${faceBox.h}%`,
            }}
          />
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
              done
                ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20'
                : isStreaming
                  ? 'bg-indigo-500/10 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20'
                  : 'bg-slate-500/10 text-slate-700 ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
            ].join(' ')}
          >
            {progressLabel}
          </span>
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
              isFaceDetected
                ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20'
                : 'bg-slate-500/10 text-slate-700 ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
            ].join(' ')}
            title={window.FaceDetector ? '' : 'Face detection not supported by this browser'}
          >
            {isFaceDetected ? 'Face detected' : 'No face'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300/70">
            Samples: {samples.length}/{samplesRequired}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/70">{status}</p>

        <div className="mt-3 flex items-center justify-center gap-3">
          {!done ? (
            <button
              type="button"
              onClick={captureSample}
              disabled={!isStreaming || (requireFaceDetected && !isFaceDetected)}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Capture
            </button>
          ) : null}
          <button
            type="button"
            onClick={retake}
            disabled={!isStreaming && samples.length === 0}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
          >
            Retake
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaceCamera;

