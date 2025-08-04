const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const fs = require('fs');
require('dotenv').config();
const logger = require('./src/utils/logger');

// Import enhanced configurations
const { connectDB } = require('./src/config/database');
const { cacheManager } = require('./src/config/redis');
const { advancedRateLimiter } = require('./src/middleware/advancedRateLimiting');
const { validateInput, createSecurityStack } = require('./src/middleware/nosqlInjectionProtection');

// Import multi-tenant middleware - using only enterprise tenant isolation
const { enterpriseTenantIsolation, strictTenantIsolation, auditTenantAccess, getCurrentTenant } = require('./src/middleware/enterpriseTenantIsolation');
const publicTenantContext = require('./src/middleware/publicTenantContext');
const { authenticate } = require('./src/middleware/auth');
const { apiVersioning, VersioningStrategy } = require('./src/middleware/apiVersioning');

// Import table status rule engine
const TableStatusRuleEngine = require('./src/services/tableStatusRuleEngine');

// Initialize Express
const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// Socket.io with multi-tenant support
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow all subdomains of gritservices.ae
      if (!origin) return callback(null, true);
      
      // Parse comma-separated FRONTEND_URL
      const allowedOrigins = process.env.FRONTEND_URL 
        ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
        : [];
      
      const allowedPatterns = [
        /^https?:\/\/([a-z0-9-]+\.)?gritservices\.ae(:\d+)?$/,
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/.*\.vercel\.app$/,
        /^https?:\/\/.*\.onrender\.com$/ // Allow Render deployments
      ];
      
      // Check if origin matches any allowed origin or pattern
      const allowed = allowedOrigins.includes(origin) || 
        allowedPatterns.some(pattern => pattern.test(origin));
      callback(null, allowed);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Tenant-Subdomain', 'X-CSRF-Token', 'X-Guest-Session-Id', 'X-Table-Number', 'X-Device-Type']
  }
});

// Make io accessible to routes and globally for services
app.set('io', io);
global.io = io;

// Initialize table status rule engine
const ruleEngine = new TableStatusRuleEngine(io);
app.set('ruleEngine', ruleEngine);

// Initialize session monitor
const SessionMonitor = require('./src/jobs/sessionMonitor');
const sessionMonitor = new SessionMonitor(io);

// Initialize session metrics service
const SessionMetricsService = require('./src/services/sessionMetricsService');
const sessionMetricsService = new SessionMetricsService(io);
app.set('sessionMetricsService', sessionMetricsService);

// Initialize table service history service
const TableServiceHistoryService = require('./src/services/tableServiceHistoryService');
const tableServiceHistoryService = new TableServiceHistoryService(io);
app.set('tableServiceHistoryService', tableServiceHistoryService);

// Initialize shift notification service
const shiftNotificationService = require('./src/services/shiftNotificationService');
shiftNotificationService.initialize();
app.set('shiftNotificationService', shiftNotificationService);

// Enhanced security middleware stack
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Fallback to standard filter function
    return compression.filter(req, res);
  }
}));

// NoSQL injection protection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized potentially malicious key: ${key} from ${req.ip}`);
  }
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow for image uploads
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// CORS configuration for multi-tenant
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    // Parse comma-separated FRONTEND_URL
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : [];
    
    const allowedPatterns = [
      /^https?:\/\/([a-z0-9-]+\.)?gritservices\.ae(:\d+)?$/,
      /^https?:\/\/localhost:\d+$/,
      /^https?:\/\/127\.0\.0\.1:\d+$/,
      /^https?:\/\/.*\.vercel\.app$/,
      /^https?:\/\/.*\.onrender\.com$/ // Allow Render deployments
    ];
    
    // Check if origin matches any allowed origin or pattern
    const allowed = allowedOrigins.includes(origin) || 
      allowedPatterns.some(pattern => pattern.test(origin));
    
    callback(null, allowed);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Tenant-Subdomain', 'X-CSRF-Token', 'X-Guest-Session-Id', 'X-Table-Number', 'X-Device-Type'],
  exposedHeaders: ['X-Total-Count', 'X-Tenant-Id']
}));

