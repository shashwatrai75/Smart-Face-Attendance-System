import { useRef, useEffect, useState } from 'react';

const FaceCamera = ({ onCapture, onError, samplesRequired = 5 }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [samples, setSamples] = useState([]);
  const [status, setStatus] = useState('Initializing...');
  const [videoOrientation, setVideoOrientation] = useState(0); // Correct rotation in degrees

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
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  const captureSample = async () => {
    if (!videoRef.current || !isStreaming) return;

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
        className="camera-wrapper relative w-full overflow-hidden rounded-[10px] border-2 border-gray-300 bg-black"
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
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">{status}</p>
        <p className="text-xs text-gray-500">
          Samples: {samples.length}/{samplesRequired}
        </p>
        {samples.length < samplesRequired && (
          <button
            onClick={captureSample}
            disabled={!isStreaming}
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Capture Sample
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceCamera;

