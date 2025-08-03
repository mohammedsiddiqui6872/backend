/**
 * Public route for QR code information
 * This helps display QR code format and testing
 */

const express = require('express');
const router = express.Router();

/**
 * Get QR code format information
 * Public endpoint to help understand QR code structure
 */
router.get('/qr-format', (req, res) => {
  const exampleSubdomain = req.query.subdomain || 'restaurant';
  const exampleTable = req.query.table || '5';
  
  res.json({
    format: {
      direct: {
        description: 'Direct URL format for guest access',
        example: `https://${exampleSubdomain}.gritservices.ae?table=${exampleTable}`,
        usage: 'Scan QR code → Opens restaurant menu → Table number pre-filled'
      },
      encrypted: {
        description: 'Encrypted validation format (internal use)',
        example: 'https://api.gritservices.ae/table-access/t/{encryptedCode}',
        usage: 'Used for validation and security checks'
      }
    },
    flow: [
      '1. Customer scans QR code at table',
      '2. QR code contains direct URL: https://[restaurant].gritservices.ae?table=[number]',
      '3. Frontend detects table parameter',
      '4. Customer sees menu for their specific table',
      '5. All orders are linked to this table number'
    ],
    tabletMode: {
      description: 'For fixed tablets at tables',
      setup: 'Navigate to URL with table parameter once',
      persistence: 'Table number stored in localStorage',
      example: `https://${exampleSubdomain}.gritservices.ae?table=${exampleTable}`
    }
  });
});

/**
 * Test QR code generation
 * Helps verify QR codes are generating correctly
 */
router.get('/test-qr/:subdomain/:tableNumber', async (req, res) => {
  try {
    const { subdomain, tableNumber } = req.params;
    const QRCode = require('qrcode');
    
    // Generate direct URL
    const directUrl = `https://${subdomain}.gritservices.ae?table=${tableNumber}`;
    
    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(directUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      subdomain,
      tableNumber,
      url: directUrl,
      qrCode: qrCodeDataUrl,
      instructions: [
        'Save the QR code image',
        'Print and place at table',
        'Test by scanning with phone camera',
        `Should open: ${directUrl}`
      ]
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate test QR code',
      message: error.message 
    });
  }
});

module.exports = router;