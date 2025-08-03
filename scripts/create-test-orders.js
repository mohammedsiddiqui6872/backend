require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define schemas
const orderSchema = new mongoose.Schema({
  tenantId: String,
  orderNumber: String,
  tableNumber: String,
  customerName: String,
  customerPhone: String,
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    price: Number,
    quantity: Number,
    modifiers: [{
      name: String,
      price: Number
    }],
    specialRequests: String,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'pending'
    },
    station: String,
    allergens: [String],
    dietary: [String]
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// Sample menu items
const menuItems = [
  { name: 'Chicken Biryani', price: 45, station: 'main', allergens: ['gluten'], dietary: [] },
  { name: 'Paneer Tikka', price: 35, station: 'grill', allergens: ['dairy'], dietary: ['vegetarian'] },
  { name: 'Caesar Salad', price: 28, station: 'salad', allergens: ['dairy', 'eggs'], dietary: [] },
  { name: 'Chocolate Brownie', price: 22, station: 'dessert', allergens: ['gluten', 'dairy', 'eggs'], dietary: [] },
  { name: 'Fresh Orange Juice', price: 15, station: 'beverage', allergens: [], dietary: ['vegan'] },
  { name: 'Grilled Fish', price: 55, station: 'grill', allergens: ['fish'], dietary: [] },
  { name: 'Vegetable Pasta', price: 32, station: 'main', allergens: ['gluten'], dietary: ['vegetarian'] },
  { name: 'Ice Cream Sundae', price: 18, station: 'dessert', allergens: ['dairy'], dietary: [] }
];

async function createTestOrders() {
  try {
    console.log('Creating test orders...\n');
    
    const tenants = [
      'rest_mughlaimagic_001',
      'rest_bellavista_002',
      'rest_hardrockcafe_003'
    ];
    
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
    const tables = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'];
    
    const ordersToCreate = [];
    const now = new Date();
    
    // Create orders for each tenant
    for (const tenantId of tenants) {
      // Create 5 orders per tenant with different statuses and times
      for (let i = 0; i < 5; i++) {
        const orderTime = new Date(now);
        orderTime.setMinutes(now.getMinutes() - (i * 10)); // Stagger order times
        
        const status = statuses[i % statuses.length];
        const table = tables[Math.floor(Math.random() * tables.length)];
        
        // Create 1-3 items per order
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const orderItems = [];
        let subtotal = 0;
        
        for (let j = 0; j < itemCount; j++) {
          const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const itemTotal = menuItem.price * quantity;
          subtotal += itemTotal;
          
          const item = {
            name: menuItem.name,
            price: menuItem.price,
            quantity: quantity,
            station: menuItem.station,
            allergens: menuItem.allergens,
            dietary: menuItem.dietary,
            status: status === 'pending' ? 'pending' : 
                   status === 'confirmed' ? 'pending' :
                   status === 'preparing' ? 'preparing' :
                   status === 'ready' ? 'ready' :
                   'served',
            modifiers: []
          };
          
          // Add modifiers randomly
          if (Math.random() > 0.5) {
            item.modifiers.push({
              name: 'Extra Spicy',
              price: 2
            });
            subtotal += 2 * quantity;
          }
          
          // Add special requests randomly
          if (Math.random() > 0.7) {
            item.specialRequests = 'No onions please';
          }
          
          orderItems.push(item);
        }
        
        const tax = subtotal * 0.05;
        const total = subtotal + tax;
        
        const order = {
          tenantId: tenantId,
          orderNumber: `ORD-${Date.now()}-${tenantId.slice(-3)}-${i}`,
          tableNumber: table,
          customerName: `Test Customer ${i + 1}`,
          customerPhone: `+971501234${String(i).padStart(3, '0')}`,
          items: orderItems,
          subtotal: subtotal,
          tax: tax,
          total: total,
          status: status,
          paymentStatus: status === 'paid' ? 'paid' : 'pending',
          createdAt: orderTime,
          updatedAt: orderTime
        };
        
        ordersToCreate.push(order);
      }
    }
    
    // Insert all orders
    const createdOrders = await Order.insertMany(ordersToCreate);
    console.log(`Created ${createdOrders.length} test orders successfully!`);
    
    // Show summary
    console.log('\nOrders created per tenant:');
    for (const tenantId of tenants) {
      const count = createdOrders.filter(o => o.tenantId === tenantId).length;
      console.log(`- ${tenantId}: ${count} orders`);
    }
    
    console.log('\nOrders by status:');
    for (const status of statuses) {
      const count = createdOrders.filter(o => o.status === status).length;
      console.log(`- ${status}: ${count} orders`);
    }
    
    // Create one urgent order (older than 20 minutes)
    const urgentOrderTime = new Date();
    urgentOrderTime.setMinutes(urgentOrderTime.getMinutes() - 25);
    
    const urgentOrder = {
      tenantId: 'rest_mughlaimagic_001',
      orderNumber: `ORD-URGENT-${Date.now()}`,
      tableNumber: 'T1',
      customerName: 'Urgent Customer',
      customerPhone: '+971501234999',
      items: [{
        name: 'Chicken Biryani',
        price: 45,
        quantity: 2,
        station: 'main',
        status: 'preparing',
        allergens: ['gluten'],
        dietary: []
      }],
      subtotal: 90,
      tax: 4.5,
      total: 94.5,
      status: 'preparing',
      paymentStatus: 'pending',
      createdAt: urgentOrderTime,
      updatedAt: urgentOrderTime
    };
    
    await Order.create(urgentOrder);
    console.log('\nCreated 1 urgent order (25 minutes old)');
    
  } catch (error) {
    console.error('Error creating test orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

createTestOrders();