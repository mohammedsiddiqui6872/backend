/**
 * Test script to verify QR codes are generating correctly
 * Run: node src/scripts/testQRCodes.js
 */

const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

// Test configurations
const testTables = [
  { subdomain: 'mughlaimagic', tableNumber: '1', restaurant: 'Mughlai Magic' },
  { subdomain: 'bellavista', tableNumber: '5', restaurant: 'Bella Vista' },
  { subdomain: 'hardrockcafe', tableNumber: '10', restaurant: 'Hard Rock Cafe' }
];

async function generateTestQRCodes() {
  console.log('🔍 Testing QR Code Generation\n');
  
  // Create output directory
  const outputDir = path.join(__dirname, '../../test-qr-codes');
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}\n`);
  } catch (error) {
    console.error('Failed to create output directory:', error);
    return;
  }

  for (const table of testTables) {
    console.log(`\n🏪 ${table.restaurant} - Table ${table.tableNumber}`);
    console.log('─'.repeat(50));
    
    // Generate direct URL
    const directUrl = `https://${table.subdomain}.gritservices.ae?table=${table.tableNumber}`;
    console.log(`📱 Direct URL: ${directUrl}`);
    
    try {
      // Generate QR code
      const qrCodeOptions = {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      };
      
      // Generate as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(directUrl, qrCodeOptions);
      
      // Generate as PNG file
      const fileName = `${table.subdomain}-table-${table.tableNumber}.png`;
      const filePath = path.join(outputDir, fileName);
      await QRCode.toFile(filePath, directUrl, qrCodeOptions);
      
      console.log(`✅ QR Code saved: ${fileName}`);
      
      // Generate HTML preview
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${table.restaurant} - Table ${table.tableNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .qr-container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h1 { color: #333; margin-bottom: 10px; }
    h2 { color: #666; margin-bottom: 30px; font-weight: normal; }
    .qr-code { margin: 20px 0; }
    .url { 
      background: #f0f0f0; 
      padding: 10px 20px; 
      border-radius: 5px; 
      font-family: monospace;
      word-break: break-all;
      margin: 20px 0;
    }
    .instructions {
      margin-top: 30px;
      padding: 20px;
      background: #e8f4f8;
      border-radius: 5px;
      text-align: left;
    }
    .instructions h3 { margin-top: 0; color: #2c5aa0; }
    .instructions ol { margin: 10px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="qr-container">
    <h1>${table.restaurant}</h1>
    <h2>Table ${table.tableNumber}</h2>
    <div class="qr-code">
      <img src="${fileName}" alt="QR Code" width="300" height="300">
    </div>
    <div class="url">${directUrl}</div>
    <div class="instructions">
      <h3>Testing Instructions:</h3>
      <ol>
        <li>Print this page or display on screen</li>
        <li>Scan QR code with phone camera</li>
        <li>Should redirect to: ${directUrl}</li>
        <li>Verify table number ${table.tableNumber} is pre-filled</li>
        <li>Test ordering flow</li>
      </ol>
      <h3>Tablet Setup:</h3>
      <ol>
        <li>Open browser on tablet</li>
        <li>Navigate to: ${directUrl}</li>
        <li>Table number will be stored permanently</li>
        <li>Set tablet to kiosk mode if possible</li>
      </ol>
    </div>
  </div>
</body>
</html>`;
      
      const htmlFileName = `${table.subdomain}-table-${table.tableNumber}.html`;
      const htmlPath = path.join(outputDir, htmlFileName);
      await fs.writeFile(htmlPath, html, 'utf8');
      console.log(`📄 HTML preview: ${htmlFileName}`);
      
    } catch (error) {
      console.error(`❌ Error generating QR code:`, error.message);
    }
  }
  
  console.log(`\n✨ Test QR codes generated in: ${outputDir}`);
  console.log('\n📋 Next Steps:');
  console.log('1. Open the HTML files in a browser to preview');
  console.log('2. Print QR codes for physical testing');
  console.log('3. Test with actual devices (phones/tablets)');
  console.log('4. Verify table numbers are correctly detected');
}

// Run the test
generateTestQRCodes().catch(console.error);