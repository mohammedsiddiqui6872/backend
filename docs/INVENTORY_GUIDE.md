# Complete Inventory Management System Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [Inventory Items Management](#inventory-items-management)
5. [Supplier Management](#supplier-management)
6. [Purchase Orders](#purchase-orders)
7. [Stock Receiving](#stock-receiving)
8. [Inventory Operations](#inventory-operations)
9. [Recipe Costing](#recipe-costing)
10. [Analytics & Reporting](#analytics-reporting)
11. [API Endpoints](#api-endpoints)
12. [Best Practices](#best-practices)

## System Overview

The inventory management system is a comprehensive solution designed for multi-tenant restaurant operations. It provides complete control over stock levels, supplier relationships, purchasing, recipe costing, and profitability analysis.

### Key Features
- Real-time inventory tracking across multiple locations
- Automatic reordering based on EOQ calculations
- Complete supplier lifecycle management
- Recipe costing with menu profitability analysis
- Waste tracking and prevention
- Batch tracking with expiry management
- Multi-level purchase order approvals
- ABC analysis and stock turnover reporting

## Core Components

### 1. InventoryItem Model
Represents individual inventory items with comprehensive tracking:
- **Identification**: SKU, barcode, QR code
- **Stock Levels**: By location, zone, and bin
- **Costing**: FIFO, LIFO, or Weighted Average
- **Compliance**: Allergens, certifications, dietary info
- **Performance**: Turnover rates, stockout tracking

### 2. Supplier Model
Complete vendor management:
- **Contacts**: Multiple contact persons with roles
- **Terms**: Payment terms, delivery schedules
- **Performance**: Automatic scoring and risk assessment
- **Integration**: API/EDI connectivity options

### 3. PurchaseOrder Model
End-to-end procurement workflow:
- **Creation**: Manual or automatic from reorder points
- **Approval**: Multi-level approval chains
- **Receiving**: Quality checks and partial deliveries
- **Payment**: Tracking and reconciliation

### 4. StockMovement Model
Tracks all inventory transactions:
- **Types**: Purchase, Sale, Transfer, Waste, Adjustment
- **Traceability**: Complete audit trail
- **Cost Tracking**: Maintains cost history

## Getting Started

### Initial Setup

1. **Create Inventory Items**
```javascript
POST /api/admin/inventory/items
{
  "name": "Tomatoes",
  "sku": "VEG-TOM-001",
  "category": "produce",
  "baseUnit": "kg",
  "reorderPoint": 20,
  "reorderQuantity": 50,
  "safetyStock": 10,
  "currentCost": 3.50,
  "costingMethod": "FIFO",
  "batchTracking": true,
  "storageTemp": { "min": 2, "max": 8, "unit": "C" },
  "shelfLife": { "value": 7, "unit": "days" },
  "allergens": [],
  "unitConversions": [
    { "fromUnit": "kg", "toUnit": "g", "factor": 1000 }
  ]
}
```

2. **Add Suppliers**
```javascript
POST /api/admin/suppliers
{
  "name": "Fresh Produce Co",
  "code": "SUP-001",
  "type": "DISTRIBUTOR",
  "categories": ["produce", "dairy"],
  "primaryContact": {
    "name": "John Smith",
    "email": "john@freshproduce.com",
    "phone": "+1234567890"
  },
  "paymentTerms": {
    "termType": "NET",
    "netDays": 30,
    "earlyPaymentDiscount": { "percentage": 2, "withinDays": 10 }
  },
  "deliverySchedules": [{
    "dayOfWeek": 1,
    "timeSlots": [{ "startTime": "06:00", "endTime": "12:00" }]
  }]
}
```

3. **Link Items to Suppliers**
```javascript
PUT /api/admin/inventory/items/:itemId/suppliers
{
  "suppliers": [{
    "supplier": "supplierId",
    "supplierSKU": "FP-TOM-001",
    "cost": 3.50,
    "leadTimeDays": 2,
    "moq": 10,
    "preferredSupplier": true
  }]
}
```

## Inventory Items Management

### Creating Items with Full Details

```javascript
// Complete inventory item setup
const inventoryItem = {
  // Basic Information
  "name": "Olive Oil Extra Virgin",
  "description": "Premium Spanish olive oil",
  "sku": "OIL-EVOO-001",
  "barcode": "8437001234567",
  "category": "dry-goods",
  "subCategory": "oils",
  
  // Units and Stock
  "baseUnit": "l",
  "unitConversions": [
    { "fromUnit": "l", "toUnit": "ml", "factor": 1000 },
    { "fromUnit": "case", "toUnit": "l", "factor": 12 }
  ],
  "reorderPoint": 24,
  "reorderQuantity": 48,
  "safetyStock": 12,
  "maxStock": 96,
  
  // Costing
  "costingMethod": "WEIGHTED_AVG",
  "currentCost": 8.50,
  
  // Storage Requirements
  "storageTemp": { "min": 15, "max": 25, "unit": "C" },
  "storageInstructions": "Store in cool, dark place",
  "shelfLife": { "value": 18, "unit": "months" },
  
  // Compliance
  "allergens": [],
  "dietaryInfo": {
    "vegetarian": true,
    "vegan": true,
    "glutenFree": true,
    "organic": true
  },
  "certifications": [{
    "name": "Organic Certification",
    "number": "ORG-2024-1234",
    "expiryDate": "2025-12-31",
    "issuingBody": "EU Organic"
  }]
}
```

### Stock Level Management

```javascript
// Check current stock levels
GET /api/admin/inventory/items/:itemId/stock

// Response
{
  "stockLevels": [
    {
      "location": "main-kitchen",
      "zone": "A",
      "bin": "A-12",
      "quantity": 36,
      "reservedQuantity": 12,
      "availableQuantity": 24
    },
    {
      "location": "cold-storage",
      "quantity": 12,
      "availableQuantity": 12
    }
  ],
  "totalQuantity": 48,
  "totalAvailable": 36,
  "status": "ADEQUATE"
}
```

## Supplier Management

### Performance Tracking

```javascript
// Get supplier performance metrics
GET /api/admin/suppliers/:supplierId/performance

// Response
{
  "metrics": {
    "onTimeDeliveryRate": 95.5,
    "qualityRating": 4.8,
    "responseTime": 2.5,
    "defectRate": 0.5,
    "returnRate": 1.2,
    "totalOrders": 156,
    "totalSpend": 45680.50,
    "averageOrderValue": 292.82
  },
  "overallScore": 4.6,
  "riskLevel": "LOW",
  "recommendations": [
    "Excellent supplier - consider volume discounts",
    "Qualify for preferred vendor status"
  ]
}
```

### Managing Alternative Suppliers

```javascript
// Set alternative suppliers for contingency
PUT /api/admin/suppliers/:supplierId/alternatives
{
  "alternativeSuppliers": ["altSupplier1Id", "altSupplier2Id"],
  "reason": "Backup suppliers for critical items"
}
```

## Purchase Orders

### Automatic Reorder Generation

```javascript
// Trigger automatic reorder check
POST /api/admin/inventory/reorder/check

// Response
{
  "itemsBelowReorderPoint": 5,
  "purchaseOrdersCreated": 3,
  "orders": [
    {
      "orderNumber": "PO-202401-0001",
      "supplier": "Fresh Produce Co",
      "items": 3,
      "totalAmount": 456.80,
      "status": "DRAFT"
    }
  ]
}
```

### Manual Purchase Order Creation

```javascript
POST /api/admin/purchase-orders
{
  "supplier": "supplierId",
  "type": "REGULAR",
  "priority": "NORMAL",
  "items": [
    {
      "inventoryItem": "itemId",
      "quantity": 50,
      "unitPrice": 3.50
    }
  ],
  "requiredDate": "2024-01-20",
  "deliveryAddress": {
    "location": "Main Kitchen",
    "instructions": "Deliver to receiving dock"
  }
}
```

### Approval Workflow

```javascript
// Submit for approval
PUT /api/admin/purchase-orders/:orderId/submit

// Approve purchase order
PUT /api/admin/purchase-orders/:orderId/approve
{
  "level": 1,
  "comments": "Approved - within budget"
}
```

## Stock Receiving

### Complete Receiving Process

```javascript
POST /api/admin/inventory/receive
{
  "purchaseOrderId": "orderId",
  "deliveryNote": "DN-2024-001",
  "temperature": 3.5,
  "items": [
    {
      "inventoryItemId": "itemId",
      "quantity": 50,
      "batchNumber": "BATCH-2024-001",
      "expiryDate": "2024-02-15",
      "location": "cold-storage",
      "qualityCheck": {
        "passed": true,
        "temperature": 3.2,
        "appearance": "Fresh, no damage",
        "packaging": "Intact"
      }
    }
  ],
  "photos": ["receipt-photo-url"],
  "notes": "All items received in good condition"
}
```

### Quality Control

```javascript
// Record quality issues
POST /api/admin/inventory/quality-issues
{
  "purchaseOrderId": "orderId",
  "inventoryItemId": "itemId",
  "issue": {
    "type": "QUALITY",
    "quantity": 5,
    "description": "Items showed signs of spoilage",
    "resolution": "Items rejected and credit requested"
  }
}
```

## Inventory Operations

### Stock Transfers

```javascript
// Transfer between locations
POST /api/admin/inventory/transfer
{
  "inventoryItemId": "itemId",
  "quantity": 10,
  "fromLocation": {
    "location": "main-storage",
    "zone": "A",
    "bin": "A-12"
  },
  "toLocation": {
    "location": "kitchen-prep",
    "zone": "B"
  },
  "notes": "Daily transfer for prep"
}
```

### Waste Management

```javascript
// Record waste with prevention measures
POST /api/admin/inventory/waste
{
  "items": [
    {
      "inventoryItemId": "itemId",
      "quantity": 2.5,
      "location": "kitchen-prep"
    }
  ],
  "type": "EXPIRED",
  "reason": "Past expiry date",
  "preventionMeasures": "Implement FIFO labeling system",
  "notes": "Found during morning inventory check"
}
```

### Cycle Counting

```javascript
// Perform cycle count
POST /api/admin/inventory/cycle-count
{
  "inventoryItemId": "itemId",
  "countedQuantity": 45,
  "location": "main-storage",
  "notes": "Monthly cycle count"
}

// Response
{
  "systemQuantity": 48,
  "countedQuantity": 45,
  "variance": -3,
  "variancePercentage": -6.25,
  "requiresApproval": true,
  "status": "PENDING_APPROVAL"
}
```

## Recipe Costing

### Calculate Recipe Cost

```javascript
// Get complete recipe cost breakdown
GET /api/admin/recipes/:recipeId/cost

// Response
{
  "recipe": {
    "name": "Margherita Pizza",
    "yield": 1,
    "unit": "pizza"
  },
  "costs": {
    "foodCost": 3.85,
    "laborCost": 1.25,
    "overheadCost": 0.74,
    "totalCost": 5.84,
    "portionCost": 5.84
  },
  "ingredients": [
    {
      "item": "Pizza Dough",
      "quantity": 250,
      "unit": "g",
      "unitCost": 0.008,
      "adjustedCost": 2.10,
      "percentageOfTotal": 36.0
    }
  ],
  "pricing": {
    "currentPrice": 18.00,
    "suggestedPrice": 19.47,
    "actualFoodCostPercentage": 32.4,
    "profitMargin": 67.6,
    "markup": 208.2
  }
}
```

### Menu Profitability Analysis

```javascript
// Analyze menu performance
GET /api/admin/analytics/menu-profitability?period=30

// Response
{
  "matrix": {
    "stars": {
      "count": 8,
      "items": ["Margherita Pizza", "Caesar Salad"],
      "totalContribution": 12450.00,
      "recommendation": "Premium placement, maintain quality"
    },
    "puzzles": {
      "count": 5,
      "items": ["Truffle Pasta"],
      "totalContribution": 3200.00,
      "recommendation": "Increase visibility, sampling"
    },
    "plowhorses": {
      "count": 6,
      "items": ["French Fries"],
      "totalContribution": 4500.00,
      "recommendation": "Optimize costs, review portions"
    },
    "dogs": {
      "count": 3,
      "items": ["Soup of the Day"],
      "totalContribution": 450.00,
      "recommendation": "Remove or reimagine"
    }
  }
}
```

## Analytics & Reporting

### Inventory Valuation

```javascript
// Get real-time inventory value
GET /api/admin/inventory/valuation

// Response
{
  "totalValue": 45678.90,
  "byCategory": {
    "produce": 8234.50,
    "meat": 15678.40,
    "dairy": 5432.00
  },
  "byLocation": {
    "main-storage": 35678.90,
    "kitchen-prep": 10000.00
  },
  "topValueItems": [
    {
      "name": "Prime Beef",
      "value": 5678.00,
      "quantity": 50
    }
  ]
}
```

### ABC Analysis

```javascript
// Perform ABC analysis
GET /api/admin/inventory/abc-analysis

// Response
{
  "summary": {
    "A": {
      "count": 15,
      "percentage": 20,
      "value": 45000,
      "recommendation": "Tight control, frequent reviews"
    },
    "B": {
      "count": 30,
      "percentage": 30,
      "value": 15000,
      "recommendation": "Moderate control, periodic reviews"
    },
    "C": {
      "count": 55,
      "percentage": 50,
      "value": 5000,
      "recommendation": "Simple control, infrequent reviews"
    }
  }
}
```

### Expiring Items Report

```javascript
// Get items expiring soon
GET /api/admin/inventory/expiring?days=7

// Response
{
  "expiringItems": [
    {
      "item": "Fresh Milk",
      "batch": "BATCH-2024-001",
      "quantity": 10,
      "expiryDate": "2024-01-18",
      "daysUntilExpiry": 2,
      "value": 45.00,
      "action": "USE_IMMEDIATELY",
      "location": "cold-storage"
    }
  ],
  "totalValue": 234.50,
  "recommendations": [
    "Run promotion on items expiring in 3 days",
    "Transfer near-expiry items to prep kitchen"
  ]
}
```

### Stock Turnover Analysis

```javascript
// Analyze stock turnover
GET /api/admin/inventory/turnover-analysis?period=30

// Response
[
  {
    "item": {
      "name": "Tomatoes",
      "category": "produce"
    },
    "currentStock": 25,
    "usage": 450,
    "turnoverRate": "18.00",
    "daysOnHand": 20,
    "status": "FAST_MOVING",
    "recommendation": "Ensure adequate stock"
  }
]
```

## API Endpoints

### Inventory Items
- `GET /api/admin/inventory` - List all items with filters
- `POST /api/admin/inventory/items` - Create new item
- `GET /api/admin/inventory/items/:id` - Get item details
- `PUT /api/admin/inventory/items/:id` - Update item
- `DELETE /api/admin/inventory/items/:id` - Delete item
- `GET /api/admin/inventory/items/:id/movements` - Get item history
- `GET /api/admin/inventory/items/:id/batches` - Get active batches

### Suppliers
- `GET /api/admin/suppliers` - List all suppliers
- `POST /api/admin/suppliers` - Create supplier
- `GET /api/admin/suppliers/:id` - Get supplier details
- `PUT /api/admin/suppliers/:id` - Update supplier
- `GET /api/admin/suppliers/:id/performance` - Get performance metrics
- `PUT /api/admin/suppliers/:id/approve` - Approve supplier

### Purchase Orders
- `GET /api/admin/purchase-orders` - List orders
- `POST /api/admin/purchase-orders` - Create order
- `GET /api/admin/purchase-orders/:id` - Get order details
- `PUT /api/admin/purchase-orders/:id/submit` - Submit for approval
- `PUT /api/admin/purchase-orders/:id/approve` - Approve order
- `PUT /api/admin/purchase-orders/:id/send` - Send to supplier
- `POST /api/admin/purchase-orders/:id/receive` - Receive items

### Operations
- `POST /api/admin/inventory/receive` - Receive stock
- `POST /api/admin/inventory/transfer` - Transfer stock
- `POST /api/admin/inventory/waste` - Record waste
- `POST /api/admin/inventory/cycle-count` - Perform count
- `POST /api/admin/inventory/adjustment` - Make adjustment

### Analytics
- `GET /api/admin/inventory/valuation` - Get valuation
- `GET /api/admin/inventory/low-stock` - Low stock alerts
- `GET /api/admin/inventory/expiring` - Expiring items
- `GET /api/admin/inventory/abc-analysis` - ABC analysis
- `GET /api/admin/inventory/turnover-analysis` - Turnover analysis
- `GET /api/admin/analytics/menu-profitability` - Menu analysis
- `GET /api/admin/analytics/price-changes` - Price monitoring

## Best Practices

### 1. Initial Setup
- Define clear categories and subcategories
- Set up all unit conversions before creating items
- Configure storage locations with zones and bins
- Establish supplier relationships with contracts

### 2. Daily Operations
- Receive stock immediately upon delivery
- Perform quality checks on all perishables
- Update batch information for FIFO management
- Record waste with prevention measures

### 3. Periodic Tasks
- **Daily**: Check low stock alerts, review expiring items
- **Weekly**: Perform cycle counts on A-class items
- **Monthly**: Full ABC analysis, supplier performance review
- **Quarterly**: Recipe cost updates, menu profitability analysis

### 4. Cost Control
- Use appropriate costing method (FIFO for perishables)
- Track yield variances in recipes
- Monitor supplier price changes
- Adjust menu prices based on cost analysis

### 5. Optimization Tips
- Set reorder points at 1.5x average daily usage + lead time
- Use safety stock for critical items only
- Implement automatic reordering for stable items
- Review and adjust EOQ calculations quarterly

### 6. Integration
- Connect with POS for automatic deductions
- Link recipes to menu items for real-time costing
- Use barcode scanners for receiving and counting
- Implement temperature monitoring for cold storage

## Troubleshooting

### Common Issues

1. **Negative Stock Levels**
   - Check for missed receiving entries
   - Verify unit conversions are correct
   - Review recent cycle count adjustments

2. **Cost Variances**
   - Ensure costing method matches business needs
   - Check for missing supplier invoice updates
   - Verify batch costs are being tracked

3. **Reorder Not Triggering**
   - Confirm reorder points are set
   - Check item is marked as active
   - Verify preferred supplier is assigned

4. **Recipe Cost Inaccuracies**
   - Update ingredient costs regularly
   - Check unit conversions in recipes
   - Include waste percentages in calculations

## Advanced Features

### Multi-Location Management
```javascript
// Get consolidated stock across locations
GET /api/admin/inventory/consolidated?group=location

// Transfer between restaurants
POST /api/admin/inventory/inter-branch-transfer
{
  "fromBranch": "branch1",
  "toBranch": "branch2",
  "items": [...],
  "approvedBy": "managerId"
}
```

### Forecasting
```javascript
// Get demand forecast
GET /api/admin/inventory/forecast/:itemId?period=30

// Response includes seasonal adjustments,
// trends, and recommended order quantities
```

### Contract Management
```javascript
// Monitor contract compliance
GET /api/admin/suppliers/:id/contracts/compliance

// Get price variance from contracts
GET /api/admin/analytics/contract-variance
```

This guide covers the complete end-to-end workflow of the inventory management system. For specific implementation details or custom requirements, refer to the API documentation or contact support.