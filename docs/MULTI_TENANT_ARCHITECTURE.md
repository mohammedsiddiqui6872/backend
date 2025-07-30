# Multi-Tenant Architecture for Restaurant SaaS Platform

## Overview
Converting the current single-tenant restaurant system into a multi-tenant SaaS solution supporting 50+ restaurants.

## 1. Multi-Tenancy Strategy

### Database Architecture: Shared Database with Row-Level Isolation
**Recommendation**: Use a single MongoDB database with tenant isolation at the document level.

```javascript
// Every document will have a tenantId field
{
  _id: ObjectId("..."),
  tenantId: "rest_12345", // Unique restaurant identifier
  name: "Chicken Burger",
  category: "main-courses",
  // ... other fields
}
```

**Why this approach?**
- Cost-effective for 50 restaurants
- Easier maintenance and updates
- MongoDB Atlas free tier (512MB) can handle this initially
- Simple backup and monitoring

### Alternative Approaches (Not Recommended for Your Scale)
1. **Database per Tenant**: Too expensive and complex for 50 restaurants
2. **Schema per Tenant**: MongoDB doesn't support schemas like PostgreSQL
3. **Collection per Tenant**: Would create 500+ collections (messy)

## 2. Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SaaS Control Panel                       │
│              (New Next.js App on Vercel)                    │
│  • Tenant Management  • Billing  • Analytics  • Support     │
└─────────────────────────────────────────┬───────────────────┘
                                          │
┌─────────────────────────────────────────┴───────────────────┐
│                    Shared Backend API                        │
│                  (Node.js on Render)                        │
│  • Multi-tenant aware  • Tenant isolation  • Rate limiting  │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
┌──────────┴──────────┐  ┌───────┴────────────┐
│   Guest Ordering    │  │   Admin Panel      │
│  (Next.js Vercel)   │  │ (React on Render)  │
│ *.yourdomain.com    │  │ admin.*.domain.com │
└─────────────────────┘  └────────────────────┘
```

## 3. Domain Strategy

### Subdomain Approach (Recommended)
```
Guest Ordering: restaurant1.ordernow.com
Admin Panel: admin.restaurant1.ordernow.com
OR
Guest Ordering: restaurant1.yourdomain.com
Admin Panel: restaurant1.yourdomain.com/admin
```

### Custom Domain Support (Premium Feature)
```
Guest Ordering: order.restaurant1.com (CNAME to your platform)
Admin Panel: manage.restaurant1.com
```

## 4. Tenant Onboarding System

### A. SaaS Control Panel Features
Create a new Next.js application for super-admin management:

```javascript
// Key Features
1. Tenant Registration
   - Restaurant details (name, address, contact)
   - Subdomain selection
   - Plan selection (Basic/Pro/Enterprise)
   
2. Automated Provisioning
   - Create tenant record
   - Initialize default data
   - Send welcome emails
   - Generate API keys

3. Tenant Management
   - View all tenants
   - Enable/disable access
   - Usage monitoring
   - Support tickets

4. Billing Integration
   - Stripe/Paddle integration
   - Usage-based or flat-rate billing
   - Invoice generation
