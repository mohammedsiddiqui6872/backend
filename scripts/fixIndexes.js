// Script to fix MongoDB indexes for multi-tenancy
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop problematic unique indexes
    console.log('\nDropping global unique indexes...');
    
    try {
      await db.collection('categories').dropIndex('name_1');
      console.log('✓ Dropped categories.name unique index');
    } catch (e) {
      console.log('- categories.name index not found or already dropped');
    }

    try {
      await db.collection('categories').dropIndex('slug_1');
      console.log('✓ Dropped categories.slug unique index');
    } catch (e) {
      console.log('- categories.slug index not found or already dropped');
    }

    try {
      await db.collection('tables').dropIndex('number_1');
      console.log('✓ Dropped tables.number unique index');
    } catch (e) {
      console.log('- tables.number index not found or already dropped');
    }

    try {
      await db.collection('menuitems').dropIndex('id_1');
      console.log('✓ Dropped menuitems.id unique index');
    } catch (e) {
      console.log('- menuitems.id index not found or already dropped');
    }

    try {
      await db.collection('users').dropIndex('email_1');
      console.log('✓ Dropped users.email unique index');
    } catch (e) {
      console.log('- users.email index not found or already dropped');
    }

    // Create compound unique indexes (unique per tenant)
    console.log('\nCreating tenant-specific unique indexes...');

    await db.collection('categories').createIndex(
      { tenantId: 1, name: 1 },
      { unique: true, name: 'tenantId_name_unique' }
    );
    console.log('✓ Created categories tenant-specific name index');

    await db.collection('categories').createIndex(
      { tenantId: 1, slug: 1 },
      { unique: true, name: 'tenantId_slug_unique' }
    );
    console.log('✓ Created categories tenant-specific slug index');

    await db.collection('tables').createIndex(
      { tenantId: 1, number: 1 },
      { unique: true, name: 'tenantId_number_unique' }
    );
    console.log('✓ Created tables tenant-specific number index');

    await db.collection('menuitems').createIndex(
      { tenantId: 1, id: 1 },
      { unique: true, name: 'tenantId_id_unique' }
    );
    console.log('✓ Created menuitems tenant-specific id index');

    await db.collection('users').createIndex(
      { tenantId: 1, email: 1 },
      { unique: true, name: 'tenantId_email_unique' }
    );
    console.log('✓ Created users tenant-specific email index');

    // Create performance indexes
    console.log('\nCreating performance indexes...');

    await db.collection('orders').createIndex({ tenantId: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ tenantId: 1, status: 1 });
    await db.collection('menuitems').createIndex({ tenantId: 1, category: 1 });
    await db.collection('menuitems').createIndex({ tenantId: 1, available: 1 });
    await db.collection('users').createIndex({ tenantId: 1, role: 1 });
    
    console.log('✓ Created performance indexes');

    console.log('\n✅ All indexes fixed successfully!');

  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixIndexes();