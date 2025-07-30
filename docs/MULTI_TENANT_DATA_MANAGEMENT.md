# Multi-Tenant Data Management & Differentiation

## Overview
How to manage and differentiate data for 10+ restaurants where each has their own users, menu items, categories, orders, etc.

## 1. Data Isolation Strategy

### A. Core Concept: TenantId Everywhere
Every single document in MongoDB will have a `tenantId` field:

```javascript
// Example: Menu Item for Restaurant 1
{
  _id: ObjectId("..."),
  tenantId: "rest_bellas_001",     // THIS IS THE KEY!
  name: "Margherita Pizza",
  price: 12.99,
  category: "main-courses"
}

// Example: Menu Item for Restaurant 2
{
  _id: ObjectId("..."),
  tenantId: "rest_joes_002",       // DIFFERENT TENANT!
  name: "Chicken Burger",
  price: 8.99,
  category: "burgers"
}
```

### B. Automatic Filtering
All queries automatically filter by tenantId:

```javascript
// Middleware sets tenant context based on subdomain
app.use((req, res, next) => {
  // If request is to bellas.ordernow.com
  const subdomain = req.hostname.split('.')[0]; // "bellas"
  const tenant = await Tenant.findOne({ subdomain });
  req.tenantId = tenant.tenantId; // "rest_bellas_001"
  next();
});

// All subsequent queries use this tenantId
const menuItems = await MenuItem.find({ tenantId: req.tenantId });
// Returns ONLY Bella's menu items!
```

## 2. Database Structure Example

### MongoDB Collections (Shared by All Tenants)
```
restaurants database:
├── tenants (master list of all restaurants)
├── users (all users from all restaurants)
├── menuitems (all menu items from all restaurants)
├── categories (all categories from all restaurants)
├── orders (all orders from all restaurants)
├── tables (all tables from all restaurants)
└── settings (all settings from all restaurants)
```

### Sample Data Distribution
```javascript
// users collection
[
  // Bella's Restaurant Users
  { tenantId: "rest_bellas_001", email: "admin@bellas.com", role: "admin" },
  { tenantId: "rest_bellas_001", email: "waiter1@bellas.com", role: "waiter" },
  { tenantId: "rest_bellas_001", email: "chef@bellas.com", role: "chef" },
  
  // Joe's Diner Users
  { tenantId: "rest_joes_002", email: "admin@joes.com", role: "admin" },
  { tenantId: "rest_joes_002", email: "server@joes.com", role: "waiter" },
  
  // Mario's Pizza Users
  { tenantId: "rest_marios_003", email: "mario@marios.com", role: "admin" },
  { tenantId: "rest_marios_003", email: "staff1@marios.com", role: "waiter" }
]

// menuitems collection
[
  // Bella's Menu
  { tenantId: "rest_bellas_001", name: "Hummus", price: 6.99, category: "appetizers" },
  { tenantId: "rest_bellas_001", name: "Shawarma", price: 12.99, category: "mains" },
  
  // Joe's Menu
  { tenantId: "rest_joes_002", name: "Burger", price: 8.99, category: "mains" },
  { tenantId: "rest_joes_002", name: "Fries", price: 3.99, category: "sides" },
  
  // Mario's Menu
  { tenantId: "rest_marios_003", name: "Margherita", price: 14.99, category: "pizza" },
  { tenantId: "rest_marios_003", name: "Pepperoni", price: 16.99, category: "pizza" }
]
```

## 3. Implementation Code

### A. Update All Models with TenantId

```javascript
// src/models/MenuItem.js
const menuItemSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true  // IMPORTANT: Index for performance
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  // ... other fields
});

// Automatic tenant filtering
menuItemSchema.pre(/^find/, function() {
  if (!this.getOptions().skipTenant) {
    const tenantId = mongoose.getTenantId(); // Get from request context
    this.where({ tenantId });
  }
});

// Compound indexes for performance
menuItemSchema.index({ tenantId: 1, category: 1 });
menuItemSchema.index({ tenantId: 1, name: 1 });
```

### B. Tenant Context Middleware

