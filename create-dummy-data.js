// create-dummy-data.js
// Run this script to create dummy customer sessions

const API_URL = 'https://restaurant-backend-2wea.onrender.com/api';

// First, we need to login as a waiter
async function loginAsWaiter(tableNumber) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'Georg@restaurant.com', // Use your actual waiter email
      password: 'Georg123', // Use your actual password
      tableNumber: tableNumber.toString()
    })
  });
  
  const data = await response.json();
  return data.token;
}

// Create a customer session
async function createCustomerSession(token, tableNumber, customerData) {
  const response = await fetch(`${API_URL}/customer-sessions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tableNumber: tableNumber.toString(),
      ...customerData
    })
  });
  
  return response.json();
}

// Create an order for the session
async function createOrder(token, tableNumber, customerName) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tableNumber: tableNumber.toString(),
      customerName: customerName,
      items: [
        {
          id: 1,
          name: "Grilled Salmon",
          price: 45,
          quantity: 2
        },
        {
          id: 2,
          name: "Caesar Salad",
          price: 25,
          quantity: 1
        }
      ],
      subtotal: 115,
      tax: 11.5,
      total: 126.5,
      status: 'preparing',
      orderType: 'dine-in'
    })
  });
  
  return response.json();
}

// Dummy customer data
const dummyCustomers = [
  {
    tableNumber: '06',
    customerName: 'John Smith',
    customerPhone: '+971501234567',
    customerEmail: 'john.smith@email.com',
    occupancy: 4
  },
  {
    tableNumber: '03',
    customerName: 'Sarah Johnson',
    customerPhone: '+971502345678',
    customerEmail: 'sarah.j@email.com',
    occupancy: 2
  },
  {
    tableNumber: '09',
    customerName: 'Ahmed Hassan',
    customerPhone: '+971503456789',
    customerEmail: 'ahmed.h@email.com',
    occupancy: 6
  },
  {
    tableNumber: '12',
    customerName: 'Emily Chen',
    customerPhone: '+971504567890',
    customerEmail: 'emily.chen@email.com',
    occupancy: 3
  }
];

// Main function to create all dummy data
async function createDummyData() {
  console.log('Creating dummy customer sessions...\n');
  
  for (const customer of dummyCustomers) {
    try {
      // Login as waiter for this table
      console.log(`Logging in as waiter for table ${customer.tableNumber}...`);
      const token = await loginAsWaiter(customer.tableNumber);
      
      if (!token) {
        console.error(`Failed to login for table ${customer.tableNumber}`);
        continue;
      }
      
      // Create customer session
      console.log(`Creating customer session for ${customer.customerName}...`);
      const session = await createCustomerSession(token, customer.tableNumber, {
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        customerEmail: customer.customerEmail,
        occupancy: customer.occupancy
      });
      
      console.log(`Session created:`, session);
      
      // Create an order for this customer
      console.log(`Creating order for table ${customer.tableNumber}...`);
      const order = await createOrder(token, customer.tableNumber, customer.customerName);
      console.log(`Order created:`, order);
      
      console.log(`✓ Completed setup for table ${customer.tableNumber}\n`);
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error for table ${customer.tableNumber}:`, error.message);
    }
  }
  
  console.log('All dummy data created!');
}

// Run the script
createDummyData().catch(console.error);

// Instructions:
// 1. Save this as create-dummy-data.js
// 2. Make sure you have Node.js installed
// 3. Run: node create-dummy-data.js
// 4. Check your admin panel - the tables should now show customer information