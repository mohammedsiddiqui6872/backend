const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function createRestaurantAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // List all tenants
    const tenants = await Tenant.find({}, 'tenantId name subdomain');
    
    if (tenants.length === 0) {
      console.log('No restaurants found!');
      return;
    }

    console.log('\nAvailable Restaurants:');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.subdomain}.gritservices.ae)`);
    });

    // For this example, we'll use the first tenant
    // In production, you'd want to make this selectable
    const selectedTenant = tenants[0];
    
    const adminData = {
      tenantId: selectedTenant.tenantId,
      name: 'Restaurant Admin',
      email: 'admin@' + selectedTenant.subdomain + '.com',
      password: 'Admin@123456', // Change this to a secure password
      role: 'admin',
      isActive: true,
      permissions: [
        'menu.view', 'menu.edit', 'menu.delete',
        'orders.view', 'orders.edit', 'orders.cancel',
        'analytics.view', 'analytics.export',
        'users.view', 'users.manage',
        'tables.view', 'tables.manage',
        'settings.view', 'settings.manage',
        'shifts.view', 'shifts.manage'
      ]
    };

    // Hash the password
    adminData.password = await bcrypt.hash(adminData.password, 10);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: adminData.email,
      tenantId: selectedTenant.tenantId
    });

    if (existingUser) {
      console.log('\nAdmin user already exists, updating password...');
      existingUser.password = adminData.password;
      existingUser.isActive = true;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('Password updated!');
    } else {
      const admin = new User(adminData);
      await admin.save();
      console.log('\nAdmin user created successfully!');
    }
    
    console.log('\n=== Admin Login Credentials ===');
    console.log('Restaurant:', selectedTenant.name);
    console.log('Admin Panel URL:', `https://${selectedTenant.subdomain}.gritservices.ae/admin-panel`);
    console.log('Email:', adminData.email);
    console.log('Password: Admin@123456');
    console.log('\nIMPORTANT: Change this password after first login!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

createRestaurantAdmin();