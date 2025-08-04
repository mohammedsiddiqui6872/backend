// Example of updated auth.js using shared errors package
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TableSession = require('../models/TableSession');
const WaiterSession = require('../models/WaiterSession');
const TableState = require('../models/TableState');
const CustomerSession = require('../models/CustomerSession');
const { authenticate } = require('../middleware/auth');

// Import shared errors
const {
  asyncHandler,
  ValidationError,
  AuthenticationError,
  BusinessLogicError
} = require('@gritservices/shared-errors');

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working', method: req.method });
});

// Login endpoint - Updated with proper error handling
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, tableNumber } = req.body;

  // Validate input using shared errors
  if (!email || !password) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw AuthenticationError.invalidCredentials();
  }

  if (!user.isActive) {
    throw AuthenticationError.accountLocked();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Create WaiterSession for waiters (no table required)
  if (user.role === 'waiter') {
    // End any existing active sessions
    await WaiterSession.updateMany(
      { waiter: user._id, isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    );
    
    // Create new waiter session
    const waiterSession = new WaiterSession({
      waiter: user._id,
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });
    
    await waiterSession.save();
    console.log('Created waiter session:', waiterSession._id);
  }
  
  // Keep table session for backward compatibility if tableNumber provided
  if (user.role === 'waiter' && tableNumber) {
    try {
      // Create or update table session
      let tableSession = await TableSession.findOne({
        waiter: user._id,
        tableNumber: tableNumber.toString(),
        isActive: true
      });

      if (!tableSession) {
        tableSession = new TableSession({
          waiter: user._id,
          tableNumber: tableNumber.toString(),
          loginTime: new Date(),
          lastActivity: new Date(),
          isActive: true
        });
      } else {
        tableSession.lastActivity = new Date();
      }

      await tableSession.save();

      console.log('Table session created/updated:', {
        waiterId: user._id,
        tableNumber: tableNumber,
        sessionId: tableSession._id
      });
    } catch (error) {
      console.error('Error creating table session:', error);
      // Continue even if table session fails
    }
  }

  const token = jwt.sign(
    { 
      userId: user._id, 
      role: user.role,
      email: user.email,
      name: user.name,
      permissions: user.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: user.role === 'waiter' ? '8h' : '24h' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    }
  });
}));

// Logout endpoint with proper error handling
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { tableNumber } = req.body;

  // End waiter session
  if (req.user.role === 'waiter') {
    await WaiterSession.updateMany(
      { waiter: userId, isActive: true },
      { 
        $set: { 
          isActive: false, 
          logoutTime: new Date(),
          'deviceInfo.logoutType': 'manual'
        } 
      }
    );
  }

  // End table session if tableNumber provided
  if (tableNumber) {
    await TableSession.updateMany(
      { 
        waiter: userId, 
        tableNumber: tableNumber.toString(), 
        isActive: true 
      },
      { 
        $set: { 
          isActive: false,
          logoutTime: new Date()
        } 
      }
    );
  }

  res.json({ message: 'Logged out successfully' });
}));

// Admin login with tenant validation
router.post('/admin/login', asyncHandler(async (req, res) => {
  const { email, password, tenantId } = req.body;

  // Validation
  const validationErrors = [];
  if (!email) validationErrors.push({ field: 'email', message: 'Email is required' });
  if (!password) validationErrors.push({ field: 'password', message: 'Password is required' });
  if (!tenantId) validationErrors.push({ field: 'tenantId', message: 'Tenant ID is required' });

  if (validationErrors.length > 0) {
    throw new ValidationError('Validation failed', validationErrors);
  }

  // Find user
  const user = await User.findOne({ 
    email,
    tenantId,
    role: { $in: ['admin', 'manager'] }
  });

  if (!user || !(await user.comparePassword(password))) {
    throw AuthenticationError.invalidCredentials();
  }

  if (!user.isActive) {
    throw AuthenticationError.accountLocked();
  }

  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    }
  });
}));

// Get profile with error handling
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId)
    .select('-password')
    .lean();

  if (!user) {
    throw BusinessLogicError.resourceNotFound('User', req.user.userId);
  }

  res.json({ user });
}));

module.exports = router;