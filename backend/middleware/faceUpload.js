const multer = require('multer');
const fs = require('fs');
const path = require('path');

const facesDir = path.join(__dirname, '..', '..', 'uploads', 'faces');

// Ensure uploads/faces directory exists
if (!fs.existsSync(facesDir)) {
  fs.mkdirSync(facesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, facesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    const userId = (req.user && req.user._id) || 'anonymous';
    const timestamp = Date.now();
    cb(null, `face-${userId}-${timestamp}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

const faceUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = faceUpload;

