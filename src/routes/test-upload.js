const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Simple multer setup for testing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profiles');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'test-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Test upload endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  console.log('=== TEST UPLOAD DEBUG ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('File:', req.file);
  console.log('=========================');
  
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file received',
      headers: req.headers,
      contentType: req.get('content-type')
    });
  }
  
  res.json({ 
    success: true, 
    message: 'File uploaded successfully',
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    }
  });
});

// Test multiple files
router.post('/upload-multiple', upload.array('files', 5), (req, res) => {
  console.log('=== TEST MULTI UPLOAD DEBUG ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  console.log('==============================');
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No files received',
      headers: req.headers,
      contentType: req.get('content-type')
    });
  }
  
  res.json({ 
    success: true, 
    message: 'Files uploaded successfully',
    count: req.files.length,
    files: req.files.map(f => ({
      originalname: f.originalname,
      filename: f.filename,
      size: f.size
    }))
  });
});

module.exports = router;