```javascript
// src/middleware/tenantContext.js
const tenantContext = async (req, res, next) => {
  try {
    // Extract tenant from subdomain
    const hostname = req.hostname; // bellas.ordernow.com
    const subdomain = hostname.split('.')[0]; // bellas
    
    // Find tenant
    const tenant = await Tenant.findOne({ 
      subdomain,
      status: 'active' 
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Set tenant context
    req.tenant = tenant;
    req.tenantId = tenant.tenantId;
    
    // Store in AsyncLocalStorage for model access
    tenantStore.run(tenant.tenantId, () => {
      next();
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to identify restaurant' });
  }
};
```

### C. Tenant-Aware Queries

```javascript
// src/routes/menu.js
router.get('/menu-items', tenantContext, async (req, res) => {
  // This automatically returns ONLY items for the current restaurant
  const items = await MenuItem.find(); // tenantId filter applied automatically!
  res.json(items);
});

// src/routes/orders.js
router.get('/orders', tenantContext, authenticate, async (req, res) => {
  // Returns ONLY orders for the current restaurant
  const orders = await Order.find()
    .populate('waiter') // Also filtered by tenantId
    .populate('items.menuItem'); // Also filtered by tenantId
  res.json(orders);
});
```

## 4. Onboarding New Restaurant Data

### A. Automated Data Setup Script

```javascript
// scripts/onboardRestaurant.js
async function onboardNewRestaurant(restaurantData) {
  const tenantId = `rest_${restaurantData.subdomain}_${Date.now()}`;
  
  console.log(`Onboarding ${restaurantData.name} with ID: ${tenantId}`);
  
  // 1. Create default categories
  const categories = [
    { tenantId, name: 'Appetizers', slug: 'appetizers', icon: 'utensils' },
    { tenantId, name: 'Main Courses', slug: 'mains', icon: 'bowl' },
    { tenantId, name: 'Desserts', slug: 'desserts', icon: 'cake' },
    { tenantId, name: 'Beverages', slug: 'beverages', icon: 'coffee' }
  ];
  await Category.insertMany(categories);
  
  // 2. Create default tables
  const tables = [];
  for (let i = 1; i <= restaurantData.tableCount; i++) {
    tables.push({
      tenantId,
      number: String(i),
      capacity: 4,
      status: 'available'
    });
  }
  await Table.insertMany(tables);
  
  // 3. Create admin user
  const adminUser = {
    tenantId,
    email: restaurantData.adminEmail,
    name: restaurantData.adminName,
    role: 'admin',
    password: await bcrypt.hash(restaurantData.tempPassword, 10)
  };
  await User.create(adminUser);
  
  // 4. Create sample menu items (optional)
  if (restaurantData.includeSampleData) {
    const sampleItems = [
      { tenantId, name: 'House Salad', price: 8.99, category: 'appetizers' },
      { tenantId, name: 'Grilled Chicken', price: 16.99, category: 'mains' },
      { tenantId, name: 'Chocolate Cake', price: 6.99, category: 'desserts' },
      { tenantId, name: 'Soft Drink', price: 2.99, category: 'beverages' }
    ];
    await MenuItem.insertMany(sampleItems);
  }
  
  console.log(`✓ Restaurant ${restaurantData.name} onboarded successfully!`);
}
```

### B. Bulk Import for Existing Restaurants

```javascript
// scripts/importRestaurantData.js
async function importRestaurantMenu(tenantId, csvFile) {
  const menuItems = [];
  
  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (row) => {
      menuItems.push({
        tenantId,
        name: row.name,
        nameAr: row.nameAr,
        price: parseFloat(row.price),
        category: row.category,
        description: row.description,
        isVegetarian: row.isVegetarian === 'true'
      });
    })
    .on('end', async () => {
      await MenuItem.insertMany(menuItems);
      console.log(`Imported ${menuItems.length} items`);
    });
}
```

## 5. Data Access Patterns

### A. Restaurant Admin Access
When admin@bellas.com logs in at bellas.ordernow.com/admin:

```javascript
// Authentication sets tenant context
const user = await User.findOne({ 
  email: 'admin@bellas.com',
  tenantId: 'rest_bellas_001'  // Enforced by subdomain
});

// They can ONLY see Bella's data
const menuItems = await MenuItem.find(); // Returns Bella's items only
const orders = await Order.find(); // Returns Bella's orders only
const users = await User.find(); // Returns Bella's staff only
```

### B. Super Admin Access (You)
When you log in at app.ordernow.com:

