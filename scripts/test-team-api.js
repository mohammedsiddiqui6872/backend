const axios = require('axios');

async function testTeamAPI() {
  try {
    console.log('Testing Team API endpoints...\n');

    // Test with Hard Rock Cafe
    const subdomain = 'hardrockcafe';
    const apiUrl = 'https://api.gritservices.ae';
    
    // First, let's login to get a token
    console.log('1. Testing login...');
    const loginResponse = await axios.post(
      `${apiUrl}/api/auth/admin/login?subdomain=${subdomain}`,
      {
        email: 'admin@hardrockcafe.ae',
        password: 'password123'
      },
      {
        headers: {
          'X-Tenant-Subdomain': subdomain
        }
      }
    );
    
    console.log('Login successful:', loginResponse.data.success);
    const token = loginResponse.data.token;
    
    // Test team members endpoint
    console.log('\n2. Testing team members endpoint...');
    const teamResponse = await axios.get(
      `${apiUrl}/api/admin/team/members?subdomain=${subdomain}&page=1&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      }
    );
    
    console.log('Team response:', JSON.stringify(teamResponse.data, null, 2));
    
    // Test the old users endpoint for comparison
    console.log('\n3. Testing old users endpoint...');
    const usersResponse = await axios.get(
      `${apiUrl}/api/admin/users?subdomain=${subdomain}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': subdomain
        }
      }
    );
    
    console.log('Users response:', JSON.stringify(usersResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testTeamAPI();