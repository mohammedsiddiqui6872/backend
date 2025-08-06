const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const defaultRoles = require('../src/constants/defaultRoles');
require('dotenv').config();

async function updateRolePermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update each system role with new permissions
    for (const defaultRole of defaultRoles) {
      const result = await Role.updateMany(
        { 
          code: defaultRole.code,
          isSystem: true 
        },
        { 
          $set: { 
            permissions: defaultRole.permissions,
            uiAccess: defaultRole.uiAccess
          } 
        }
      );
      
      console.log(`Updated ${defaultRole.name} role:`, result.modifiedCount, 'documents modified');
    }

    console.log('All role permissions updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating role permissions:', error);
    process.exit(1);
  }
}

updateRolePermissions();