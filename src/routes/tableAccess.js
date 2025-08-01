const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { validateEncryptedQRCode } = require('../utils/tableEncryption');

/**
 * Access table via encrypted QR code
 * This is a public route that doesn't require authentication
 */
router.get('/t/:encryptedCode', async (req, res) => {
  try {
    const { encryptedCode } = req.params;
    
    // Validate the encrypted code
    const validation = validateEncryptedQRCode(encryptedCode);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid QR code'
      });
    }
    
    // Find the table
    const table = await Table.findOne({
      _id: validation.tableId,
      tenantId: validation.tenantId,
      isActive: true
    }).select('number displayName status type capacity tenantId');
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    // Get tenant info for redirect
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findOne({
      tenantId: validation.tenantId,
      status: 'active'
    }).select('subdomain name');
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }
    
    // Return table info and redirect URL
    res.json({
      success: true,
      table: {
        id: table._id,
        number: table.number,
        displayName: table.displayName,
        status: table.status,
        capacity: table.capacity
      },
      restaurant: {
        name: tenant.name,
        subdomain: tenant.subdomain
      },
      redirectUrl: `https://${tenant.subdomain}.gritservices.ae/?table=${table.number}`
    });
    
  } catch (error) {
    console.error('Error accessing table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access table'
    });
  }
});

/**
 * Validate encrypted QR code
 * Used by frontend to check if QR code is valid before redirecting
 */
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'QR code is required'
      });
    }
    
    const validation = validateEncryptedQRCode(code);
    
    res.json({
      success: validation.valid,
      ...(validation.valid ? {
        tenantId: validation.tenantId,
        tableNumber: validation.tableNumber,
        expiry: validation.expiry
      } : {
        error: validation.error
      })
    });
    
  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate QR code'
    });
  }
});

module.exports = router;