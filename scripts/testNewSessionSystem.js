// scripts/testNewSessionSystem.js
// Quick automated tests for the new session system

const axios = require('axios');
const colors = require('colors');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test accounts
const WAITER1 = { email: 'paula@restaurant.com', password: 'password123' };
const WAITER2 = { email: 'georg@restaurant.com', password: 'password123' };
const TEST_TABLE = '1';

let waiter1Token = null;
let waiter2Token = null;

// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (testName, status, message = '') => {
  const statusColor = status === 'PASS' ? 'green' : 'red';
  console.log(`[${status}]`.bold[statusColor], testName, message ? `- ${message}`.gray : '');
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

// Test functions
async function testWaiterLogin() {
  console.log('\n🧪 Testing Waiter Login Without Table Selection'.bold);
  
  try {
    // Login Waiter 1
    const response1 = await api.post('/auth/login', {
      email: WAITER1.email,
      password: WAITER1.password,
      // Note: No tableNumber field
    });
    
    waiter1Token = response1.data.token;
    logTest('Waiter 1 login without table', 'PASS', `Token received: ${waiter1Token.substring(0, 20)}...`);
    
    // Login Waiter 2
    const response2 = await api.post('/auth/login', {
      email: WAITER2.email,
      password: WAITER2.password,
    });
    
    waiter2Token = response2.data.token;
    logTest('Waiter 2 login without table', 'PASS');
    
    return true;
  } catch (error) {
    logTest('Waiter login', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testGetMyTables() {
  console.log('\n🧪 Testing Get My Tables'.bold);
  
  try {
    const response = await api.get('/auth/my-tables', {
      headers: { Authorization: `Bearer ${waiter1Token}` }
    });
    
    logTest('Get my tables', 'PASS', `Found ${response.data.tables?.length || 0} assigned tables`);
    
    if (response.data.tables?.length > 0) {
      console.log('  Assigned tables:'.gray);
      response.data.tables.forEach(table => {
        console.log(`    - Table ${table.tableNumber}: ${table.status}`.gray);
      });
    }
    
    return true;
  } catch (error) {
    logTest('Get my tables', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testAssignTable() {
  console.log('\n🧪 Testing Table Assignment'.bold);
  
  try {
    // First, get all tables to find an available one
    const tablesResponse = await api.get('/tables/state', {
      headers: { Authorization: `Bearer ${waiter1Token}` }
    });
    
    const availableTable = tablesResponse.data.find(t => t.status === 'available');
    
    if (!availableTable) {
      logTest('Find available table', 'FAIL', 'No available tables found');
      return false;
    }
    
    logTest('Found available table', 'PASS', `Table ${availableTable.tableNumber}`);
    
    // Assign the table
    const assignResponse = await api.put(`/tables/${availableTable.tableNumber}/assign`, {
      waiterId: 'self' // Server should use authenticated user
    }, {
      headers: { Authorization: `Bearer ${waiter1Token}` }
    });
    
    logTest('Assign table', 'PASS', `Table ${availableTable.tableNumber} assigned successfully`);
    
    return availableTable.tableNumber;
  } catch (error) {
    logTest('Assign table', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testCreateCustomerSession(tableNumber) {
  console.log('\n🧪 Testing Customer Session Creation'.bold);
  
  try {
    const response = await api.post('/customer-sessions/create', {
      tableNumber: tableNumber,
      customerName: 'Test Customer',
      customerPhone: '1234567890',
      occupancy: 2
    }, {
      headers: { Authorization: `Bearer ${waiter1Token}` }
    });
    
    logTest('Create customer session', 'PASS', `Session ID: ${response.data.session.sessionId}`);
    
    return response.data.session._id;
  } catch (error) {
    logTest('Create customer session', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testTableHandover(tableNumber) {
  console.log('\n🧪 Testing Table Handover'.bold);
  
  try {
    // First, get waiter 2's ID
    const profileResponse = await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${waiter2Token}` }
    });
    
    const waiter2Id = profileResponse.data._id;
    
    // Perform handover
    const handoverResponse = await api.post('/auth/handover-table', {
      tableNumber: tableNumber,
      toWaiterId: waiter2Id,
      reason: 'Test handover - shift change'
    }, {
      headers: { Authorization: `Bearer ${waiter1Token}` }
    });
    
    logTest('Table handover', 'PASS', `Table ${tableNumber} handed over successfully`);
    
    // Verify waiter 2 has the table
    await delay(1000); // Wait for updates
    
    const waiter2Tables = await api.get('/auth/my-tables', {
      headers: { Authorization: `Bearer ${waiter2Token}` }
    });
    
    const hasTable = waiter2Tables.data.tables?.some(t => t.tableNumber === tableNumber);
    
    if (hasTable) {
      logTest('Verify handover reception', 'PASS', 'Waiter 2 now has the table');
    } else {
      logTest('Verify handover reception', 'FAIL', 'Table not found in waiter 2 tables');
    }
    
    return true;
  } catch (error) {
    logTest('Table handover', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testReleaseTable(tableNumber) {
  console.log('\n🧪 Testing Table Release'.bold);
  
  try {
    // First, close the customer session if exists
    const sessionResponse = await api.get(`/customer-sessions/table/${tableNumber}`, {
      headers: { Authorization: `Bearer ${waiter2Token}` }
    });
    
    if (sessionResponse.data.activeSession) {
      // Close the session
      await api.post(`/customer-sessions/${sessionResponse.data.activeSession._id}/close`, {}, {
        headers: { Authorization: `Bearer ${waiter2Token}` }
      });
      
      logTest('Close customer session', 'PASS');
      await delay(1000);
    }
    
    // Now release the table
    const releaseResponse = await api.put(`/tables/${tableNumber}/release`, {}, {
      headers: { Authorization: `Bearer ${waiter2Token}` }
    });
    
    logTest('Release table', 'PASS', `Table ${tableNumber} released successfully`);
    
    return true;
  } catch (error) {
    logTest('Release table', 'FAIL', error.response?.data?.error || error.message);
    return false;
  }
}

async function testLogoutWithActiveSession() {
  console.log('\n🧪 Testing Logout Prevention'.bold);
  
  try {
    // Assign a table and create session
    const tableNumber = await testAssignTable();
    if (tableNumber) {
      await testCreateCustomerSession(tableNumber);
      
      // Try to logout
      try {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${waiter1Token}` }
        });
        
        logTest('Logout with active session', 'FAIL', 'Logout should have been prevented');
      } catch (error) {
        if (error.response?.status === 400) {
          logTest('Logout prevention', 'PASS', 'Correctly prevented logout with active session');
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    logTest('Logout test', 'FAIL', error.response?.data?.error || error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting New Session System Tests'.bold.cyan);
  console.log('=====================================\n');
  
  // Run tests in sequence
  const loginSuccess = await testWaiterLogin();
  if (!loginSuccess) {
    console.log('\n❌ Login failed, cannot continue tests'.red.bold);
    return;
  }
  
  await testGetMyTables();
  
  const assignedTable = await testAssignTable();
  if (assignedTable) {
    const sessionId = await testCreateCustomerSession(assignedTable);
    
    if (sessionId) {
      await testTableHandover(assignedTable);
      await testReleaseTable(assignedTable);
    }
  }
  
  await testLogoutWithActiveSession();
  
  console.log('\n=====================================');
  console.log('✅ Test Suite Completed'.bold.green);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:'.red, error);
  process.exit(1);
});