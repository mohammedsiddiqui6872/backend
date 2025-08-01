require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const bcrypt = require('bcryptjs');

// Disable automatic tenant filtering for this script
process.env.BYPASS_TENANT_FILTER = 'true';

async function seedTenantAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, check if restaurants exist
    const restaurants = await Restaurant.find({});
    console.log(`Found ${restaurants.length} restaurants`);

    if (restaurants.length === 0) {
      console.log('No restaurants found. Please run the restaurant seeding script first.');
      process.exit(1);
    }

    // All permissions for admin users
    const adminPermissions = [
      'dashboard.view',
      'analytics.view',
      'analytics.export',
      'menu.view',
      'menu.create',
      'menu.edit',
      'menu.delete',
      'orders.view',
      'orders.create',
      'orders.edit',
      'orders.delete',
      'tables.view',
      'tables.create',
      'tables.edit',
      'tables.delete',
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'users.manage', // Required for document upload
      'inventory.view',
      'inventory.manage',
      'settings.view',
      'settings.edit',
      'shifts.view',
      'shifts.manage',
      'team.view',
      'team.manage'
    ];

    // Create admin users for each restaurant
    for (const restaurant of restaurants) {
      console.log(`\nProcessing restaurant: ${restaurant.name} (${restaurant.subdomain})`);

      // Check if admin already exists
      const existingAdmin = await User.findOne({
        email: `admin@${restaurant.subdomain}.ae`,
        tenantId: restaurant.tenantId
      });

      if (existingAdmin) {
        console.log(`  Admin already exists: ${existingAdmin.email}`);
        // Update permissions
        existingAdmin.permissions = adminPermissions;
        existingAdmin.role = 'admin';
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log(`  Updated permissions for existing admin`);
      } else {
        // Create new admin
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        const adminUser = new User({
          tenantId: restaurant.tenantId,
          name: `${restaurant.name} Admin`,
          email: `admin@${restaurant.subdomain}.ae`,
          password: hashedPassword,
          role: 'admin',
          permissions: adminPermissions,
          isActive: true,
          profile: {
            employeeId: `EMP-${restaurant.subdomain.toUpperCase()}-001`,
            department: 'Management',
            position: 'Administrator',
            employmentType: 'full-time',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'other',
            nationality: 'UAE',
            address: {
              street: restaurant.address?.street || '123 Main St',
              city: restaurant.address?.city || 'Dubai',
              state: restaurant.address?.state || 'Dubai',
              country: restaurant.address?.country || 'UAE',
              zipCode: restaurant.address?.zipCode || '00000'
            },
            emergencyContact: {
              name: 'Emergency Contact',
              relationship: 'Spouse',
              phone: '+971501234567'
            }
          },
          metrics: {
            ordersServed: 0,
            averageRating: 5,
            punctualityScore: 100,
            lastLoginAt: new Date()
          }
        });

        await adminUser.save();
        console.log(`  Created new admin: ${adminUser.email}`);
        console.log(`  Password: password123`);
      }
    }

    // Also create/update super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gritservices.ae';
    let superAdmin = await User.findOne({ email: superAdminEmail });

    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'gritadmin2024!', 10);
      
      superAdmin = new User({
        name: 'Super Admin',
        email: superAdminEmail,
        password: hashedPassword,
        role: 'superadmin',
        permissions: [...adminPermissions, 'tenant.manage', 'tenant.create', 'tenant.delete'],
        isActive: true,
        isSuperAdmin: true,
        profile: {
          employeeId: 'EMP-SUPER-001',
          department: 'System',
          position: 'Super Administrator',
          employmentType: 'full-time'
        }
      });

      await superAdmin.save();
      console.log(`\nCreated super admin: ${superAdminEmail}`);
    } else {
      superAdmin.permissions = [...adminPermissions, 'tenant.manage', 'tenant.create', 'tenant.delete'];
      superAdmin.role = 'superadmin';
      superAdmin.isSuperAdmin = true;
      superAdmin.isActive = true;
      await superAdmin.save();
      console.log(`\nUpdated super admin: ${superAdminEmail}`);
    }

    // Verify Hard Rock Cafe admin
    const hardRockAdmin = await User.findOne({ email: 'admin@hardrockcafe.ae' });
    if (hardRockAdmin) {
      console.log(`\nHard Rock Cafe admin verification:`);
      console.log(`  Email: ${hardRockAdmin.email}`);
      console.log(`  Role: ${hardRockAdmin.role}`);
      console.log(`  Permissions: ${hardRockAdmin.permissions.length}`);
      console.log(`  Has users.manage: ${hardRockAdmin.permissions.includes('users.manage')}`);
      console.log(`  Tenant ID: ${hardRockAdmin.tenantId}`);
    }

    console.log('\nAll admin users created/updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedTenantAdmins();