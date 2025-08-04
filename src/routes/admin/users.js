const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');

router.use(authenticate);
router.use(authorize('admin'));
router.use(enterpriseTenantIsolation);

// Get all users
router.get('/', async (req, res) => {
  try {
    console.log('\n=== ADMIN USERS ENDPOINT DEBUG ===');
    console.log('Request tenant:', req.tenant ? req.tenant.name : 'NO TENANT');
    console.log('Request tenantId:', req.tenantId);
    console.log('Request tenant from middleware:', req.tenant ? req.tenant.tenantId : 'NO TENANT ID');
    
    const { role, isActive } = req.query;
    const query = { tenantId: req.tenant.tenantId };
    
    console.log('Query filter:', JSON.stringify(query, null, 2));
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    console.log('Final query:', JSON.stringify(query, null, 2));

    const users = await User.find(query)
      .select('-password')
      .sort('name');

    console.log(`Users found: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Tenant: ${user.tenantId}`);
    });
    console.log('=== END ADMIN USERS ENDPOINT DEBUG ===\n');

    res.json(users);
  } catch (error) {
    console.error('Admin users endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const userData = req.body;
    
    // Set default permissions based on role
    const rolePermissions = {
      admin: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
      manager: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view'],
      chef: ['orders.view', 'menu.view'],
      waiter: ['orders.view', 'orders.edit', 'menu.view'],
      cashier: ['orders.view', 'analytics.view']
    };

    userData.permissions = rolePermissions[userData.role] || [];
    userData.tenantId = req.tenant.tenantId;

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, tenantId: req.tenant.tenantId },
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password separately if provided
    if (password) {
      user.password = password;
      await user.save();
    }

    res.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user status
router.patch('/:userId/status', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, tenantId: req.tenant.tenantId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive
      },
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, tenantId: req.tenant.tenantId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', tenantId: req.tenant.tenantId, _id: { $ne: user._id } });
      if (adminCount === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findOneAndDelete({ _id: req.params.userId, tenantId: req.tenant.tenantId });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user performance stats
router.get('/:userId/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.params.userId;

    const Order = require('../../models/Order');
    
    const query = {
      tenantId: req.tenant.tenantId,
      $or: [
        { waiter: userId },
        { chef: userId }
      ]
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find(query);

    const stats = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'paid').length,
      totalRevenue: orders.reduce((sum, o) => 
        o.status === 'paid' ? sum + o.total : sum, 0
      ),
      averageOrderValue: orders.length ? 
        orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
      averagePreparationTime: orders.filter(o => o.actualPreparationTime).reduce((sum, o) => 
        sum + o.actualPreparationTime, 0
      ) / orders.filter(o => o.actualPreparationTime).length || 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;