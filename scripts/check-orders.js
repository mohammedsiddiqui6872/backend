require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const orderSchema = new mongoose.Schema({
  tenantId: String,
  orderNumber: String,
  tableNumber: String,
  customerName: String,
  items: Array,
  status: String,
  total: Number,
  createdAt: Date
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

async function checkOrders() {
  try {
    console.log('Checking orders in database...\n');
    
    // Get count of all orders
    const totalCount = await Order.countDocuments();
    console.log(`Total orders in database: ${totalCount}`);
    
    // Get orders grouped by tenant
    const ordersByTenant = await Order.aggregate([
      {
        $group: {
          _id: '$tenantId',
          count: { $sum: 1 },
          statuses: { $push: '$status' }
        }
      }
    ]);
    
    console.log('\nOrders by tenant:');
    ordersByTenant.forEach(tenant => {
      console.log(`- Tenant ${tenant._id || 'null'}: ${tenant.count} orders`);
      const statusCounts = tenant.statuses.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      console.log(`  Statuses:`, statusCounts);
    });
    
    // Get sample orders
    console.log('\nSample orders (first 3):');
    const sampleOrders = await Order.find().limit(3).lean();
    sampleOrders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`- Order #: ${order.orderNumber}`);
      console.log(`- Tenant: ${order.tenantId || 'null'}`);
      console.log(`- Table: ${order.tableNumber}`);
      console.log(`- Customer: ${order.customerName}`);
      console.log(`- Status: ${order.status}`);
      console.log(`- Total: ${order.total}`);
      console.log(`- Items: ${order.items?.length || 0}`);
      console.log(`- Created: ${order.createdAt}`);
    });
    
    // Check for orders without tenantId
    const ordersWithoutTenant = await Order.countDocuments({ 
      $or: [
        { tenantId: null },
        { tenantId: '' },
        { tenantId: { $exists: false } }
      ]
    });
    
    if (ordersWithoutTenant > 0) {
      console.log(`\n⚠️  Warning: ${ordersWithoutTenant} orders found without tenantId!`);
    }
    
    // Check recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    console.log(`\nOrders in last 7 days: ${recentOrders}`);
    
  } catch (error) {
    console.error('Error checking orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

checkOrders();