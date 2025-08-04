const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class TenantError extends AppError {
  constructor(message = 'Tenant operation failed') {
    super(message, 403, 'TENANT_ERROR');
  }
}

// MongoDB error handler
const handleMongoError = (error) => {
  if (error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    return new ConflictError(`${field} already exists`);
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new ValidationError('Validation failed', errors);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }
  
  return error;
};

// JWT error handler
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  return error;
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log error
  if (process.env.NODE_ENV !== 'production' || !error.isOperational) {
    logger.error('Error:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      tenantId: req.tenant?.tenantId
    });
  }
  
  // Handle specific error types
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.name === 'CastError') {
    error = handleMongoError(err);
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }
  
  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'INTERNAL_ERROR';
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(error.errors && { errors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && !error.isOperational && { 
        stack: error.stack,
        originalError: err.message 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  next(error);
};

// Request validation middleware
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return next(new ValidationError('Validation failed', errors));
    }
    
    next();
  };
};

// Sanitize error messages for production
const sanitizeError = (error, isDevelopment) => {
  if (isDevelopment) {
    return error;
  }
  
  // Hide internal error details in production
  if (!error.isOperational) {
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    };
  }
  
  return {
    message: error.message,
    code: error.code
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TenantError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validateRequest,
  sanitizeError
};