const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
// We don't need tenant isolation for super admin operations

// Generate a secure password reset token for super admin use
router.post('/generate-reset-token', async (req, res) => {
  try {
    const { superAdminEmail, superAdminPassword } = req.body;
    
    // Verify super admin credentials
    if (superAdminEmail !== process.env.SUPER_ADMIN_EMAIL || 
        superAdminPassword !== process.env.SUPER_ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Invalid super admin credentials' });
    }
    
    // Generate a time-limited token
    const resetToken = jwt.sign(
      { 
        purpose: 'password-reset',
        issuedAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );
    
    res.json({
      success: true,
      resetToken,
      expiresIn: '30 minutes',
      usage: 'Use this token in the password reset endpoints'
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate reset token' });
  }
});

// Reset password for a specific restaurant's admin users
router.post('/reset-restaurant-admins/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { resetToken, newPassword } = req.body;
    
    // Verify reset token
    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(403).json({ error: 'Invalid reset token' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired reset token' });
    }
    
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // No need to set tenant context - we'll query directly with tenantId
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword || 'password@123', 10);
    
    // Find and update admin users for this specific tenant
    const adminUsers = await User.find({
      tenantId: tenant.tenantId,
      role: { $in: ['admin', 'manager'] },
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    });
    
    const updatedUsers = [];
    
    for (const admin of adminUsers) {
      admin.password = hashedPassword;
      admin.isActive = true;
      await admin.save();
      
      updatedUsers.push({
        email: admin.email,
        name: admin.name || 'No name',
        role: admin.role
      });
    }
    
    res.json({
      success: true,
      restaurant: {
        name: tenant.name,
        subdomain: tenant.subdomain
      },
      totalUpdated: updatedUsers.length,
      updatedUsers,
      newPassword: newPassword || 'password@123'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset passwords',
      details: error.message 
    });
  }
});

// Reset password for a specific admin user in a restaurant
router.post('/reset-restaurant-admin/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { resetToken, newPassword, adminEmail } = req.body;
    
    // Verify reset token
    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(403).json({ error: 'Invalid reset token' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired reset token' });
    }
    
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // No need to set tenant context - we'll query directly with tenantId
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Find and update the specific admin user
    // Use setOptions to skip tenant filter since we're operating as super admin
    const adminUser = await User.findOne({
      tenantId: tenant.tenantId,
      email: adminEmail || `admin@${subdomain}.ae`
    }).setOptions({ skipTenantFilter: true });
    
    if (!adminUser) {
      return res.status(404).json({ 
        error: 'Admin user not found',
        details: `No user found with email: ${adminEmail || `admin@${subdomain}.ae`}`
      });
    }
    
    // Update the password
    adminUser.password = hashedPassword;
    adminUser.isActive = true;
    await adminUser.save();
    
    res.json({
      success: true,
      restaurant: {
        name: tenant.name,
        subdomain: tenant.subdomain
      },
      adminEmail: adminUser.email,
      updatedUser: {
        email: adminUser.email,
        name: adminUser.name || 'No name',
        role: adminUser.role
      },
      message: `Password reset successfully for ${adminUser.email}`
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      details: error.message 
    });
  }
});

// Get list of all restaurants for individual reset
router.get('/list-restaurants', async (req, res) => {
  try {
    const { resetToken } = req.query;
    
    // Verify reset token
    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        return res.status(403).json({ error: 'Invalid reset token' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired reset token' });
    }
    
    // Get all active tenants
    const tenants = await Tenant.find({ isActive: true })
      .select('name subdomain tenantId')
      .sort('name');
    
    const restaurantList = await Promise.all(tenants.map(async (tenant) => {
      // Count admin users directly with tenantId
      const adminCount = await User.countDocuments({
        tenantId: tenant.tenantId,
        role: { $in: ['admin', 'manager'] }
      }).setOptions({ skipTenantFilter: true });
      
      return {
        name: tenant.name,
        subdomain: tenant.subdomain,
        adminCount,
        resetEndpoint: `/api/secure-reset/reset-restaurant-admins/${tenant.subdomain}`
      };
    }));
    
    res.json({
      success: true,
      totalRestaurants: restaurantList.length,
      restaurants: restaurantList
    });
    
  } catch (error) {
    console.error('List restaurants error:', error);
    res.status(500).json({ error: 'Failed to list restaurants' });
  }
});

module.exports = router;