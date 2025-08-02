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

// Initialize Firebase Admin only if credentials are available
let admin;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin = require('firebase-admin');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin initialized successfully');
  } else {
    console.log('Firebase Admin credentials not found, push notifications disabled');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  console.log('Push notifications will be disabled');
}

const app = express();

// Add this right after: const app = express();
app.post('/test-direct', (req, res) => {
  res.json({ 
    message: 'Direct POST works without any middleware',
    method: req.method,
    headers: req.headers
  });
});

// Fix trust proxy for Render
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://bella.powershellnerd.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// NOW we can require mobileSocket after io is initialized
try {
  require('./src/sockets/mobileSocket')(io);
  console.log('Mobile socket initialized');
} catch (error) {
  console.log('Mobile socket not available:', error.message);
}

// Security middleware with different CSP for admin panel
app.use((req, res, next) => {
  if (req.path.startsWith('/admin-panel')) {
    // Skip helmet entirely for admin panel
    next();
  } else {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"]
        }
      }
    })(req, res, next);
  }
});

app.use(compression());

// CORS configuration - Allow same-origin requests
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://bella.powershellnerd.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://restaurant-backend-2wea.onrender.com" // Allow admin panel same-origin
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Placeholder for missing images
app.use('/images', (req, res, next) => {
  console.log('Image request:', req.path);
  // Return a placeholder image or redirect to a default image
  res.redirect('https://via.placeholder.com/400x300?text=' + encodeURIComponent(req.path.replace('/', '').replace('.jpg', '').replace('-', ' ')));
});

// MongoDB connection - removed deprecated options
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant')
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Make io accessible to routes
app.set('io', io);

// Socket.io configuration
require('./src/sockets/orderSocket')(io);
require('./src/sockets/kitchenSocket')(io);
require('./src/sockets/adminSocket')(io);

// Notification helper functions
const sendNotificationToWaiter = async (waiterId, notification) => {
  try {
    if (!admin) {
      console.log('Firebase Admin not initialized, cannot send notification');
      return;
    }
    
    const User = require('./src/models/User');
    const waiter = await User.findById(waiterId);
    
    if (waiter && waiter.fcmToken) {
      const message = {
        token: waiter.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'waiter-notifications'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };
      
      const response = await admin.messaging().send(message);
      console.log('Notification sent successfully:', response);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Make notification function globally available
global.sendNotificationToWaiter = sendNotificationToWaiter;

// Admin panel route - MUST come before body parsing middleware
app.use('/admin-panel', express.static(path.join(__dirname, 'Admin-panel')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rate limiting - commented out per user request
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   trustProxy: true
// });

// Apply body parsing and rate limiting to API routes
// app.use('/api', limiter);
app.use('/api', express.json({ limit: '50mb' }));
app.use('/api', express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure CORS headers are set for all API responses
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Check if request is from same origin (admin panel)
  const isSameOrigin = referer && referer.includes(req.headers.host);
  
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://bella.powershellnerd.com",
    "http://localhost:3000",
    "http://localhost:3001"
  ];
  
  // Allow same-origin requests or requests from allowed origins
  if (isSameOrigin || !origin || allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }
  next();
});

// Handle preflight requests for all API routes
app.options('/api/*', (req, res) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Check if request is from same origin (admin panel)
  const isSameOrigin = referer && referer.includes(req.headers.host);
  
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://bella.powershellnerd.com",
    "http://localhost:3000",
    "http://localhost:3001"
  ];
  
  if (isSameOrigin || !origin || allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  }
  res.sendStatus(200);
});

// Test endpoint to debug CORS
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS test successful',
    headers: req.headers,
    origin: req.headers.origin
  });
});

// API Routes - Updated CORS configuration
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/customer-sessions', require('./src/routes/customerSessions'));
app.use('/api/tables', require('./src/routes/tables'));
app.use('/api/menu', require('./src/routes/menu'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/kitchen', require('./src/routes/kitchen'));
app.use('/api/feedback', require('./src/routes/feedback'));
app.use('/api/categories', require('./src/routes/categories')); // Public route

// Admin routes (protected)
app.use('/api/admin/menu', require('./src/routes/admin/menu'));
app.use('/api/admin/inventory', require('./src/routes/admin/Inventory'));
app.use('/api/admin/analytics', require('./src/routes/admin/analytics'));
app.use('/api/admin/users', require('./src/routes/admin/users')); // Keep for backward compatibility
app.use('/api/admin/tables', require('./src/routes/admin/tables'));
app.use('/api/admin/table-status-rules', require('./src/routes/admin/tableStatusRules'));
app.use('/api/admin/table-service-history', require('./src/routes/admin/tableServiceHistory'));
app.use('/api/admin/categories', require('./src/routes/admin/categories'));
app.use('/api/admin/ingredients', require('./src/routes/admin/ingredients'));
app.use('/api/admin/recipes', require('./src/routes/admin/recipes'));
app.use('/api/admin/combos', require('./src/routes/admin/combos'));
app.use('/api/admin/pricing-rules', require('./src/routes/admin/pricingRules'));
app.use('/api/admin/stock', require('./src/routes/admin/stock'));
app.use('/api/admin/menu-analytics', require('./src/routes/admin/menuAnalytics'));
app.use('/api/admin/channels', require('./src/routes/admin/channels'));
app.use('/api/admin/menu-schedules', require('./src/routes/admin/menuSchedules'));

// Enhanced team management routes (replacing the users route functionality)
app.use('/api/admin/team', require('./src/routes/team'));
app.use('/api/admin/shifts', require('./src/routes/shifts'));
app.use('/api/admin/roles', require('./src/routes/roles'));

// Notification registration endpoint
app.post('/api/notifications/register', async (req, res) => {
  try {
    const { token, platform, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const User = require('./src/models/User');
    
    // Update user with FCM token
    await User.findByIdAndUpdate(userId, { 
      fcmToken: token, 
      platform,
      lastTokenUpdate: new Date()
    });
    
    res.json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

// Add mobile routes if they exist
const mobileRoutes = [
  { path: '/api/mobile/kitchen', file: './src/routes/mobile/kitchen' },
  { path: '/api/mobile/waiter', file: './src/routes/mobile/waiter' },
  { path: '/api/mobile/manager', file: './src/routes/mobile/manager' }
];

mobileRoutes.forEach(route => {
  try {
    const routeModule = require(route.file);
    app.use(route.path, routeModule);
    console.log(`Mobile route loaded: ${route.path}`);
  } catch (error) {
    console.log(`Mobile route not found: ${route.path}`);
  }
});

// Error handling middleware
try {
  const errorHandler = require('./src/middleware/errorHandler');
  if (typeof errorHandler === 'function') {
    app.use(errorHandler);
  } else {
    console.log('Error handler middleware not properly exported, using default');
    // Default error handler
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }
} catch (error) {
  console.log('Error handler middleware not found, using default');
  // Default error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(), 
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Restaurant Backend API v2.0',
    docs: '/api-docs',
    health: '/health',
    adminPanel: '/admin-panel'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`Admin Panel available at: http://localhost:${PORT}/admin-panel`);
});