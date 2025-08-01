// Migration script to update existing tables to new schema
require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const crypto = require('crypto');

async function migrateTables() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-system');
    console.log('✅ Connected to database\n');

    // Get all existing tables directly from collection to avoid validation
    const db = mongoose.connection.db;
    const tablesCollection = db.collection('tables');
    const existingTables = await tablesCollection.find({}).toArray();

    console.log(`Found ${existingTables.length} tables to migrate\n`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const oldTable of existingTables) {
      try {
        console.log(`Migrating table ${oldTable.number} for tenant ${oldTable.tenantId}...`);

        // Check if already migrated
        if (oldTable.type && oldTable.shape && oldTable.location) {
          console.log(`  ✓ Table ${oldTable.number} already migrated`);
          migratedCount++;
          continue;
        }

        // Prepare update data with new required fields
        const updateData = {
          // Add missing required fields
          type: oldTable.type || 'regular',
          shape: oldTable.shape || 'square',
          location: oldTable.location || {
            floor: 'main',
            section: 'dining',
            x: 0,
            y: 0,
            rotation: 0
          },
          features: oldTable.features || [],
          isCombinable: oldTable.isCombinable || false,
          combinesWith: oldTable.combinesWith || [],
          metadata: oldTable.metadata || {}
        };

        // Generate QR code if missing
        if (!oldTable.qrCode || !oldTable.qrCode.code) {
          const code = `${oldTable.tenantId}-${crypto.randomBytes(12).toString('hex')}`;
          updateData.qrCode = {
            code: code,
            url: `${process.env.FRONTEND_URL || 'https://app.gritservices.ae'}/table/${code}`,
            customization: {}
          };
        }

        // Add display name if missing
        if (!oldTable.displayName) {
          updateData.displayName = `Table ${oldTable.number}`;
        }

        // Add capacity fields if missing
        if (!oldTable.minCapacity) {
          updateData.minCapacity = Math.max(1, Math.floor((oldTable.capacity || 4) * 0.5));
        }
        if (!oldTable.maxCapacity) {
          updateData.maxCapacity = Math.ceil((oldTable.capacity || 4) * 1.5);
        }

        // Update the table
        await tablesCollection.updateOne(
          { _id: oldTable._id },
          { 
            $set: updateData,
            $setOnInsert: { createdAt: new Date() },
            $currentDate: { updatedAt: true }
          }
        );

        console.log(`  ✓ Migrated table ${oldTable.number}`);
        migratedCount++;

      } catch (error) {
        console.error(`  ✗ Error migrating table ${oldTable.number}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Successfully migrated: ${migratedCount} tables`);
    console.log(`   - Errors: ${errorCount} tables`);

    // Verify migration by loading through Mongoose
    console.log('\nVerifying migration...');
    const verifiedTables = await Table.find({}).limit(5);
    console.log(`✓ Successfully loaded ${verifiedTables.length} tables through Mongoose model`);

    // Show sample table
    if (verifiedTables.length > 0) {
      console.log('\nSample migrated table:');
      const sample = verifiedTables[0];
      console.log(`  - Number: ${sample.number}`);
      console.log(`  - Type: ${sample.type}`);
      console.log(`  - Shape: ${sample.shape}`);
      console.log(`  - Location: ${JSON.stringify(sample.location)}`);
      console.log(`  - QR Code: ${sample.qrCode?.code ? 'Generated' : 'Missing'}`);
    }

  } catch (error) {
    console.error('❌ Migration Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run migration
console.log('🔄 Starting table migration to new schema...\n');
migrateTables();