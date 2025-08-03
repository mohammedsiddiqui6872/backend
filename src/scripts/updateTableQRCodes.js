/**
 * Script to update QR codes for existing tables to use direct URLs
 * Run this script to update all existing tables with the new QR code format
 * 
 * Usage: node src/scripts/updateTableQRCodes.js
 */

const mongoose = require('mongoose');
const Table = require('../models/Table');
const Tenant = require('../models/Tenant');
const { generateEncryptedQRCode } = require('../utils/tableEncryption');

// Load environment variables
require('dotenv').config();

async function updateTableQRCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-ordering';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all active tenants
    const tenants = await Tenant.find({ status: 'active' });
    console.log(`Found ${tenants.length} active tenants`);

    let totalTablesUpdated = 0;

    // Process each tenant
    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.subdomain})`);
      
      // Get all tables for this tenant
      const tables = await Table.find({ 
        tenantId: tenant.tenantId,
        isActive: true 
      });
      
      console.log(`Found ${tables.length} active tables`);

      // Update each table's QR code
      for (const table of tables) {
        // Generate new QR code data
        const qrData = generateEncryptedQRCode(
          table.tenantId,
          table._id.toString(),
          table.number,
          0 // No expiry
        );

        // Create direct URL
        const directUrl = `https://${tenant.subdomain}.gritservices.ae?table=${table.number}`;

        // Update table with new QR code format
        table.qrCode = {
          code: qrData.code,
          url: directUrl, // Direct URL for QR code
          validationUrl: qrData.url, // Encrypted validation URL if needed
          customization: {
            encrypted: true,
            updatedAt: new Date()
          }
        };

        await table.save();
        console.log(`  ✓ Updated Table ${table.number} - QR URL: ${directUrl}`);
        totalTablesUpdated++;
      }
    }

    console.log(`\n✅ Successfully updated ${totalTablesUpdated} tables`);

    // Generate a sample QR code for testing
    console.log('\n📱 Sample QR Code URLs:');
    const sampleTables = await Table.find().limit(3).populate('tenantId');
    sampleTables.forEach(table => {
      if (table.qrCode && table.qrCode.url) {
        console.log(`  Table ${table.number}: ${table.qrCode.url}`);
      }
    });

  } catch (error) {
    console.error('Error updating QR codes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
updateTableQRCodes().then(() => {
  console.log('\n🎉 QR code update complete!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});