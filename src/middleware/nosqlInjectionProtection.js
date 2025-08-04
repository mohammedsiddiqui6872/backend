const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
const xss = require('xss');
const { securityManager } = require('../config/security');

/**
 * Enhanced NoSQL Injection Protection Middleware
 * Provides comprehensive protection against MongoDB injection attacks
 */

/**
 * Sanitize object recursively to prevent NoSQL injection
 */
function deepSanitize(obj, depth = 0) {
  if (depth > 10) {
    throw new Error('Object nesting too deep');
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Remove dangerous operators
      if (key.startsWith('$') || key.includes('.') || key.includes('\0')) {
        continue; // Skip dangerous keys
      }
      
      // Sanitize key
      const cleanKey = validator.escape(key).replace(/[^\w\-_]/g, '');
      if (cleanKey !== key && !['_id', '__v'].includes(key)) {
        continue; // Skip if key was modified (potential injection)
      }
      
      sanitized[key] = deepSanitize(value, depth + 1);
    }
    
    return sanitized;
  }

  if (typeof obj === 'string') {
    // Remove null bytes and dangerous characters
    let cleaned = obj.replace(/\0/g, '');
    
    // XSS protection
    cleaned = xss(cleaned, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
    
    // Validate against MongoDB injection patterns
    const dangerousPatterns = [
      /\$where/gi,
      /\$regex/gi,
      /\$ne/gi,
      /\$gt/gi,
      /\$gte/gi,
      /\$lt/gi,
      /\$lte/gi,
      /\$in/gi,
      /\$nin/gi,
      /\$or/gi,
      /\$and/gi,
      /\$nor/gi,
      /\$not/gi,
      /\$exists/gi,
      /\$type/gi,
      /\$mod/gi,
      /\$size/gi,
      /\$all/gi,
      /\$elemMatch/gi,
      /javascript:/gi,
      /eval\s*\(/gi,
      /function\s*\(/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(cleaned)) {
        throw new Error('Potentially malicious input detected');
      }
    }
    
    return cleaned;
  }

  return obj;
}

/**
 * Comprehensive input validation middleware
 */
const validateInput = (validationRules = {}) => {
  return (req, res, next) => {
    try {
      // Sanitize all input data
      req.body = deepSanitize(req.body);
      req.query = deepSanitize(req.query);
      req.params = deepSanitize(req.params);

      // Apply specific validation rules
      if (Object.keys(validationRules).length > 0) {
        const bodyValidation = securityManager.validateAndSanitizeInput(req.body, validationRules.body || {});
        const queryValidation = securityManager.validateAndSanitizeInput(req.query, validationRules.query || {});
        const paramsValidation = securityManager.validateAndSanitizeInput(req.params, validationRules.params || {});

        const allErrors = [
          ...bodyValidation.errors,
          ...queryValidation.errors,
          ...paramsValidation.errors
        ];

        if (allErrors.length > 0) {
          return res.status(400).json({
            error: 'Input validation failed',
            details: allErrors
          });
        }

        // Use sanitized values
        req.body = bodyValidation.sanitized;
        req.query = queryValidation.sanitized;
        req.params = paramsValidation.sanitized;
      }

      next();
    } catch (error) {
      console.error('Input validation error:', error);
      return res.status(400).json({
        error: 'Invalid input data',
        message: 'Request contains potentially malicious content'
      });
    }
  };
};

/**
 * MongoDB query sanitization middleware
 */
const sanitizeMongoQuery = (req, res, next) => {
  try {
    // Use express-mongo-sanitize as base protection
    mongoSanitize()(req, res, () => {
      // Additional custom sanitization
      if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
      }
      
      if (req.query && typeof req.query === 'object') {
        req.query = deepSanitize(req.query);
      }
      
      next();
    });
  } catch (error) {
    console.error('MongoDB query sanitization error:', error);
    return res.status(400).json({
      error: 'Query sanitization failed',
      message: 'Invalid query parameters'
    });
  }
};

/**
 * Validate ObjectId parameters
 */
const validateObjectIds = (fields = []) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const field of fields) {
      const value = req.params[field] || req.body[field] || req.query[field];
      
      if (value && !validator.isMongoId(value)) {
        errors.push(`${field} must be a valid ObjectId`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid ObjectId parameters',
        details: errors
      });
    }
    
    next();
  };
};

/**
 * Tenant ID validation middleware
 */
const validateTenantId = (req, res, next) => {
  const tenantId = req.tenant?.tenantId || req.tenantId;
  
  if (!tenantId) {
    return res.status(403).json({
      error: 'Tenant context required'
    });
  }
  
  // Validate tenant ID format
  if (!/^rest_[a-z0-9-]+_\d+$/.test(tenantId)) {
    return res.status(403).json({
      error: 'Invalid tenant ID format'
    });
  }
  
  next();
};

/**
 * Content-Type validation middleware
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next(); // Skip for GET/DELETE requests
    }
    
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header required'
      });
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      return res.status(415).json({
        error: 'Unsupported Content-Type',
        allowed: allowedTypes
      });
    }
    
    next();
  };
};

/**
 * Request size validation middleware
 */
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`
      });
    }
    
    next();
  };
};

/**
 * Complete security middleware stack
 */
const createSecurityStack = (options = {}) => {
  const {
    validationRules = {},
    maxRequestSize = 10 * 1024 * 1024,
    allowedContentTypes = ['application/json'],
    objectIdFields = [],
    requireTenantId = false
  } = options;

  const middlewares = [
    validateRequestSize(maxRequestSize),
    validateContentType(allowedContentTypes),
    sanitizeMongoQuery,
    validateInput(validationRules)
  ];

  if (objectIdFields.length > 0) {
    middlewares.push(validateObjectIds(objectIdFields));
  }

  if (requireTenantId) {
    middlewares.push(validateTenantId);
  }

  return middlewares;
};

module.exports = {
  validateInput,
  sanitizeMongoQuery,
  validateObjectIds,
  validateTenantId,
  validateContentType,
  validateRequestSize,
  createSecurityStack,
  deepSanitize
};