// Rate limiting per tenant
const createTenantRateLimiter = (windowMs, max) => {
  const limiters = new Map();
  
  return (req, res, next) => {
    // Use tenant ID from the request object (set by tenant middleware)
    const tenantId = req.tenant?.tenantId || req.tenantId || 'public';
    
    if (!limiters.has(tenantId)) {
      limiters.set(tenantId, rateLimit({
        windowMs,
        max,
        keyGenerator: (req) => {
          // Use the tenant ID as the key for rate limiting
          return req.tenant?.tenantId || req.tenantId || 'public';
        },
        message: 'Too many requests from this restaurant. Please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      }));
    }
    
    limiters.get(tenantId)(req, res, next);
  };
};

// Body parsing with security-focused limits
app.use(express.json({ 
  limit: '10mb', // Reduced from 50mb for security
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb', // Reduced from 50mb for security
  parameterLimit: 100, // Limit number of parameters
  type: 'application/x-www-form-urlencoded'
}));

// Request logging - sanitized for production
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.http(`${req.method} ${req.path} - Host: ${req.get('host')}`);
  }
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'GRIT Services Multi-Tenant Restaurant Backend',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    mode: 'multi-tenant',
    endpoints: {
      health: '/api/public/health',
      'super-admin': '/api/super-admin/*',
      'tenant-apis': '/api/* (requires tenant context)'
    }
  });
});

// Apply API versioning middleware
app.use('/api', apiVersioning({
  strategy: VersioningStrategy.URL_PATH,
  defaultVersion: 'v1',
  deprecationWarning: true
}));

// System health and monitoring routes
app.use('/api/system', require('./src/routes/systemHealth'));

// Legacy health endpoint for backward compatibility
app.get('/api/public/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'multi-tenant'
  });
});

// Table access route (public - for QR code scanning)
app.use('/api/table', require('./src/routes/tableAccess'));

// Super admin routes (for SaaS management - no tenant context)
app.use('/api/super-admin', require('./src/routes/superAdmin'));

// Enhanced security and rate limiting for API routes
app.use('/api', ...advancedRateLimiter.createSecurityStack('public', {
  enableSlowDown: true,
  enableAdaptive: false,
  customLimits: { points: 1000, duration: 3600, blockDuration: 300 }
}));

// Add burst protection for all API routes
app.use('/api', advancedRateLimiter.createBurstProtection({
  points: 30,
  duration: 1,
  blockDuration: 5
}));

// Additional IP-based rate limiting
app.use('/api', advancedRateLimiter.createIPRateLimiter({
  points: 5000,
  duration: 3600,
  blockDuration: 1800
}));

// Public tenant routes (no authentication required, but need tenant context)
app.use('/api/auth', publicTenantContext, require('./src/routes/auth'));
app.use('/api/guest', publicTenantContext, require('./src/routes/guest'));
app.use('/api/menu', publicTenantContext, require('./src/routes/menu'));
app.use('/api/categories', publicTenantContext, require('./src/routes/categories'));

