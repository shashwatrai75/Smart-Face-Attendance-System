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
  /** True only when Chromium FaceDetector constructed — false for Firefox/Safari or ctor failure */
  const [faceDetectorReady, setFaceDetectorReady] = useState(false);
  const detectLoopRef = useRef(null);
  const detectorRef = useRef(null);

  const mustDetectFaceToCapture = requireFaceDetected && faceDetectorReady;

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
              setStatus('Camera ready. Align your face inside the frame, then click Capture.');
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

  // Lightweight realtime detection using Shape Detection API (Chrome only).
  // Virtual cameras (e.g. iVCam) often return no faces — do not require detection unless API works.
  useEffect(() => {
    if (!isStreaming) return;
    const video = videoRef.current;
    if (!video) return;

    setFaceDetectorReady(false);
    setIsFaceDetected(false);
    setFaceBox(null);

    const FaceDetectorCtor = typeof window !== 'undefined' ? window.FaceDetector : undefined;
    if (!FaceDetectorCtor) {
      onDetection?.({ detected: false, box: null, scanAvailable: false });
      return () => {};
    }

    let detector;
    try {
      // fastMode: false tends to detect better on some laptop / virtual feeds
      detector = new FaceDetectorCtor({ fastMode: false, maxDetectedFaces: 1 });
      detectorRef.current = detector;
      setFaceDetectorReady(true);
      onDetection?.({ detected: false, box: null, scanAvailable: true });
    } catch {
      detectorRef.current = null;
      onDetection?.({ detected: false, box: null, scanAvailable: false });
      return () => {};
    }

    let alive = true;
    let lastRunAt = 0;
    const tick = async (t) => {
      if (!alive) return;
      detectLoopRef.current = window.requestAnimationFrame(tick);

      if (t - lastRunAt < 120) return;
      lastRunAt = t;

      const det = detectorRef.current;
      if (!det || !video.videoWidth || !video.videoHeight) return;
      if (video.readyState < 2) return;

      try {
        const faces = await det.detect(video);
        const face = Array.isArray(faces) && faces.length > 0 ? faces[0] : null;
        if (!face?.boundingBox) {
          setIsFaceDetected(false);
          setFaceBox(null);
          onDetection?.({ detected: false, box: null, scanAvailable: true });
          return;
        }

        const bb = face.boundingBox;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        const x = Math.max(0, Math.min(100, (bb.x / vw) * 100));
        const y = Math.max(0, Math.min(100, (bb.y / vh) * 100));
        const w = Math.max(0, Math.min(100, (bb.width / vw) * 100));
        const h = Math.max(0, Math.min(100, (bb.height / vh) * 100));

        const xMirrored = Math.max(0, Math.min(100, 100 - x - w));

        const box = { x: xMirrored, y, w, h };
        setIsFaceDetected(true);
        setFaceBox(box);
        onDetection?.({ detected: true, box, scanAvailable: true });
      } catch {
        // ignore transient detection errors
      }
    };

    detectLoopRef.current = window.requestAnimationFrame(tick);
    return () => {
      alive = false;
      setFaceDetectorReady(false);
      if (detectLoopRef.current) {
        window.cancelAnimationFrame(detectLoopRef.current);
        detectLoopRef.current = null;
      }
    };
  }, [isStreaming, onDetection]);

  const retake = () => {
    setSamples([]);
    setStatus(isStreaming ? 'Camera ready. Align your face inside the frame, then click Capture.' : 'Initializing...');
    onCapture?.([]);
  };

  const captureSample = async () => {
    if (!videoRef.current || !isStreaming) return;
    if (mustDetectFaceToCapture && !isFaceDetected) {
      setStatus('No face detected yet. Center your face, wait for “Face detected”, then click Capture.');
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
        style={{ aspectRatio: '4/3' }}
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
        {/* Biometric overlay — large portrait guide so the face fits comfortably */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/20" />
          <div className="absolute inset-0 flex items-center justify-center px-3 py-3 sm:px-5 sm:py-5">
            <div className="relative aspect-[3/4] w-[min(94vw,22rem)] max-h-[88%] sm:w-[min(94vw,26rem)] sm:max-h-[90%] md:w-[min(94vw,30rem)]">
              <div className="absolute inset-0 rounded-2xl border-2 border-cyan-300/90 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_56px_rgba(0,255,255,0.22)]" />
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_56px_rgba(0,255,255,0.32)]" />
              <div className="absolute inset-[12%] rounded-full border border-cyan-300/30 face-radar" />
              <div className="absolute inset-[12%] rounded-full border border-cyan-300/25 face-radar-delayed" />
            </div>
          </div>
          <div className="animate-scan absolute left-0 top-0 w-full h-1 bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
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
            title={
              !faceDetectorReady
                ? 'No Chromium FaceDetector (Firefox/Safari) or init failed — you can still capture. Virtual cameras (e.g. iVCam) often need manual capture.'
                : isFaceDetected
                  ? 'Live face scan sees a face'
                  : 'Live scan on — no face in view yet'
            }
          >
            {!faceDetectorReady ? 'Manual' : isFaceDetected ? 'Face detected' : 'No face'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300/70">
            Samples: {samples.length}/{samplesRequired}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/70">{status}</p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Align your face inside the cyan frame, then tap <span className="text-slate-700 dark:text-slate-200">Capture</span>.
          {!faceDetectorReady
            ? ' Live auto-scan is off in this browser or for this camera — capture still works.'
            : mustDetectFaceToCapture
              ? ' Capture turns on when “Face detected” appears.'
              : null}
        </p>

        <div className="mt-3 flex items-center justify-center gap-3">
          {!done ? (
            <button
              type="button"
              onClick={captureSample}
              disabled={!isStreaming || (mustDetectFaceToCapture && !isFaceDetected)}
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

