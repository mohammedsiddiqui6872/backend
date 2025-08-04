// Temporarily disabled until shared-errors package is built
// const {
//   errorHandler: sharedErrorHandler,
//   notFoundHandler: sharedNotFoundHandler,
//   asyncHandler,
//   errorLoggerMiddleware,
//   BusinessLogicError,
//   ValidationError,
//   AuthenticationError,
//   AuthorizationError,
//   DatabaseError,
//   NetworkError,
//   getErrorSerializer
// } = require('@gritservices/shared-errors');

// Temporary implementations
const sharedErrorHandler = null;
const sharedNotFoundHandler = null;
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const errorLoggerMiddleware = null;
class BusinessLogicError extends Error { constructor(message) { super(message); this.statusCode = 400; } }
class ValidationError extends Error { constructor(message) { super(message); this.statusCode = 400; } }
class AuthenticationError extends Error { constructor(message) { super(message); this.statusCode = 401; } }
class AuthorizationError extends Error { constructor(message) { super(message); this.statusCode = 403; } }
class DatabaseError extends Error { constructor(message) { super(message); this.statusCode = 500; } }
class NetworkError extends Error { constructor(message) { super(message); this.statusCode = 503; } }
const getErrorSerializer = () => ({ serialize: (error) => ({ message: error.message, code: error.code }) });
const logger = require('../utils/logger');

// Legacy error classes for backward compatibility
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
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
    return BusinessLogicError.conflictingResource(field, { keyPattern: error.keyPattern });
  }
  
  if (error.name === 'ValidationError') {
    const errors = {};
    Object.values(error.errors).forEach(err => {
      errors[err.path] = err.message;
    });
    return ValidationError.fromFieldErrors(errors);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format', [
      { field: error.path, message: 'Invalid ID format', value: error.value }
    ]);
  }
  
  return error;
};

// JWT error handler
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return AuthenticationError.tokenInvalid();
  }
  
  if (error.name === 'TokenExpiredError') {
    return AuthenticationError.tokenExpired();
  }
  
  return error;
};

// Custom error handler that integrates with shared errors
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // Transform MongoDB errors
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.name === 'CastError') {
    error = handleMongoError(err);
  }
  
  // Transform JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }
  
  // Transform legacy AppError to shared errors
  if (error instanceof AppError && !(error instanceof BusinessLogicError)) {
    if (error instanceof NotFoundError) {
      error = BusinessLogicError.resourceNotFound(error.message.replace(' not found', ''));
    } else if (error instanceof ConflictError) {
      error = BusinessLogicError.conflictingResource('Resource', { message: error.message });
    } else if (error instanceof RateLimitError) {
      error = NetworkError.rateLimited(req.originalUrl, 60);
    } else if (error instanceof TenantError) {
      error = AuthorizationError.tenantMismatch();
    }
  }
  
  // Add request context
  if (error.path === undefined) {
    error.path = req.originalUrl;
  }
  if (error.method === undefined) {
    error.method = req.method;
  }
  if (error.requestId === undefined) {
    error.requestId = req.requestId;
  }
  
  // Use shared error handler if available, otherwise use fallback
  if (sharedErrorHandler && typeof sharedErrorHandler === 'function') {
    sharedErrorHandler(error, req, res, next);
  } else {
    // Fallback error handler
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    
    // Log error
    if (logger && logger.error) {
      logger.error('Request error:', {
        error: error,
        request: {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          body: req.body,
          params: req.params,
          query: req.query
        }
      });
    }
    
    // Send error response
    res.status(statusCode).json({
      success: false,
      error: {
        message: message,
        code: error.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = BusinessLogicError.resourceNotFound('Route', `${req.method} ${req.originalUrl}`);
  next(error);
};

// Request validation middleware using Joi
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = {};
      error.details.forEach(detail => {
        const field = detail.path.join('.');
        errors[field] = detail.message;
      });
      
      return next(ValidationError.fromFieldErrors(errors));
    }
    
    next();
  };
};

// Sanitize error messages for production
const sanitizeError = (error, isDevelopment) => {
  const serializer = getErrorSerializer();
  const serialized = serializer.serialize(error);
  
  if (isDevelopment) {
    return serialized;
  }
  
  // Remove sensitive details in production
  delete serialized.stack;
  if (!error.isOperational) {
    serialized.message = 'An unexpected error occurred';
    delete serialized.details;
  }
  
  return serialized;
};

// Enhanced error logger integration
const errorLogger = errorLoggerMiddleware;

module.exports = {
  // Legacy exports for backward compatibility
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TenantError,
  
  // Handlers
  asyncHandler,
  errorHandler,
  notFoundHandler,
  errorLogger,
  validateRequest,
  sanitizeError,
  
  // Re-export shared errors
  BusinessLogicError,
  DatabaseError,
  NetworkError
};