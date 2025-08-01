const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const { generateEncryptedQRCode, validateEncryptedQRCode } = require('../src/utils/tableEncryption');
require('dotenv').config();

async function testEncryptedQR() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Test 1: Generate encrypted QR code
    console.log('\n--- Test 1: Generate Encrypted QR Code ---');
    const tenantId = 'rest_mughlaimagic_001';
    const tableId = '688a9afae674a7bfadf667d8'; // Example table ID
    const tableNumber = 'T7';
    
    const qrData = generateEncryptedQRCode(tenantId, tableId, tableNumber, 0);
    console.log('Generated QR Data:');
    console.log('- Code:', qrData.code);
    console.log('- URL:', qrData.url);
    console.log('- Display:', qrData.displayCode);

    // Test 2: Validate encrypted QR code
    console.log('\n--- Test 2: Validate Encrypted QR Code ---');
    const validation = validateEncryptedQRCode(qrData.code);
    console.log('Validation Result:');
    console.log('- Valid:', validation.valid);
    console.log('- Tenant ID:', validation.tenantId);
    console.log('- Table ID:', validation.tableId);
    console.log('- Table Number:', validation.tableNumber);
    console.log('- Timestamp:', validation.timestamp);

    // Test 3: Test with invalid code
    console.log('\n--- Test 3: Test Invalid QR Code ---');
    const invalidValidation = validateEncryptedQRCode('invalid-code-here');
    console.log('Invalid Code Result:');
    console.log('- Valid:', invalidValidation.valid);
    console.log('- Error:', invalidValidation.error);

    // Test 4: Update an existing table with encrypted QR
    console.log('\n--- Test 4: Update Existing Table ---');
    const table = await Table.findOne({ tenantId, number: tableNumber });
    
    if (table) {
      const oldQR = table.qrCode?.code;
      console.log('Old QR Code:', oldQR?.substring(0, 20) + '...');
      
      // Force regeneration
      table.qrCode = null;
      await table.save();
      
      console.log('New QR Code:', table.qrCode.code.substring(0, 20) + '...');
      console.log('QR URL:', table.qrCode.url);
      console.log('Encrypted:', table.qrCode.customization?.encrypted);
    }

    // Test 5: Generate QR with expiry
    console.log('\n--- Test 5: Generate QR with Expiry ---');
    const expiringQR = generateEncryptedQRCode(tenantId, tableId, 'T-EXP', 2); // 2 hour expiry
    console.log('Expiring QR Code:', expiringQR.code.substring(0, 20) + '...');
    
    const expiryValidation = validateEncryptedQRCode(expiringQR.code);
    console.log('Expiry Time:', expiryValidation.expiry);

    console.log('\nAll tests completed!');
    process.exit(0);

  } catch (error) {
    console.error('Error testing encrypted QR:', error);
    process.exit(1);
  }
}

// Run the test
testEncryptedQR();