```javascript
// Super admin can access all data
router.get('/admin/all-restaurants', superAdminAuth, async (req, res) => {
  // Skip tenant filtering for super admin
  const allRestaurants = await Tenant.find({ skipTenant: true });
  
  // Get stats for each restaurant
  const stats = await Promise.all(
    allRestaurants.map(async (tenant) => {
      const orderCount = await Order.countDocuments({ tenantId: tenant.tenantId });
      const userCount = await User.countDocuments({ tenantId: tenant.tenantId });
      const revenue = await Order.aggregate([
        { $match: { tenantId: tenant.tenantId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      
      return {
        restaurant: tenant.name,
        orders: orderCount,
        users: userCount,
        revenue: revenue[0]?.total || 0
      };
    })
  );
  
  res.json(stats);
});
```

## 6. Database Indexes for Performance

```javascript
// Critical indexes for multi-tenant performance
db.users.createIndex({ tenantId: 1, email: 1 }, { unique: true });
db.menuitems.createIndex({ tenantId: 1, category: 1 });
db.menuitems.createIndex({ tenantId: 1, name: 1 });
db.orders.createIndex({ tenantId: 1, createdAt: -1 });
db.orders.createIndex({ tenantId: 1, status: 1 });
db.tables.createIndex({ tenantId: 1, number: 1 }, { unique: true });
db.categories.createIndex({ tenantId: 1, slug: 1 }, { unique: true });
```

## 7. Preventing Data Leaks

### A. Validation Layer
```javascript
// Ensure tenantId is always set
menuItemSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('TenantId is required'));
  }
  next();
});

// Double-check in routes
router.post('/menu-items', async (req, res) => {
  const item = new MenuItem({
    ...req.body,
    tenantId: req.tenantId // Always override with request tenant
  });
  await item.save();
});
```

### B. API Response Filtering
```javascript
// Never expose tenantId in API responses
menuItemSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.tenantId; // Remove from client responses
    return ret;
  }
});
```

## 8. Practical Example: 10 Restaurants

```
Restaurant 1: Bella's Mediterranean
- Subdomain: bellas.ordernow.com
- TenantId: rest_bellas_001
- 50 menu items, 5 staff, 20 tables

Restaurant 2: Joe's Diner
- Subdomain: joes.ordernow.com
- TenantId: rest_joes_002
- 30 menu items, 3 staff, 15 tables

Restaurant 3: Mario's Pizza
- Subdomain: marios.ordernow.com
- TenantId: rest_marios_003
- 25 menu items, 4 staff, 10 tables

... and so on
```

Each restaurant:
- Has completely isolated data
- Cannot see other restaurants' data
- Manages their own menu, staff, orders
- Has their own subdomain
- Shares the same database but data is filtered

## 9. Admin Panel Modifications

```javascript
// Each restaurant admin sees only their data
const AdminDashboard = () => {
  const { data: stats } = useSWR('/api/stats'); // Automatically filtered
  
  return (
    <div>
      <h1>Welcome to {tenant.name} Admin</h1>
      <Stats orders={stats.orders} revenue={stats.revenue} />
      <MenuManager /> {/* Shows only their menu */}
      <StaffManager /> {/* Shows only their staff */}
      <OrderManager /> {/* Shows only their orders */}
    </div>
  );
};
```

## 10. Migration Script for Existing Restaurant

```javascript
// Migrate your current single restaurant to multi-tenant
async function migrateExistingRestaurant() {
  const BELLA_TENANT_ID = 'rest_bellas_001';
  
  const collections = [
    'users', 'menuitems', 'categories', 'orders', 
    'tables', 'customersessions', 'payments'
  ];
  
  for (const collection of collections) {
    const result = await db.collection(collection).updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: BELLA_TENANT_ID } }
    );
    console.log(`Updated ${result.modifiedCount} documents in ${collection}`);
  }
}
```

## Summary

With this architecture:
1. **Each restaurant's data is completely isolated** using tenantId
2. **No code changes needed** when adding new restaurants
3. **Automatic filtering** ensures data security
4. **Single database** keeps costs low
5. **Easy onboarding** with automated scripts
6. **Scalable** to hundreds of restaurants

The key is the tenantId field that acts as a filter for EVERYTHING!