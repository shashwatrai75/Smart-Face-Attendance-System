import * as faceapi from 'face-api.js';

let modelsLoaded = false;

const MODEL_URL = '/face-models';

// Removed waitForTensorFlow - unnecessary delay

export const loadModels = async () => {
  if (modelsLoaded) {
    console.log('Models already loaded');
    return;
  }

  try {
    console.log('Loading face recognition models from:', MODEL_URL);
    
    // Load models sequentially to avoid TensorFlow backend conflicts
    console.log('Loading TinyFaceDetector...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log('✓ TinyFaceDetector loaded');
    
    console.log('Loading FaceLandmark68Net...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    console.log('✓ FaceLandmark68Net loaded');
    
    console.log('Loading FaceRecognitionNet...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('✓ FaceRecognitionNet loaded');
    
    modelsLoaded = true;
    console.log('✅ All face models loaded successfully');
  } catch (error) {
    console.error('❌ Error loading face models:', error);
    console.error('Error details:', error.stack);
    console.error('Make sure face model files are in:', MODEL_URL);
    throw new Error(`Failed to load face recognition models: ${error.message}. Please check that model files are in ${MODEL_URL}`);
  }
};

// Helper function to flip image horizontally
const flipImage = (canvas, ctx, video) => {
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();
};

export const detectFace = async (videoElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  // Check if video is ready
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    console.warn('Video element not ready');
    return null;
  }

  try {
    // Create a much smaller canvas for maximum speed (process at 40% size = 6x faster)
    const scale = 0.4; // Even smaller for speed
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.floor((videoElement.videoWidth || 640) * scale);
    canvas.height = Math.floor((videoElement.videoHeight || 480) * scale);
    
    // Draw video to canvas (flipped and scaled down) - optimized
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      videoElement, 
      -canvas.width / scale, 
      0, 
      canvas.width / scale, 
      canvas.height / scale
    );
    ctx.restore();

    // Use fastest detection options
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224, // Much smaller = much faster (was 320)
      scoreThreshold: 0.25, // Lower threshold for better detection
    });

    // Single pass detection (fastest)
    const detection = await faceapi
      .detectSingleFace(canvas, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (detection) {
      console.log('Face detected! Confidence:', detection.detection.score.toFixed(2));
    }

    return detection;
  } catch (error) {
    console.error('Face detection error:', error);
    return null;
  }
};

export const computeEmbedding = async (videoElement) => {
  const detection = await detectFace(videoElement);
  if (!detection) {
    return null;
  }

  // Check if descriptor exists (might not if landmark detection failed)
  if (!detection.descriptor) {
    console.warn('No descriptor available, face detection incomplete');
    return null;
  }

  return Array.from(detection.descriptor);
};

export const computeAverageEmbedding = (embeddings) => {
  if (embeddings.length === 0) return null;

  const sum = new Array(128).fill(0);
  embeddings.forEach((emb) => {
    emb.forEach((val, i) => {
      sum[i] += val;
    });
  });

  return sum.map((val) => val / embeddings.length);
};

export const computeDistance = (embedding1, embedding2) => {
  if (!embedding1 || !embedding2) return Infinity;

  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const findBestMatch = (queryEmbedding, studentEmbeddings, threshold = 0.6) => {
  let bestMatch = null;
  let bestDistance = Infinity;

  studentEmbeddings.forEach((student) => {
    const distance = computeDistance(queryEmbedding, student.embedding);
    if (distance < bestDistance && distance < threshold) {
      bestDistance = distance;
      bestMatch = {
        studentId: student.id,
        fullName: student.fullName,
        rollNo: student.rollNo,
        distance,
      };
    }
  });

  return bestMatch;
};

