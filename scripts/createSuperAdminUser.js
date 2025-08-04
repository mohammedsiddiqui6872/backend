const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Temporarily disable tenant isolation for this script
process.env.DISABLE_TENANT_ISOLATION = 'true';

async function createSuperAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import User model after connection
    const User = require('../src/models/User');

    // Define the GRITSERVICES super admin user
    const superAdminData = {
      email: 'gritservices@gritservices.ae',
      password: 'Musa@786',
      name: 'GRIT Services Super Admin',
      role: 'super_admin',
      isActive: true,
      permissions: [
        'menu.view', 'menu.edit', 'menu.delete',
        'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel',
        'analytics.view', 'analytics.export',
        'users.view', 'users.manage', 'users.delete',
        'tables.view', 'tables.manage',
        'inventory.view', 'inventory.manage',
        'payments.view', 'payments.process', 'payments.refund',
        'settings.view', 'settings.manage',
        'shifts.view', 'shifts.manage', 'shifts.approve'
      ],
      isSystemUser: true,
      metadata: {
        createdBy: 'system',
        purpose: 'Service provider master access for SaaS portal',
        cannotBeDeleted: true
      }
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 10);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: superAdminData.email.toLowerCase()
    }).setOptions({ skipTenantFilter: true });

    if (existingUser) {
      console.log('Super admin user already exists, updating...');
      existingUser.role = 'super_admin';
      existingUser.isActive = true;
      existingUser.permissions = superAdminData.permissions;
      existingUser.isSystemUser = true;
      existingUser.metadata = superAdminData.metadata;
      existingUser.password = hashedPassword;
      existingUser.tenantId = undefined; // Remove tenantId for super admin
      await existingUser.save();
      console.log('Updated super admin user');
    } else {
      // Create new super admin user without tenantId
      const newSuperAdmin = new User({
        ...superAdminData,
        password: hashedPassword
        // No tenantId for super admin
      });

      // Save with skipTenantFilter option
      await newSuperAdmin.save();
      console.log('Created GRITSERVICES super admin user');
    }

    console.log('\nSuper Admin Credentials:');
    console.log('- Email: GRITSERVICES@gritservices.ae');
    console.log('- Password: Musa@786');
    console.log('- Role: Super Admin');
    console.log('- Access: SaaS Portal (portal.gritservices.ae)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createSuperAdminUser();