// Routes that require authentication - these will use authenticate + enterpriseTenantIsolation internally
app.use('/api/combos', require('./src/routes/combos'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/tables', require('./src/routes/tables'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/feedback', require('./src/routes/feedback'));
app.use('/api/customer-sessions', require('./src/routes/customerSessions'));

// Admin routes - These routes should handle authentication + enterpriseTenantIsolation internally
app.use('/api/admin/users', require('./src/routes/admin/users'));
app.use('/api/admin/menu', require('./src/routes/admin/menu'));
app.use('/api/admin/categories', require('./src/routes/admin/categories'));
app.use('/api/admin/stock', require('./src/routes/admin/stock'));
app.use('/api/admin/ingredients', require('./src/routes/admin/ingredients'));
app.use('/api/admin/recipes', require('./src/routes/admin/recipes'));
app.use('/api/admin/pricing-rules', require('./src/routes/admin/pricingRules'));
app.use('/api/admin/combos', require('./src/routes/admin/combos'));
app.use('/api/admin/modifiers', require('./src/routes/modifiers'));
app.use('/api/admin/menu-analytics', require('./src/routes/admin/menuAnalytics'));
app.use('/api/admin/channels', require('./src/routes/admin/channels'));
app.use('/api/admin/menu-schedules', require('./src/routes/admin/menuSchedules'));
app.use('/api/admin/tables/import', require('./src/routes/admin/tableImport'));
app.use('/api/admin/tables/combination', require('./src/routes/admin/tableCombination'));
app.use('/api/admin/tables', require('./src/routes/admin/tables'));
app.use('/api/admin/analytics', require('./src/routes/admin/analytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/orderAnalytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/predictiveAnalytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/customerAnalytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/competitiveAnalytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/financialAnalytics'));
app.use('/api/admin/analytics', require('./src/routes/admin/employeePerformance'));
app.use('/api/admin/stations', require('./src/routes/admin/stations'));
app.use('/api/admin/inventory', require('./src/routes/admin/Inventory'));
app.use('/api/admin/table-status-rules', require('./src/routes/admin/tableStatusRules'));
app.use('/api/admin/session-analytics', require('./src/routes/admin/sessionAnalytics'));
app.use('/api/admin/table-service-history', require('./src/routes/admin/tableServiceHistory'));

// Enhanced team management routes - Using enterprise isolation
app.use('/api/admin/team', require('./src/routes/team'));
app.use('/api/admin/shifts', require('./src/routes/shifts'));
app.use('/api/admin/shift-templates', require('./src/routes/shiftTemplates'));
app.use('/api/admin/roles', require('./src/routes/roles'));
app.use('/api/admin/staff-assignments', require('./src/routes/admin/staffAssignments'));

// Compliance routes
app.use('/api/compliance', require('./src/routes/compliance'));

// Test routes removed for production

// Special handling for admin panel to allow access without failing on tenant context
app.get('/admin-panel', async (req, res, next) => {
  // Apply tenant context but don't fail if not found - let the frontend handle it
  try {
    await publicTenantContext(req, res, () => {});
  } catch (error) {
    logger.debug('Admin panel tenant context lookup failed');
  }
  
  const distPath = path.join(__dirname, 'admin-panel/dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback to basic admin panel
    res.sendFile(path.join(__dirname, 'admin-panel', 'index.html'));
  }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve admin panel static assets
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel/dist')));

// Handle all admin panel routes
app.get('/admin-panel/*', async (req, res) => {
  try {
    await publicTenantContext(req, res, () => {});
  } catch (error) {
    logger.debug('Admin panel tenant context lookup failed');
  }
  
  const distPath = path.join(__dirname, 'admin-panel/dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'admin-panel', 'index.html'));
  }
});

// Import error handlers
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Disable strict populate globally to avoid issues with backward compatibility fields
mongoose.set('strictPopulate', false);

// Enhanced MongoDB connection with optimizations
connectDB()
.then(() => {
  logger.info('Connected to MongoDB with enhanced optimizations');
  
  // Initialize enhanced tenant-aware socket handlers with memory leak prevention
  const socketHandler = require('./src/sockets/enhancedTenantSocket');
  socketHandler(io);
  
  // Initialize cache manager if not already done
  logger.info('Cache manager initialized');
})
.catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Socket.io tenant isolation
io.use(async (socket, next) => {
  try {
    const host = socket.handshake.headers.host;
    const subdomain = host?.split('.')[0];
    
    if (subdomain && !['localhost', 'api', 'admin'].includes(subdomain)) {
      const Tenant = require('./src/models/Tenant');
      const tenant = await Tenant.findBySubdomain(subdomain);
      
      if (tenant && tenant.isActive()) {
        socket.tenantId = tenant.tenantId;
        socket.join(`tenant:${tenant.tenantId}`);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Multi-tenant server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Domain: gritservices.ae`);
  
  // Start session monitor
  sessionMonitor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  sessionMonitor.stop();
  
  // Clean up socket connections
  const socketHandler = require('./src/sockets/enhancedTenantSocket');
  if (socketHandler.cleanup) {
    socketHandler.cleanup();
  }
  
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});