```

### B. Onboarding Flow

```mermaid
1. Restaurant signs up → 2. Choose plan → 3. Enter details
↓
4. Select subdomain → 5. Payment setup → 6. Account created
↓
7. Automated setup → 8. Welcome email → 9. Access credentials
```

## 5. Code Modifications Required

### A. Backend Changes

#### 1. Add Tenant Model
```javascript
// src/models/Tenant.js
const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  subdomain: { type: String, unique: true, required: true },
  customDomain: String,
  plan: { 
    type: String, 
    enum: ['trial', 'basic', 'pro', 'enterprise'],
    default: 'trial'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },
  settings: {
    primaryColor: String,
    logo: String,
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' }
  },
  billing: {
    stripeCustomerId: String,
    subscriptionId: String,
    currentPeriodEnd: Date
  },
  limits: {
    maxOrders: { type: Number, default: 1000 },
    maxUsers: { type: Number, default: 10 },
    maxTables: { type: Number, default: 50 },
    maxMenuItems: { type: Number, default: 200 }
  },
  createdAt: { type: Date, default: Date.now },
  onboardedBy: String
});
```

#### 2. Middleware for Tenant Isolation
```javascript
// src/middleware/tenantIsolation.js
const tenantIsolation = async (req, res, next) => {
  try {
    // Extract tenant from subdomain or header
    const host = req.get('host');
    const subdomain = host.split('.')[0];
    
    // Or from custom header for API calls
    const tenantId = req.headers['x-tenant-id'] || subdomain;
    
    // Validate tenant exists and is active
    const tenant = await Tenant.findOne({ 
      $or: [
        { subdomain: tenantId },
        { tenantId: tenantId }
      ],
      status: 'active'
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Attach to request
    req.tenant = tenant;
    req.tenantId = tenant.tenantId;
    
    // Set tenant context for all queries
    mongoose.setTenantId(tenant.tenantId);
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};
```

#### 3. Update All Models
```javascript
// Add to every schema
schema.add({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  }
});

// Add global filter
schema.pre(/^find/, function() {
  if (!this.getOptions().skipTenant) {
    this.where({ tenantId: mongoose.getCurrentTenantId() });
  }
});
```

### B. Frontend Changes

#### 1. Guest Ordering App
```javascript
// utils/config.js
export const getTenantConfig = () => {
  const host = window.location.hostname;
  const subdomain = host.split('.')[0];
  
  return {
    tenantId: subdomain,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    tenantApiUrl: `${process.env.NEXT_PUBLIC_API_URL}/tenant/${subdomain}`
  };
};
```

#### 2. Admin Panel
```javascript
// Add tenant context to all API calls
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'X-Tenant-Id': getTenantId()
  }
});
```

## 6. MongoDB Scaling Considerations

### Current Free Tier Limitations
- **Atlas M0 Free**: 512MB storage, 100 connections max
- **Estimated usage per restaurant**: 10-20MB
- **50 restaurants**: ~500MB-1GB (exceeds free tier)

### Scaling Strategy

#### Phase 1 (1-10 restaurants): Free Tier
- Use MongoDB Atlas M0
- Monitor usage closely

#### Phase 2 (10-30 restaurants): Shared M10
- Upgrade to M10 (~$57/month)
- 2GB storage, 1000 connections
- Enable auto-scaling

#### Phase 3 (30-50+ restaurants): Dedicated Cluster
- M20 or higher (~$140+/month)
- 8GB+ storage
- Performance optimization

### Database Optimization
```javascript
// Compound indexes for tenant queries
db.orders.createIndex({ tenantId: 1, createdAt: -1 });
db.menuitems.createIndex({ tenantId: 1, category: 1 });
db.users.createIndex({ tenantId: 1, email: 1 });

// Tenant-specific aggregations
db.orders.aggregate([
  { $match: { tenantId: "rest_123" } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);
```

## 7. Deployment Architecture

### A. Vercel (Frontend + Control Panel)
```
1. Main Platform: app.yourdomain.com (Control Panel)
2. Wildcard Domain: *.yourdomain.com (Guest Apps)
3. Marketing Site: www.yourdomain.com
```

**Vercel Configuration:**
```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "(?<tenant>.*)\\.yourdomain\\.com"
        }
      ],
      "destination": "/tenant/:tenant/:path*"
    }
  ]
}
```

### B. Render (Backend + Admin)
```
1. API Server: api.yourdomain.com
2. Admin Panel: admin.yourdomain.com
```

**Environment Variables:**
```env
# Multi-tenant specific
ENABLE_MULTI_TENANT=true
MASTER_API_KEY=your-master-key
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...

