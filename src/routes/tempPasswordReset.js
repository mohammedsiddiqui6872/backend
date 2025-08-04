const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Temporary endpoint to reset all admin passwords
// IMPORTANT: Remove this file after use!
router.post('/reset-all-admin-passwords', async (req, res) => {
  try {
    // Security check - require a secret key
    const { secretKey } = req.body;
    
    // You must pass this exact key to execute the reset
    if (secretKey !== 'emergency-reset-2024') {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    // Get all active tenants
    const tenants = await Tenant.find({ isActive: true });
    
    const newPassword = 'password@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    let totalUpdated = 0;
    const results = [];
    
    // Process each tenant
    for (const tenant of tenants) {
      const tenantResult = {
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        adminUsers: []
      };
      
      // Find all admin and manager users for this tenant
      const adminUsers = await User.find({
        tenantId: tenant.tenantId,
        role: { $in: ['admin', 'manager'] },
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });
      
      // Update each admin user's password
      for (const admin of adminUsers) {
        admin.password = hashedPassword;
        admin.isActive = true;
        await admin.save();
        
        tenantResult.adminUsers.push({
          email: admin.email,
          name: admin.name || 'No name'
        });
        totalUpdated++;
      }
      
      results.push(tenantResult);
    }
    
    res.json({
      success: true,
      message: 'All admin passwords have been reset',
      newPassword: 'password@123',
      totalUpdated,
      results
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset passwords',
      details: error.message 
    });
  }
});

// Debug endpoint to check users for a specific tenant
router.get('/check-tenant-users/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Find all users for this tenant
    const users = await User.find({ 
      tenantId: tenant.tenantId 
    }).select('email name role isActive createdAt');
    
    res.json({
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        tenantId: tenant.tenantId
      },
      totalUsers: users.length,
      users: users.map(user => ({
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error checking tenant users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;