const mongoose = require('mongoose');
const Role = require('../src/models/Role');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:!Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0";

async function checkRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all roles
    const roles = await Role.find({}).select('name code permissions isSystem tenantId');
    
    console.log(`\nTotal roles found: ${roles.length}`);
    
    // Group by system vs tenant-specific
    const systemRoles = roles.filter(r => r.isSystem);
    const tenantRoles = roles.filter(r => !r.isSystem);
    
    console.log(`System roles: ${systemRoles.length}`);
    console.log(`Tenant-specific roles: ${tenantRoles.length}`);
    
    console.log('\n--- System Roles ---');
    systemRoles.forEach(role => {
      console.log(`\n${role.name} (${role.code}):`);
      console.log(`  Permissions count: ${role.permissions.length}`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
      console.log(`  Tenant: ${role.tenantId || 'None (global)'}`);
    });
    
    // Check for ADMIN role specifically
    const adminRoles = await Role.find({ code: 'ADMIN' });
    console.log(`\n--- Admin Roles Detail ---`);
    console.log(`Found ${adminRoles.length} ADMIN roles`);
    
    adminRoles.forEach((role, index) => {
      console.log(`\nAdmin Role ${index + 1}:`);
      console.log(`  ID: ${role._id}`);
      console.log(`  Name: ${role.name}`);
      console.log(`  TenantId: ${role.tenantId || 'None'}`);
      console.log(`  isSystem: ${role.isSystem}`);
      console.log(`  Permissions: ${JSON.stringify(role.permissions.slice(0, 5))}... (${role.permissions.length} total)`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has inventory.manage: ${role.permissions.includes('inventory.manage')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking roles:', error);
    process.exit(1);
  }
}

checkRoles();