# Per-tenant limits
DEFAULT_ORDER_LIMIT=1000
DEFAULT_USER_LIMIT=10
```

## 8. Onboarding Process Implementation

### A. Self-Service Onboarding
```javascript
// pages/api/tenant/register.js
export async function registerTenant(req, res) {
  const { restaurantName, email, subdomain, plan } = req.body;
  
  // 1. Validate subdomain availability
  const exists = await Tenant.findOne({ subdomain });
  if (exists) {
    return res.status(400).json({ error: 'Subdomain taken' });
  }
  
  // 2. Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: restaurantName
  });
  
  // 3. Create tenant record
  const tenant = new Tenant({
    tenantId: `rest_${Date.now()}`,
    name: restaurantName,
    subdomain,
    plan,
    billing: {
      stripeCustomerId: customer.id
    }
  });
  
  await tenant.save();
  
  // 4. Initialize tenant data
  await initializeTenantData(tenant.tenantId);
  
  // 5. Send welcome email
  await sendWelcomeEmail(email, subdomain);
  
  return res.json({ success: true, tenantId: tenant.tenantId });
}
```

### B. Manual Onboarding (For Enterprise)
Create an admin interface for manual setup with additional customizations.

## 9. Security Considerations

### Tenant Isolation
```javascript
// Prevent cross-tenant access
const securityMiddleware = (req, res, next) => {
  const userTenantId = req.user?.tenantId;
  const requestTenantId = req.tenant?.tenantId;
  
  if (userTenantId && userTenantId !== requestTenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};
```

### API Rate Limiting
```javascript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Different limits per plan
    const plan = req.tenant?.plan || 'trial';
    const limits = {
      trial: 100,
      basic: 500,
      pro: 2000,
      enterprise: 10000
    };
    return limits[plan];
  }
});
```

## 10. Monitoring & Analytics

### Tenant Usage Tracking
```javascript
// Track API usage
const usageTracking = async (req, res, next) => {
  const tenantId = req.tenant?.tenantId;
  
  if (tenantId) {
    await redis.hincrby(
      `usage:${tenantId}:${moment().format('YYYY-MM')}`,
      'api_calls',
      1
    );
  }
  
  next();
};
```

## 11. Cost Analysis

### Monthly Costs (50 Restaurants)
```
1. MongoDB Atlas M10: $57
2. Vercel Pro: $20
3. Render: $25-50
4. Domain: $15/year
5. Email Service: $10-30
6. Stripe fees: 2.9% + $0.30 per transaction

Total: ~$115-160/month + transaction fees
```

### Revenue Model
```
Basic Plan: $29/month (20 restaurants) = $580
Pro Plan: $79/month (20 restaurants) = $1,580
Enterprise: $199/month (10 restaurants) = $1,990

Total Revenue: ~$4,150/month
Profit Margin: ~$4,000/month
```

## 12. Implementation Timeline

### Phase 1 (2 weeks): Core Infrastructure
- Tenant model and middleware
- Database modifications
- Basic control panel

### Phase 2 (2 weeks): Onboarding System
- Registration flow
- Automated provisioning
- Billing integration

### Phase 3 (1 week): Frontend Updates
- Subdomain routing
- Tenant-aware API calls
- White-labeling support

### Phase 4 (1 week): Testing & Launch
- Load testing
- Security audit
- Migration tools

## 13. Migration Strategy

### For Existing Restaurant
```javascript
// Migration script
async function migrateToMultiTenant() {
  const tenantId = 'rest_bella_001';
  
  // Update all collections
  const collections = [
    'users', 'menuitems', 'orders', 
    'categories', 'tables', 'customersessions'
  ];
  
  for (const collection of collections) {
    await db.collection(collection).updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId } }
    );
  }
}
```

## Next Steps

1. Create the SaaS control panel
2. Implement tenant middleware
3. Update all models with tenantId
4. Set up subdomain routing
5. Create onboarding flow
6. Implement billing
7. Test with 2-3 pilot restaurants
8. Launch!