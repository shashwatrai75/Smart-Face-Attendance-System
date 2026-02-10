import { useRef, useEffect, useState } from 'react';
import { detectFace, computeEmbedding, loadModels } from '../ai/faceEngine';
import { checkLiveness, resetLiveness } from '../ai/liveness';

const FaceCamera = ({ onCapture, onError, samplesRequired = 5 }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [samples, setSamples] = useState([]);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

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
      // Load models first
      setStatus('Loading face recognition models...');
      await loadModels();
      setModelsReady(true);
      setStatus('Models loaded. Starting camera...');
      
      // Then start camera
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
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
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
      setStatus('Detecting face...');
      const detection = await detectFace(videoRef.current);

      if (!detection) {
        setStatus('No face detected. Ensure: Good lighting, face clearly visible.');
        setFaceDetected(false);
        return;
      }

      setFaceDetected(true);
      setStatus('Processing...');

      // Skip liveness check for faster processing (optional - can re-enable if needed)
      // const livenessResult = await checkLiveness(videoRef.current);
      // if (!livenessResult.passed && samples.length === 0) {
      //   setStatus(livenessResult.reason || 'Please blink or move your head slightly.');
      //   return;
      // }

      // Directly compute embedding (faster)
      const embedding = await computeEmbedding(videoRef.current);
      if (embedding) {
        setSamples((prev) => {
          const newSamples = [...prev, embedding];
          if (newSamples.length >= samplesRequired) {
            setStatus('Complete! Processing...');
            setTimeout(() => {
              onCapture?.(newSamples);
            }, 200);
          }
          return newSamples;
        });
        setStatus(`✓ Sample ${samples.length + 1}/${samplesRequired} captured`);
      }
    } catch (error) {
      console.error('Capture error:', error);
      onError?.('Failed to capture face. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-lg border-2 border-gray-300 scale-x-[-1]"
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

