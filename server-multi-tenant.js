const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
require('dotenv').config();

// Import multi-tenant middleware
const { tenantContext, ensureTenantIsolation } = require('./src/middleware/tenantContext');
const { enterpriseTenantIsolation, strictTenantIsolation, auditTenantAccess } = require('./src/middleware/enterpriseTenantIsolation');
const { authenticate } = require('./src/middleware/auth');

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
        /^https?:\/\/([a-z0-9-]+\.)?gritservices\.ae$/,
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/.*\.vercel\.app$/ // Allow Vercel preview deployments
      ];
      
      // Check if origin matches any allowed origin or pattern
      const allowed = allowedOrigins.includes(origin) || 
        allowedPatterns.some(pattern => pattern.test(origin));
      callback(null, allowed);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
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

// Security middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now, configure properly later
  crossOriginEmbedderPolicy: false
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
      /^https?:\/\/([a-z0-9-]+\.)?gritservices\.ae$/,
      /^https?:\/\/localhost:\d+$/,
      /^https?:\/\/127\.0\.0\.1:\d+$/,
      /^https?:\/\/.*\.vercel\.app$/ // Allow Vercel preview deployments
    ];
    
    // Check if origin matches any allowed origin or pattern
    const allowed = allowedOrigins.includes(origin) || 
      allowedPatterns.some(pattern => pattern.test(origin));
    
    callback(null, allowed);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Tenant-Id']
}));

// Rate limiting per tenant
const createTenantRateLimiter = (windowMs, max) => {
  const limiters = new Map();
  
  return (req, res, next) => {
    // Use tenant ID from the request object (set by tenantContext middleware)
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

// Body parsing with increased limits for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Tenant: ${req.get('host')}`);
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

// Public routes (no tenant required)
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

// Apply tenant context middleware to remaining routes
app.use('/api', tenantContext);

// Apply rate limiting after tenant context is set (for API routes)
app.use('/api', createTenantRateLimiter(15 * 60 * 1000, 500)); // 500 requests per 15 minutes per tenant

// Tenant-specific routes
app.use('/api/auth', ensureTenantIsolation, require('./src/routes/auth'));
app.use('/api/menu', ensureTenantIsolation, require('./src/routes/menu'));
app.use('/api/categories', ensureTenantIsolation, require('./src/routes/categories'));
app.use('/api/combos', ensureTenantIsolation, require('./src/routes/combos'));
app.use('/api/orders', ensureTenantIsolation, require('./src/routes/orders'));
app.use('/api/tables', ensureTenantIsolation, require('./src/routes/tables'));
app.use('/api/payments', ensureTenantIsolation, require('./src/routes/payments'));
app.use('/api/feedback', ensureTenantIsolation, require('./src/routes/feedback'));
app.use('/api/customer-sessions', ensureTenantIsolation, require('./src/routes/customerSessions'));

// Admin routes
app.use('/api/admin/users', ensureTenantIsolation, require('./src/routes/admin/users'));
app.use('/api/admin/menu', ensureTenantIsolation, require('./src/routes/admin/menu'));
app.use('/api/admin/categories', ensureTenantIsolation, require('./src/routes/admin/categories'));
app.use('/api/admin/stock', ensureTenantIsolation, require('./src/routes/admin/stock'));
app.use('/api/admin/ingredients', ensureTenantIsolation, require('./src/routes/admin/ingredients'));
app.use('/api/admin/recipes', ensureTenantIsolation, require('./src/routes/admin/recipes'));
app.use('/api/admin/pricing-rules', ensureTenantIsolation, require('./src/routes/admin/pricingRules'));
app.use('/api/admin/combos', ensureTenantIsolation, require('./src/routes/admin/combos'));
app.use('/api/admin/modifiers', ensureTenantIsolation, require('./src/routes/modifiers'));
app.use('/api/admin/menu-analytics', ensureTenantIsolation, require('./src/routes/admin/menuAnalytics'));
app.use('/api/admin/channels', ensureTenantIsolation, require('./src/routes/admin/channels'));
app.use('/api/admin/menu-schedules', ensureTenantIsolation, require('./src/routes/admin/menuSchedules'));
app.use('/api/admin/tables/import', ensureTenantIsolation, require('./src/routes/admin/tableImport'));
app.use('/api/admin/tables/combination', ensureTenantIsolation, require('./src/routes/admin/tableCombination'));
app.use('/api/admin/tables', ensureTenantIsolation, require('./src/routes/admin/tables'));
app.use('/api/admin/analytics', ensureTenantIsolation, require('./src/routes/admin/analytics'));
app.use('/api/admin/analytics', ensureTenantIsolation, require('./src/routes/admin/orderAnalytics'));
app.use('/api/admin/stations', ensureTenantIsolation, require('./src/routes/admin/stations'));
app.use('/api/admin/inventory', ensureTenantIsolation, require('./src/routes/admin/Inventory'));
app.use('/api/admin/table-status-rules', ensureTenantIsolation, require('./src/routes/admin/tableStatusRules'));
app.use('/api/admin/session-analytics', ensureTenantIsolation, require('./src/routes/admin/sessionAnalytics'));
app.use('/api/admin/table-service-history', ensureTenantIsolation, require('./src/routes/admin/tableServiceHistory'));

// Enhanced team management routes - Using enterprise isolation
app.use('/api/admin/team', require('./src/routes/team'));
app.use('/api/admin/shifts', require('./src/routes/shifts'));
app.use('/api/admin/roles', require('./src/routes/roles'));

// Test routes removed for production

// Special handling for admin panel to allow access without failing on tenant context
app.get('/admin-panel', async (req, res, next) => {
  // Apply tenant context but don't fail if not found - let the frontend handle it
  try {
    await tenantContext(req, res, () => {});
  } catch (error) {
    console.log('Tenant context error for admin panel:', error);
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
    await tenantContext(req, res, () => {});
  } catch (error) {
    console.log('Tenant context error for admin panel:', error);
  }
  
  const distPath = path.join(__dirname, 'admin-panel/dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'admin-panel', 'index.html'));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Disable strict populate globally to avoid issues with backward compatibility fields
mongoose.set('strictPopulate', false);

// MongoDB connection with multi-tenant setup
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB (Multi-tenant mode)');
  
  // Initialize tenant-aware socket handlers
  require('./src/sockets/tenantSocket')(io);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
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
  console.log(`Multi-tenant server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Domain: gritservices.ae`);
  
  // Start session monitor
  sessionMonitor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  sessionMonitor.stop();
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});