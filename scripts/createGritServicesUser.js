const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function createGritServicesUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define the GRITSERVICES user details
    const gritServicesUser = {
      email: 'GRITSERVICES@gritservices.ae',
      password: 'Musa@786',
      name: 'GRIT Services Admin',
      role: 'admin',
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
      ], // Full permissions
      isSystemUser: true, // Special flag to prevent deletion
      metadata: {
        createdBy: 'system',
        purpose: 'Service provider master access',
        cannotBeDeleted: true
      }
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(gritServicesUser.password, 10);

    // Get all tenants
    const tenants = await Tenant.find();
    console.log(`Found ${tenants.length} tenants`);

    // Create GRITSERVICES user for each tenant
    for (const tenant of tenants) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          tenantId: tenant.tenantId,
          email: gritServicesUser.email
        });

        if (existingUser) {
          console.log(`User already exists for tenant: ${tenant.name} (${tenant.subdomain})`);
          // Update to ensure it has all required properties
          existingUser.role = 'admin';
          existingUser.isActive = true;
          existingUser.permissions = [
            'menu.view', 'menu.edit', 'menu.delete',
            'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel',
            'analytics.view', 'analytics.export',
            'users.view', 'users.manage', 'users.delete',
            'tables.view', 'tables.manage',
            'inventory.view', 'inventory.manage',
            'payments.view', 'payments.process', 'payments.refund',
            'settings.view', 'settings.manage',
            'shifts.view', 'shifts.manage', 'shifts.approve'
          ];
          existingUser.isSystemUser = true;
          existingUser.metadata = gritServicesUser.metadata;
          existingUser.password = hashedPassword;
          await existingUser.save();
          console.log(`Updated user for tenant: ${tenant.name}`);
        } else {
          // Create new user
          const newUser = new User({
            ...gritServicesUser,
            password: hashedPassword,
            tenantId: tenant.tenantId
          });

          await newUser.save();
          console.log(`Created GRITSERVICES user for tenant: ${tenant.name} (${tenant.subdomain})`);
        }
      } catch (error) {
        console.error(`Error creating user for tenant ${tenant.name}:`, error.message);
      }
    }

    // Create GRITSERVICES user for super admin access (no tenantId)
    try {
      const superAdminUser = await User.findOne({
        email: gritServicesUser.email,
        tenantId: { $exists: false }
      });

      if (superAdminUser) {
        console.log('Super admin GRITSERVICES user already exists');
        // Update to ensure it has all required properties
        superAdminUser.role = 'super_admin';
        superAdminUser.isActive = true;
        superAdminUser.permissions = [
          'menu.view', 'menu.edit', 'menu.delete',
          'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel',
          'analytics.view', 'analytics.export',
          'users.view', 'users.manage', 'users.delete',
          'tables.view', 'tables.manage',
          'inventory.view', 'inventory.manage',
          'payments.view', 'payments.process', 'payments.refund',
          'settings.view', 'settings.manage',
          'shifts.view', 'shifts.manage', 'shifts.approve'
        ];
        superAdminUser.isSystemUser = true;
        superAdminUser.metadata = gritServicesUser.metadata;
        superAdminUser.password = hashedPassword;
        await superAdminUser.save();
        console.log('Updated super admin GRITSERVICES user');
      } else {
        // Create super admin user
        const newSuperAdmin = new User({
          ...gritServicesUser,
          role: 'super_admin',
          password: hashedPassword
          // No tenantId for super admin
        });

        await newSuperAdmin.save();
        console.log('Created GRITSERVICES super admin user');
      }
    } catch (error) {
      console.error('Error creating super admin user:', error.message);
    }

    console.log('\nSummary:');
    console.log('- Email: GRITSERVICES@gritservices.ae');
    console.log('- Password: Musa@786');
    console.log('- Role: Admin (for tenants), Super Admin (for portal)');
    console.log('- Created for all tenants and as super admin');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createGritServicesUsers();