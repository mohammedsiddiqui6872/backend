const express = require('express');
const router = express.Router();
const Supplier = require('../../models/Supplier');
const PurchaseOrder = require('../../models/PurchaseOrder');
const StockMovement = require('../../models/StockMovement');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { body, query, param } = require('express-validator');

// Middleware to ensure tenant context
const ensureTenant = (req, res, next) => {
  if (!req.user.tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  req.tenantId = req.user.tenantId;
  next();
};

// Get all suppliers with filters
router.get('/',
  authenticate,
  authorize(['suppliers.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const {
        status,
        category,
        rating,
        search,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 50
      } = req.query;
      
      const query = { tenantId: req.tenantId };
      
      if (status) query.status = status;
      if (category) query.categories = category;
      if (rating) query.rating = { $gte: parseInt(rating) };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { contactPerson: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [suppliers, total] = await Promise.all([
        Supplier.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Supplier.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          suppliers,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }
);

// Get single supplier with performance metrics
router.get('/:id',
  authenticate,
  authorize(['suppliers.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      // Get recent orders
      const recentOrders = await PurchaseOrder.find({
        tenantId: req.tenantId,
        supplier: supplier._id
      })
      .sort({ orderDate: -1 })
      .limit(10)
      .select('orderNumber orderDate totalAmount status paymentStatus');
      
      // Calculate performance metrics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      
      const orders = await PurchaseOrder.find({
        tenantId: req.tenantId,
        supplier: supplier._id,
        orderDate: { $gte: startDate, $lte: endDate }
      });
      
      let onTimeDeliveries = 0;
      let totalDeliveries = 0;
      let totalOrderValue = 0;
      
      orders.forEach(order => {
        if (order.receivingStatus === 'COMPLETE') {
          totalDeliveries++;
          if (order.receivedDate <= order.expectedDeliveryDate) {
            onTimeDeliveries++;
          }
        }
        totalOrderValue += order.totalAmount;
      });
      
      const performance = {
        totalOrders: orders.length,
        totalOrderValue,
        averageOrderValue: orders.length > 0 ? totalOrderValue / orders.length : 0,
        onTimeDeliveryRate: totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0,
        qualityScore: supplier.performance.qualityScore,
        responseTime: supplier.performance.responseTime
      };
      
      res.json({
        success: true,
        data: {
          supplier,
          recentOrders,
          performance
        }
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  }
);

// Create supplier
router.post('/',
  authenticate,
  authorize(['suppliers.manage']),
  ensureTenant,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const supplierData = {
        ...req.body,
        tenantId: req.tenantId,
        createdBy: req.user._id
      };
      
      // Check for duplicate code
      const existing = await Supplier.findOne({
        tenantId: req.tenantId,
        code: supplierData.code
      });
      
      if (existing) {
        return res.status(400).json({ error: 'Supplier code already exists' });
      }
      
      const supplier = new Supplier(supplierData);
      await supplier.save();
      
      res.status(201).json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
);

// Update supplier
router.put('/:id',
  authenticate,
  authorize(['suppliers.manage']),
  ensureTenant,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      // Don't allow changing critical fields
      delete req.body.tenantId;
      delete req.body.code;
      
      Object.assign(supplier, req.body);
      supplier.updatedBy = req.user._id;
      
      await supplier.save();
      
      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }
);

// Update supplier status
router.patch('/:id/status',
  authenticate,
  authorize(['suppliers.manage']),
  ensureTenant,
  [
    body('status').isIn(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      supplier.status = req.body.status;
      if (req.body.reason) {
        supplier.statusChangeReason = req.body.reason;
      }
      
      await supplier.save();
      
      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Error updating supplier status:', error);
      res.status(500).json({ error: 'Failed to update supplier status' });
    }
  }
);

// Rate supplier
router.post('/:id/rate',
  authenticate,
  authorize(['suppliers.manage']),
  ensureTenant,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('category').isIn(['quality', 'delivery', 'pricing', 'communication', 'overall'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { rating, category, comments } = req.body;
      
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      // Add rating
      if (!supplier.ratings) {
        supplier.ratings = [];
      }
      
      supplier.ratings.push({
        category,
        rating,
        comments,
        ratedBy: req.user._id,
        ratedDate: new Date()
      });
      
      // Update overall rating
      const overallRatings = supplier.ratings.filter(r => r.category === 'overall');
      if (overallRatings.length > 0) {
        supplier.rating = overallRatings.reduce((sum, r) => sum + r.rating, 0) / overallRatings.length;
      }
      
      await supplier.save();
      
      res.json({
        success: true,
        data: {
          rating: supplier.rating,
          totalRatings: supplier.ratings.length
        }
      });
    } catch (error) {
      console.error('Error rating supplier:', error);
      res.status(500).json({ error: 'Failed to rate supplier' });
    }
  }
);

// Get supplier catalog
router.get('/:id/catalog',
  authenticate,
  authorize(['suppliers.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      })
      .populate('catalog.inventoryItem', 'name sku category baseUnit');
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      const { search, category, inStock } = req.query;
      
      let catalog = supplier.catalog || [];
      
      if (search) {
        catalog = catalog.filter(item => 
          item.inventoryItem.name.toLowerCase().includes(search.toLowerCase()) ||
          item.supplierSKU.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (category) {
        catalog = catalog.filter(item => 
          item.inventoryItem.category === category
        );
      }
      
      if (inStock === 'true') {
        catalog = catalog.filter(item => item.inStock);
      }
      
      res.json({
        success: true,
        data: catalog
      });
    } catch (error) {
      console.error('Error fetching supplier catalog:', error);
      res.status(500).json({ error: 'Failed to fetch supplier catalog' });
    }
  }
);

// Update catalog item
router.put('/:id/catalog/:itemId',
  authenticate,
  authorize(['suppliers.manage']),
  ensureTenant,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      const catalogItem = supplier.catalog.id(req.params.itemId);
      if (!catalogItem) {
        return res.status(404).json({ error: 'Catalog item not found' });
      }
      
      Object.assign(catalogItem, req.body);
      catalogItem.lastUpdated = new Date();
      
      await supplier.save();
      
      res.json({
        success: true,
        data: catalogItem
      });
    } catch (error) {
      console.error('Error updating catalog item:', error);
      res.status(500).json({ error: 'Failed to update catalog item' });
    }
  }
);

// Get supplier performance analytics
router.get('/:id/analytics',
  authenticate,
  authorize(['suppliers.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const { period = 30 } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      // Get orders in period
      const orders = await PurchaseOrder.find({
        tenantId: req.tenantId,
        supplier: supplier._id,
        orderDate: { $gte: startDate, $lte: endDate }
      });
      
      // Calculate metrics
      let totalSpend = 0;
      let deliveryMetrics = {
        onTime: 0,
        late: 0,
        early: 0
      };
      let qualityIssues = 0;
      let returns = 0;
      
      orders.forEach(order => {
        totalSpend += order.totalAmount;
        
        if (order.receivingStatus === 'COMPLETE') {
          if (order.receivedDate) {
            const daysDiff = Math.floor((order.receivedDate - order.expectedDeliveryDate) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 0) deliveryMetrics.onTime++;
            else if (daysDiff > 0) deliveryMetrics.late++;
            else deliveryMetrics.early++;
          }
        }
        
        if (order.hasDispute) qualityIssues++;
        if (order.hasReturns) returns++;
      });
      
      // Price trends
      const priceHistory = await StockMovement.aggregate([
        {
          $match: {
            tenantId: req.tenantId,
            type: 'PURCHASE',
            purchaseOrder: { $in: orders.map(o => o._id) },
            performedDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$performedDate' },
              year: { $year: '$performedDate' },
              item: '$inventoryItem'
            },
            avgPrice: { $avg: '$unitCost' },
            quantity: { $sum: '$quantity' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          period: { startDate, endDate, days: period },
          summary: {
            totalOrders: orders.length,
            totalSpend,
            averageOrderValue: orders.length > 0 ? totalSpend / orders.length : 0,
            qualityIssues,
            returns
          },
          deliveryMetrics,
          priceHistory,
          performance: {
            deliveryScore: deliveryMetrics.onTime / (deliveryMetrics.onTime + deliveryMetrics.late + deliveryMetrics.early) * 100,
            qualityScore: ((orders.length - qualityIssues) / orders.length) * 100,
            overallScore: supplier.rating
          }
        }
      });
    } catch (error) {
      console.error('Error fetching supplier analytics:', error);
      res.status(500).json({ error: 'Failed to fetch supplier analytics' });
    }
  }
);

// Risk assessment
router.get('/:id/risk-assessment',
  authenticate,
  authorize(['suppliers.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const supplier = await Supplier.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      
      const riskFactors = [];
      let overallRisk = 'LOW';
      
      // Financial risk
      if (supplier.financialInfo) {
        if (supplier.financialInfo.creditScore < 600) {
          riskFactors.push({
            category: 'FINANCIAL',
            level: 'HIGH',
            description: 'Low credit score'
          });
        }
      }
      
      // Performance risk
      if (supplier.performance.deliveryRate < 80) {
        riskFactors.push({
          category: 'DELIVERY',
          level: 'MEDIUM',
          description: 'Below target delivery rate'
        });
      }
      
      if (supplier.performance.qualityScore < 85) {
        riskFactors.push({
          category: 'QUALITY',
          level: 'MEDIUM',
          description: 'Quality issues reported'
        });
      }
      
      // Compliance risk
      const today = new Date();
      if (supplier.certifications) {
        supplier.certifications.forEach(cert => {
          if (cert.expiryDate && cert.expiryDate < today) {
            riskFactors.push({
              category: 'COMPLIANCE',
              level: 'HIGH',
              description: `${cert.type} certification expired`
            });
          }
        });
      }
      
      // Dependency risk
      const orders = await PurchaseOrder.countDocuments({
        tenantId: req.tenantId,
        supplier: supplier._id,
        orderDate: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });
      
      if (orders > 20) {
        riskFactors.push({
          category: 'DEPENDENCY',
          level: 'MEDIUM',
          description: 'High dependency on single supplier'
        });
      }
      
      // Determine overall risk
      const highRisks = riskFactors.filter(r => r.level === 'HIGH').length;
      const mediumRisks = riskFactors.filter(r => r.level === 'MEDIUM').length;
      
      if (highRisks > 0) overallRisk = 'HIGH';
      else if (mediumRisks > 2) overallRisk = 'MEDIUM';
      
      res.json({
        success: true,
        data: {
          supplier: {
            id: supplier._id,
            name: supplier.name,
            code: supplier.code
          },
          overallRisk,
          riskFactors,
          recommendations: generateRiskRecommendations(riskFactors),
          lastAssessment: new Date()
        }
      });
    } catch (error) {
      console.error('Error assessing supplier risk:', error);
      res.status(500).json({ error: 'Failed to assess supplier risk' });
    }
  }
);

// Helper function for risk recommendations
function generateRiskRecommendations(riskFactors) {
  const recommendations = [];
  
  riskFactors.forEach(risk => {
    switch (risk.category) {
      case 'FINANCIAL':
        recommendations.push('Request updated financial statements');
        recommendations.push('Consider payment terms adjustment');
        break;
      case 'DELIVERY':
        recommendations.push('Implement stricter SLAs');
        recommendations.push('Identify backup suppliers');
        break;
      case 'QUALITY':
        recommendations.push('Increase quality inspections');
        recommendations.push('Schedule supplier audit');
        break;
      case 'COMPLIANCE':
        recommendations.push('Request certification renewal');
        recommendations.push('Verify compliance status');
        break;
      case 'DEPENDENCY':
        recommendations.push('Diversify supplier base');
        recommendations.push('Develop contingency plans');
        break;
    }
  });
  
  return [...new Set(recommendations)]; // Remove duplicates
}

module.exports = router;