const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Debug endpoint to check login issue
router.post('/debug-login', async (req, res) => {
  try {
    const { email, password, subdomain } = req.body;
    
    // Find tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.json({ error: 'Tenant not found', subdomain });
    }
    
    // Find user with tenant filter disabled
    const user = await User.findOne({
      email,
      tenantId: tenant.tenantId
    }).setOptions({ skipTenantFilter: true });
    
    if (!user) {
      // Try to find any user with this email
      const anyUser = await User.findOne({ email }).setOptions({ skipTenantFilter: true });
      return res.json({ 
        error: 'User not found in tenant',
        tenant: tenant.name,
        tenantId: tenant.tenantId,
        userExistsElsewhere: !!anyUser
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    // Also test with the password directly (in case it wasn't hashed)
    const isDirectMatch = password === user.password;
    
    res.json({
      user: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        tenantId: user.tenantId
      },
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        tenantId: tenant.tenantId
      },
      passwordCheck: {
        bcryptValid: isValidPassword,
        directMatch: isDirectMatch,
        passwordLength: user.password?.length,
        passwordFormat: user.password?.substring(0, 10) + '...',
        isBcryptFormat: user.password?.startsWith('$2a$') || user.password?.startsWith('$2b$')
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug error',
      message: error.message 
    });
  }
});

// Reset password with proper hashing
router.post('/fix-password', async (req, res) => {
  try {
    const { email, newPassword, subdomain } = req.body;
    
    // Security check
    if (!req.body.confirmFix || req.body.confirmFix !== 'yes-fix-it') {
      return res.status(400).json({ error: 'Safety check failed' });
    }
    
    // Find tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Find and update user
    const user = await User.findOne({
      email,
      tenantId: tenant.tenantId
    }).setOptions({ skipTenantFilter: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash the password properly
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isActive = true;
    await user.save();
    
    // Verify it worked
    const isValid = await bcrypt.compare(newPassword, user.password);
    
    res.json({
      success: true,
      email: user.email,
      passwordUpdated: true,
      verificationPassed: isValid
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Fix failed',
      message: error.message 
    });
  }
});

module.exports = router;