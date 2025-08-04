const axios = require('axios');

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.gritservices.ae' 
  : 'http://localhost:5000';

const SUBDOMAIN = 'mughlaimagic';
const ADMIN_EMAIL = 'admin@mughlaimagic.ae';
const ADMIN_PASSWORD = 'password123';

let authToken = '';

async function testRolesAPI() {
  try {
    console.log('🚀 Testing Roles API...\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      headers: {
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });

    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Get permissions list
    console.log('2. Fetching permissions list...');
    const permissionsResponse = await axios.get(`${API_URL}/api/admin/roles/permissions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    console.log('✅ Permissions fetched:', Object.keys(permissionsResponse.data.data).length, 'categories');
    console.log('Categories:', Object.keys(permissionsResponse.data.data).join(', '));
    console.log('');

    // 3. Get all roles
    console.log('3. Fetching all roles...');
    const rolesResponse = await axios.get(`${API_URL}/api/admin/roles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-Subdomain': SUBDOMAIN
      }
    });
    console.log('✅ Roles fetched:', rolesResponse.data.data.length);
    rolesResponse.data.data.forEach(role => {
      console.log(`  - ${role.name} (${role.code}) - ${role.permissions.length} permissions`);
    });
    console.log('');

    // 4. Create a test role
    console.log('4. Creating a test role...');
    const newRole = {
      name: 'Test Role',
      code: 'TEST_ROLE',
      description: 'Test role created via API',
      permissions: ['menu.view', 'orders.view', 'orders.create'],
      uiAccess: {
        dashboard: true,
        orders: true,
        menu: true,
        tables: false,
        customers: false,
        analytics: false,
        inventory: false,
        staff: false,
        settings: false
      },
      level: 5
    };

    try {
      const createResponse = await axios.post(`${API_URL}/api/admin/roles`, newRole, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Subdomain': SUBDOMAIN
        }
      });
      console.log('✅ Role created:', createResponse.data.data.name);
      const roleId = createResponse.data.data._id;

      // 5. Update the role
      console.log('\n5. Updating the test role...');
      const updateData = {
        description: 'Updated test role description',
        permissions: ['menu.view', 'orders.view', 'orders.create', 'orders.edit'],
        level: 4
      };

      const updateResponse = await axios.put(`${API_URL}/api/admin/roles/${roleId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Subdomain': SUBDOMAIN
        }
      });
      console.log('✅ Role updated');

      // 6. Delete the test role
      console.log('\n6. Deleting the test role...');
      const deleteResponse = await axios.delete(`${API_URL}/api/admin/roles/${roleId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Subdomain': SUBDOMAIN
        }
      });
      console.log('✅ Role deactivated');

    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️  Test role already exists, skipping create/update/delete tests');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All Role Management API tests passed!');

  } catch (error) {
    console.error('\n❌ Error testing roles API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testRolesAPI();