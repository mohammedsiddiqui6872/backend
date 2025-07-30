const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Super admin authentication middleware
const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a super admin
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    req.adminId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Login for super admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check super admin credentials
    if (email === 'admin@gritservices.ae' && password === process.env.SUPER_ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: 'super_admin_001', email, role: 'super_admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          email,
          role: 'super_admin',
          name: 'Super Admin'
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tenants
router.get('/tenants', superAdminAuth, async (req, res) => {
  try {
    const tenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .lean();
    
    // Add usage stats for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, orderCount, todayOrders] = await Promise.all([
          User.countDocuments({ tenantId: tenant.tenantId }),
          Order.countDocuments({ tenantId: tenant.tenantId }),
          Order.countDocuments({
            tenantId: tenant.tenantId,
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
          })
        ]);
        
        return {
          ...tenant,
          stats: {
            users: userCount,
            totalOrders: orderCount,
            todayOrders
          }
        };
      })
    );
    
    res.json(tenantsWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/stats', superAdminAuth, async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalOrders,
      todayOrders,
      totalUsers
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Order.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      User.countDocuments()
    ]);
    
    // Calculate MRR
    const tenants = await Tenant.find({ status: 'active' });
    const mrr = tenants.reduce((sum, tenant) => {
      const planPrices = { trial: 0, basic: 29, pro: 79, enterprise: 199 };
      return sum + (planPrices[tenant.plan] || 0);
    }, 0);
    
    res.json({
      totalTenants,
      activeTenants,
      totalOrders,
      todayOrders,
      totalUsers,
      mrr,
      churnRate: 0, // Calculate based on historical data
      growthRate: 0 // Calculate based on historical data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new tenant
router.post('/tenants', superAdminAuth, async (req, res) => {
  try {
    const {
      name,
      subdomain,
      owner,
      plan = 'trial',
      address
    } = req.body;
    
    // Check if subdomain already exists
    const existing = await Tenant.findOne({ subdomain });
    if (existing) {
      return res.status(400).json({ error: 'Subdomain already taken' });
    }
    
    // Create tenant
    const tenant = new Tenant({
      tenantId: `rest_${subdomain}_${Date.now()}`,
      name,
      subdomain,
      plan,
      owner,
      address,
      metadata: {
        onboardedBy: req.adminId
      }
    });
    
    await tenant.save();
    
    // Create admin user for the tenant
    const adminUser = new User({
      tenantId: tenant.tenantId,
      email: owner.email,
      password: await bcrypt.hash('changeme123', 10),
      name: owner.name,
      role: 'admin',
      isActive: true
    });
    
    await adminUser.save();
    
    // Initialize default data
    await initializeTenantData(tenant.tenantId);
    
    res.status(201).json({
      success: true,
      tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant
router.put('/tenants/:tenantId', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      req.body,
      { new: true }
    );
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend/activate tenant
router.patch('/tenants/:tenantId/status', superAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      { status },
      { new: true }
    );
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({
      success: true,
      tenant,
      message: `Tenant ${status === 'active' ? 'activated' : 'suspended'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tenant details
router.get('/tenants/:tenantId', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Get detailed stats
    const [users, orders, revenue] = await Promise.all([
      User.find({ tenantId: tenant.tenantId }).select('name email role createdAt'),
      Order.find({ tenantId: tenant.tenantId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber total status createdAt'),
      Order.aggregate([
        { $match: { tenantId: tenant.tenantId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    
    res.json({
      tenant,
      users,
      recentOrders: orders,
      totalRevenue: revenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to initialize tenant data
async function initializeTenantData(tenantId) {
  try {
    const Category = require('../models/Category');
    const Table = require('../models/Table');
    
    // Create default categories
    const categories = [
      { tenantId, name: 'Appetizers', slug: 'appetizers', displayOrder: 1 },
      { tenantId, name: 'Main Courses', slug: 'main-courses', displayOrder: 2 },
      { tenantId, name: 'Desserts', slug: 'desserts', displayOrder: 3 },
      { tenantId, name: 'Beverages', slug: 'beverages', displayOrder: 4 }
    ];
    
    await Category.insertMany(categories);
    
    // Create default tables
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      tables.push({
        tenantId,
        number: String(i),
        capacity: 4,
        status: 'available'
      });
    }
    
    await Table.insertMany(tables);
    
    console.log(`Initialized data for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Error initializing tenant data:', error);
  }
}

module.exports = router;