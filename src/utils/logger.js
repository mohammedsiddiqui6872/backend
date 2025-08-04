const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define which transports to use based on environment
const transports = [];

// Always log to file
transports.push(
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format,
  })
);

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  // Don't exit on uncaught errors
  exitOnError: false,
});

// Create a stream for Morgan HTTP logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// Wrapper functions that filter sensitive data
const sanitize = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sensitive = ['password', 'token', 'jwt', 'secret', 'apiKey', 'authorization'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  
  return sanitized;
};

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.map(arg => sanitize(arg)).join(' '));
  console.error = (...args) => logger.error(args.map(arg => sanitize(arg)).join(' '));
  console.warn = (...args) => logger.warn(args.map(arg => sanitize(arg)).join(' '));
  console.debug = (...args) => logger.debug(args.map(arg => sanitize(arg)).join(' '));
}

// Export logger with sanitization wrapper
module.exports = {
  error: (message, data) => logger.error(message, sanitize(data)),
  warn: (message, data) => logger.warn(message, sanitize(data)),
  info: (message, data) => logger.info(message, sanitize(data)),
  http: (message, data) => logger.http(message, sanitize(data)),
  debug: (message, data) => logger.debug(message, sanitize(data)),
  stream: logger.stream,
};