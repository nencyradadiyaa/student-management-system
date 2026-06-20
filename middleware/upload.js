const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure public/uploads directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Upload System Warning] Failed to create uploads directory:', err.message);
}

// Set up disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `student-${uniqueSuffix}${ext}`);
  }
});

// Enforce image mime-type validations
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('File upload failed: Only images in JPEG, JPG, PNG, or WEBP format are allowed!'));
};

// Initialize Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB file size
  fileFilter: fileFilter
});

module.exports = upload;
