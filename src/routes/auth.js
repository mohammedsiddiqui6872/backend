// src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TableSession = require('../models/TableSession');
const WaiterSession = require('../models/WaiterSession');
const TableState = require('../models/TableState');
const CustomerSession = require('../models/CustomerSession');
const { authenticate } = require('../middleware/auth');


// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working', method: req.method });
});

// Test POST endpoint
router.post('/test-post', (req, res) => {
  res.json({ 
    message: 'POST is working', 
    body: req.body,
    headers: req.headers['content-type']
  });
});

// Login endpoint - Updated for new session management
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body); // Debug log
    
    const { email, password, tableNumber } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // NEW: Create WaiterSession for waiters (no table required)
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
    
    // OLD: Keep table session for backward compatibility if tableNumber provided
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

        // Emit socket event for real-time updates
        if (req.app.get('io')) {
          req.app.get('io').emit('waiter-table-login', {
            waiterId: user._id,
            waiterName: user.name,
            tableNumber: tableNumber.toString(),
            loginTime: tableSession.loginTime
          });
        }
      } catch (sessionError) {
        console.error('Error creating table session:', sessionError);
        // Don't fail login if session creation fails
      }
    }

    // Generate token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      tableNumber: tableNumber // Include in response
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin login endpoint - for admin panel access
router.post('/admin/login', async (req, res) => {
  try {
    console.log('Admin login attempt:', req.body);
    
    const { email, password } = req.body;
    
    // Get subdomain from query params or headers
    const subdomain = req.query.subdomain || req.headers['x-tenant-subdomain'];
    console.log('Admin login subdomain:', subdomain);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Skip tenant filter for admin login - we'll verify tenant after
    const user = await User.findOne({ email }).setOptions({ skipTenantFilter: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin or manager role required.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    // CRITICAL: Verify tenant match
    if (subdomain && user.tenantId) {
      // Get tenant from subdomain
      const Tenant = require('../models/Tenant');
      const tenant = await Tenant.findOne({ subdomain: subdomain });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      
      // Check if user belongs to this tenant
      if (user.tenantId !== tenant.tenantId) {
        // Don't log sensitive tenant IDs in production
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token with tenant info
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user with active table sessions
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Get active table sessions for waiters
    let activeTables = [];
    if (user.role === 'waiter') {
      const sessions = await TableSession.find({
        waiter: user._id,
        isActive: true
      }).select('tableNumber loginTime lastActivity');
      
      activeTables = sessions.map(s => s.tableNumber);
    }
    
    res.json({ 
      user: user,
      activeTables: activeTables
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile - THIS IS THE MISSING ENDPOINT
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Include tenant information if available
    let tenantInfo = null;
    if (req.tenant) {
      tenantInfo = {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name,
        subdomain: req.tenant.subdomain,
        logo: req.tenant.settings?.logo,
        primaryColor: req.tenant.settings?.primaryColor
      };
    }

    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      tenant: tenantInfo
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get table session for a specific table
router.get('/table-session/:tableNumber', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    const tableSession = await TableSession.findOne({
      tableNumber: tableNumber.toString(),
      isActive: true
    }).populate('waiter', 'name email role');
    
    if (!tableSession) {
      return res.json({ session: null });
    }
    
    res.json({ session: tableSession });
  } catch (error) {
    console.error('Error fetching table session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout from specific table (for waiters)
router.post('/logout-table', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.body;
    
    if (req.user.role !== 'waiter') {
      return res.status(403).json({ error: 'Only waiters can logout from tables' });
    }
    
    const tableSession = await TableSession.findOne({
      waiter: req.user._id,
      tableNumber: tableNumber.toString(),
      isActive: true
    });
    
    if (!tableSession) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    tableSession.isActive = false;
    tableSession.logoutTime = new Date();
    await tableSession.save();
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('waiter-table-logout', {
        waiterId: req.user._id,
        tableNumber: tableNumber.toString()
      });
    }
    
    res.json({ 
      success: true, 
      message: `Logged out from table ${tableNumber}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: Export the router
// NEW ROUTES FOR TABLE MANAGEMENT

// Get waiter's assigned tables
router.get('/my-tables', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'waiter') {
      return res.status(403).json({ error: 'Only waiters can access this endpoint' });
    }
    
    // Get waiter's active session
    const waiterSession = await WaiterSession.getActiveSession(req.user._id);
    if (!waiterSession) {
      return res.status(401).json({ error: 'No active waiter session found' });
    }
    
    // Get assigned tables
    const tables = await TableState.getTablesByWaiter(req.user._id);
    
    // Get active orders for each table
    const tablesWithDetails = await Promise.all(tables.map(async (table) => {
      const Order = require('../models/Order');
      const orders = await Order.find({
        tableNumber: table.tableNumber,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        paymentStatus: { $ne: 'paid' }
      }).sort('-createdAt');
      
      return {
        ...table.toObject(),
        activeOrders: orders
      };
    }));
    
    res.json({
      waiterSession,
      tables: tablesWithDetails
    });
  } catch (error) {
    console.error('Error fetching waiter tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request access to a table
router.post('/request-table', authenticate, async (req, res) => {
  try {
    const { tableNumber, reason } = req.body;
    
    if (req.user.role !== 'waiter') {
      return res.status(403).json({ error: 'Only waiters can request tables' });
    }
    
    // Check if table exists
    const tableState = await TableState.findOne({ tableNumber });
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check if already assigned
    if (tableState.currentWaiter?.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You are already assigned to this table' });
    }
    
    // Add as assisting waiter
    await tableState.addAssistingWaiter(req.user._id);
    
    // Update waiter session
    const waiterSession = await WaiterSession.getActiveSession(req.user._id);
    if (waiterSession) {
      await waiterSession.addTable(tableNumber);
    }
    
    res.json({
      success: true,
      message: `Access granted to table ${tableNumber}`,
      table: tableState
    });
  } catch (error) {
    console.error('Error requesting table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout endpoint - Updated for new session management
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'waiter') {
      // Check for active waiter session
      const waiterSession = await WaiterSession.findOne({
        waiter: req.user._id,
        isActive: true
      });
      
      if (waiterSession) {
        // Check if waiter has active customer sessions
        const activeTables = waiterSession.assignedTables || [];
        
        for (const tableNumber of activeTables) {
          const activeCustomerSession = await CustomerSession.findOne({
            tableNumber,
            isActive: true
          });
          
          if (activeCustomerSession) {
            return res.status(400).json({ 
              error: 'Cannot logout - active customer sessions exist on your tables',
              tables: activeTables
            });
          }
        }
        
        // End waiter session
        waiterSession.isActive = false;
        waiterSession.logoutTime = new Date();
        await waiterSession.save();
        
        // Clear table assignments
        await TableState.updateMany(
          { currentWaiter: req.user._id },
          { $set: { currentWaiter: null } }
        );
      }
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handover table to another waiter
router.post('/handover-table', authenticate, async (req, res) => {
  try {
    const { tableNumber, toWaiterId, reason } = req.body;
    
    if (req.user.role !== 'waiter') {
      return res.status(403).json({ error: 'Only waiters can handover tables' });
    }
    
    // Get table state
    const tableState = await TableState.findOne({ tableNumber });
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Verify current waiter
    if (tableState.currentWaiter?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not the primary waiter for this table' });
    }
    
    // Perform handover
    await tableState.handoverTable(req.user._id, toWaiterId, req.user._id);
    
    // Update waiter sessions
    const fromSession = await WaiterSession.getActiveSession(req.user._id);
    const toSession = await WaiterSession.getActiveSession(toWaiterId);
    
    if (fromSession) {
      await fromSession.removeTable(tableNumber);
    }
    if (toSession) {
      await toSession.addTable(tableNumber);
    }
    
    // Update customer session if exists
    const CustomerSession = require('../models/CustomerSession');
    const activeCustomerSession = await CustomerSession.findOne({
      tableNumber,
      isActive: true
    });
    
    if (activeCustomerSession) {
      await activeCustomerSession.handoverToWaiter(req.user._id, toWaiterId, reason);
    }
    
    res.json({
      success: true,
      message: `Table ${tableNumber} handed over successfully`,
      table: tableState
    });
  } catch (error) {
    console.error('Error handing over table:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;