const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getCurrentTenant } = require('./enterpriseTenantIsolation');

// File type mappings with magic numbers
const FILE_TYPES = {
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0xFF, 0xD8, 0xFF]) }
    ]
  },
  'image/png': {
    extensions: ['.png'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) }
    ]
  },
  'image/gif': {
    extensions: ['.gif'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) }, // GIF87a
      { offset: 0, bytes: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) }  // GIF89a
    ]
  },
  'image/webp': {
    extensions: ['.webp'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF
      { offset: 8, bytes: Buffer.from([0x57, 0x45, 0x42, 0x50]) }  // WEBP
    ]
  },
  'application/pdf': {
    extensions: ['.pdf'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0x25, 0x50, 0x44, 0x46]) } // %PDF
    ]
  },
  'text/csv': {
    extensions: ['.csv'],
    magicNumbers: [] // CSV doesn't have magic numbers
  },
  'application/vnd.ms-excel': {
    extensions: ['.xls'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) }
    ]
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    magicNumbers: [
      { offset: 0, bytes: Buffer.from([0x50, 0x4B, 0x03, 0x04]) } // ZIP format
    ]
  }
};

// Allowed MIME types per upload context
const UPLOAD_CONTEXTS = {
  'profile-photo': ['image/jpeg', 'image/png', 'image/webp'],
  'menu-item': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  'documents': ['image/jpeg', 'image/png', 'application/pdf'],
  'table-import': ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'receipts': ['image/jpeg', 'image/png', 'application/pdf']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  'profile-photo': 5 * 1024 * 1024,     // 5MB
  'menu-item': 10 * 1024 * 1024,        // 10MB
  'documents': 20 * 1024 * 1024,        // 20MB
  'table-import': 5 * 1024 * 1024,      // 5MB
  'receipts': 10 * 1024 * 1024          // 10MB
};

/**
 * Verify file type by checking magic numbers
 */
function verifyFileType(buffer, mimeType) {
  const fileType = FILE_TYPES[mimeType];
  if (!fileType || fileType.magicNumbers.length === 0) {
    return true; // Skip verification for types without magic numbers
  }

  return fileType.magicNumbers.some(magic => {
    if (buffer.length < magic.offset + magic.bytes.length) {
      return false;
    }
    
    return magic.bytes.every((byte, index) => 
      buffer[magic.offset + index] === byte
    );
  });
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename) {
  // Remove any directory components
  const basename = path.basename(filename);
  
  // Replace spaces and special characters
  return basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255); // Limit filename length
}

/**
 * Generate secure filename with tenant isolation
 */
function generateSecureFilename(originalName, tenantId) {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName).toLowerCase();
  const sanitizedName = sanitizeFilename(path.basename(originalName, ext));
  
  return `${tenantId}/${timestamp}_${randomStr}_${sanitizedName}${ext}`;
}

/**
 * Create multer storage configuration
 */
function createStorage(uploadContext) {
  return multer.memoryStorage(); // Store in memory for security checks
}

/**
 * Create file filter for upload validation
 */
function createFileFilter(uploadContext) {
  return (req, file, cb) => {
    // Check if upload context is valid
    if (!UPLOAD_CONTEXTS[uploadContext]) {
      return cb(new Error('Invalid upload context'));
    }

    // Check allowed MIME types
    const allowedTypes = UPLOAD_CONTEXTS[uploadContext];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed for ${uploadContext}`));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const fileType = FILE_TYPES[file.mimetype];
    if (!fileType || !fileType.extensions.includes(ext)) {
      return cb(new Error('File extension does not match MIME type'));
    }

    cb(null, true);
  };
}

/**
 * Create secure file upload middleware
 */
function createUploadMiddleware(uploadContext, fieldName = 'file', maxCount = 1) {
  const upload = multer({
    storage: createStorage(uploadContext),
    fileFilter: createFileFilter(uploadContext),
    limits: {
      fileSize: MAX_FILE_SIZES[uploadContext] || 10 * 1024 * 1024,
      files: maxCount,
      fields: 10,
      parts: 20
    }
  });

  // Return middleware that includes security checks
  if (maxCount === 1) {
    return [
      upload.single(fieldName),
      async (req, res, next) => {
        if (!req.file) return next();

        try {
          // Verify magic numbers
          if (!verifyFileType(req.file.buffer, req.file.mimetype)) {
            return res.status(400).json({ 
              error: 'File content does not match declared type' 
            });
          }

          // Add secure filename
          const tenant = getCurrentTenant();
          if (!tenant) {
            return res.status(403).json({ error: 'Tenant context required' });
          }

          req.file.secureFilename = generateSecureFilename(
            req.file.originalname, 
            tenant.tenantId
          );

          // Add security metadata
          req.file.security = {
            verified: true,
            verifiedAt: new Date(),
            uploadContext,
            tenantId: tenant.tenantId
          };

          next();
        } catch (error) {
          return res.status(500).json({ 
            error: 'File security validation failed' 
          });
        }
      }
    ];
  } else {
    return [
      upload.array(fieldName, maxCount),
      async (req, res, next) => {
        if (!req.files || req.files.length === 0) return next();

        try {
          const tenant = getCurrentTenant();
          if (!tenant) {
            return res.status(403).json({ error: 'Tenant context required' });
          }

          // Verify each file
          for (const file of req.files) {
            if (!verifyFileType(file.buffer, file.mimetype)) {
              return res.status(400).json({ 
                error: `File ${file.originalname}: content does not match declared type` 
              });
            }

            file.secureFilename = generateSecureFilename(
              file.originalname, 
              tenant.tenantId
            );

            file.security = {
              verified: true,
              verifiedAt: new Date(),
              uploadContext,
              tenantId: tenant.tenantId
            };
          }

          next();
        } catch (error) {
          return res.status(500).json({ 
            error: 'File security validation failed' 
          });
        }
      }
    ];
  }
}

/**
 * Scan file content for malicious patterns
 */
async function scanFileContent(buffer, mimeType) {
  // Basic content scanning
  const suspiciousPatterns = [
    /<script[\s>]/gi,              // Script tags
    /javascript:/gi,               // JavaScript protocol
    /on\w+\s*=/gi,                // Event handlers
    /<iframe/gi,                   // Iframes
    /<object/gi,                   // Objects
    /<embed/gi,                    // Embeds
    /eval\s*\(/gi,                 // Eval function
    /expression\s*\(/gi,           // CSS expressions
    /@import/gi,                   // CSS imports
    /vbscript:/gi,                 // VBScript protocol
    /data:text\/html/gi            // Data URIs with HTML
  ];

  // Only scan text-based formats
  if (mimeType.startsWith('text/') || mimeType.includes('xml') || mimeType === 'application/pdf') {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 100)); // Scan first 100KB
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return false; // Suspicious content found
      }
    }
  }

  return true; // Content appears safe
}

module.exports = {
  createUploadMiddleware,
  verifyFileType,
  sanitizeFilename,
  generateSecureFilename,
  scanFileContent,
  UPLOAD_CONTEXTS,
  MAX_FILE_SIZES
};