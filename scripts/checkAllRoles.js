const mongoose = require('mongoose');
const Role = require('../src/models/Role');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:!Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0";

async function checkAllRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all roles with details
    const roles = await Role.find({});
    
    console.log(`\nTotal roles found: ${roles.length}`);
    
    roles.forEach((role, index) => {
      console.log(`\n--- Role ${index + 1} ---`);
      console.log(`ID: ${role._id}`);
      console.log(`Name: ${role.name}`);
      console.log(`Code: ${role.code}`);
      console.log(`TenantId: ${role.tenantId}`);
      console.log(`isSystem: ${role.isSystem}`);
      console.log(`Permissions (first 10): ${role.permissions.slice(0, 10).join(', ')}`);
      console.log(`Total permissions: ${role.permissions.length}`);
      console.log(`Has inventory permissions: ${role.permissions.some(p => p.startsWith('inventory.'))}`);
      console.log(`Has purchase permissions: ${role.permissions.some(p => p.startsWith('purchase.'))}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking roles:', error);
    process.exit(1);
  }
}

checkAllRoles();