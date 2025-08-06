const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../../models/PurchaseOrder');
const Supplier = require('../../models/Supplier');
const InventoryItem = require('../../models/InventoryItem');
const inventoryService = require('../../services/inventoryService');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { body, query, param } = require('express-validator');
const mongoose = require('mongoose');

// Middleware to ensure tenant context
const ensureTenant = (req, res, next) => {
  if (!req.user.tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  req.tenantId = req.user.tenantId;
  next();
};

// Get all purchase orders with filters
router.get('/',
  authenticate,
  authorize(['purchase.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const {
        status,
        supplier,
        paymentStatus,
        startDate,
        endDate,
        search,
        sortBy = 'orderDate',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = req.query;
      
      const query = { tenantId: req.tenantId };
      
      if (status) query.status = status;
      if (supplier) query.supplier = supplier;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      
      if (startDate || endDate) {
        query.orderDate = {};
        if (startDate) query.orderDate.$gte = new Date(startDate);
        if (endDate) query.orderDate.$lte = new Date(endDate);
      }
      
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { supplierName: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        PurchaseOrder.find(query)
          .populate('supplier', 'name code')
          .populate('createdBy', 'name')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  }
);

// Get single purchase order
router.get('/:id',
  authenticate,
  authorize(['purchase.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      })
      .populate('supplier')
      .populate('items.inventoryItem')
      .populate('createdBy', 'name')
      .populate('approvals.approver', 'name')
      .populate('receivedBy', 'name')
      .populate('deliveries.receivedBy', 'name');
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  }
);

// Create purchase order
router.post('/',
  authenticate,
  authorize(['purchase.create']),
  ensureTenant,
  [
    body('supplier').notEmpty().withMessage('Supplier is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.inventoryItem').notEmpty(),
    body('items.*.quantity').isNumeric().isInt({ gt: 0 }),
    body('items.*.unitPrice').isNumeric()
  ],
  validateRequest,
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Generate order number
      const orderNumber = await PurchaseOrder.generateOrderNumber(req.tenantId);
      
      // Get supplier details
      const supplier = await Supplier.findOne({
        _id: req.body.supplier,
        tenantId: req.tenantId
      }).session(session);
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      // Validate and enrich items
      const enrichedItems = [];
      for (const item of req.body.items) {
        const inventoryItem = await InventoryItem.findOne({
          _id: item.inventoryItem,
          tenantId: req.tenantId
        }).session(session);
        
        if (!inventoryItem) {
          throw new Error(`Inventory item ${item.inventoryItem} not found`);
        }
        
        // Get supplier SKU and pricing
        const supplierItem = inventoryItem.suppliers.find(s => 
          s.supplier.toString() === supplier._id.toString()
        );
        
        enrichedItems.push({
          ...item,
          supplierSKU: supplierItem?.supplierSKU || '',
          description: item.description || inventoryItem.name,
          unit: item.unit || inventoryItem.baseUnit,
          unitPrice: item.unitPrice || supplierItem?.cost || 0
        });
      }
      
      // Create purchase order
      const orderData = {
        ...req.body,
        tenantId: req.tenantId,
        orderNumber,
        supplierName: supplier.name,
        items: enrichedItems,
        createdBy: req.user._id,
        status: req.body.status || 'DRAFT'
      };
      
      // Set delivery address if not provided
      if (!orderData.deliveryAddress) {
        orderData.deliveryAddress = {
          location: 'Main Warehouse',
          street: supplier.address?.street,
          city: supplier.address?.city
        };
      }
      
      // Set dates
      if (!orderData.requiredDate) {
        const requiredDate = new Date();
        requiredDate.setDate(requiredDate.getDate() + (supplier.leadTimeDays || 7));
        orderData.requiredDate = requiredDate;
      }
      
      if (!orderData.expectedDeliveryDate) {
        orderData.expectedDeliveryDate = orderData.requiredDate;
      }
      
      const order = new PurchaseOrder(orderData);
      await order.save({ session });
      
      // Update supplier last order date
      supplier.lastOrderDate = new Date();
      await supplier.save({ session });
      
      await session.commitTransaction();
      
      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating purchase order:', error);
      res.status(500).json({ error: error.message || 'Failed to create purchase order' });
    } finally {
      session.endSession();
    }
  }
);

// Update purchase order
router.put('/:id',
  authenticate,
  authorize(['purchase.edit']),
  ensureTenant,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      // Check if order can be edited
      if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot edit completed or cancelled orders' });
      }
      
      // Don't allow changing critical fields
      delete req.body.tenantId;
      delete req.body.orderNumber;
      delete req.body.createdBy;
      
      Object.assign(order, req.body);
      order.updatedBy = req.user._id;
      
      await order.save();
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({ error: 'Failed to update purchase order' });
    }
  }
);

// Submit order for approval
router.post('/:id/submit',
  authenticate,
  authorize(['purchase.create']),
  ensureTenant,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (order.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Only draft orders can be submitted' });
      }
      
      // Check if approval is required based on amount
      const approvalThreshold = 10000; // Can be configured
      
      if (order.totalAmount >= approvalThreshold) {
        order.status = 'PENDING_APPROVAL';
        order.approvalRequired = true;
        
        // Add approval levels based on amount
        if (order.totalAmount >= 50000) {
          order.approvals.push({
            level: 1,
            approver: req.body.level1Approver,
            status: 'PENDING'
          });
          order.approvals.push({
            level: 2,
            approver: req.body.level2Approver,
            status: 'PENDING'
          });
        } else {
          order.approvals.push({
            level: 1,
            approver: req.body.level1Approver,
            status: 'PENDING'
          });
        }
        
        order.currentApprovalLevel = 1;
      } else {
        order.status = 'APPROVED';
      }
      
      await order.save();
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error submitting purchase order:', error);
      res.status(500).json({ error: 'Failed to submit purchase order' });
    }
  }
);

// Approve purchase order
router.post('/:id/approve',
  authenticate,
  authorize(['purchase.approve']),
  ensureTenant,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (!order.canApprove(req.user._id, order.currentApprovalLevel)) {
        return res.status(403).json({ error: 'Not authorized to approve this order' });
      }
      
      // Update approval
      const approval = order.approvals.find(a => 
        a.level === order.currentApprovalLevel && a.status === 'PENDING'
      );
      
      if (approval) {
        approval.status = 'APPROVED';
        approval.approvedDate = new Date();
        approval.comments = req.body.comments;
      }
      
      // Check if all approvals are complete
      const pendingApprovals = order.approvals.filter(a => a.status === 'PENDING');
      
      if (pendingApprovals.length === 0) {
        order.status = 'APPROVED';
      } else {
        order.currentApprovalLevel++;
      }
      
      await order.save();
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error approving purchase order:', error);
      res.status(500).json({ error: 'Failed to approve purchase order' });
    }
  }
);

// Reject purchase order
router.post('/:id/reject',
  authenticate,
  authorize(['purchase.approve']),
  ensureTenant,
  [
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (!order.canApprove(req.user._id, order.currentApprovalLevel)) {
        return res.status(403).json({ error: 'Not authorized to reject this order' });
      }
      
      // Update approval
      const approval = order.approvals.find(a => 
        a.level === order.currentApprovalLevel && a.status === 'PENDING'
      );
      
      if (approval) {
        approval.status = 'REJECTED';
        approval.approvedDate = new Date();
        approval.comments = req.body.reason;
      }
      
      order.status = 'DRAFT'; // Send back to draft
      
      await order.save();
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error rejecting purchase order:', error);
      res.status(500).json({ error: 'Failed to reject purchase order' });
    }
  }
);

// Send order to supplier
router.post('/:id/send',
  authenticate,
  authorize(['purchase.send']),
  ensureTenant,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      }).populate('supplier');
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (order.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only approved orders can be sent' });
      }
      
      // Send order to supplier (implement actual sending logic)
      // This could be via email, API, etc.
      
      order.status = 'SENT';
      order.sentToSupplier = true;
      order.sentDate = new Date();
      order.sentMethod = req.body.method || 'EMAIL';
      
      await order.save();
      
      res.json({
        success: true,
        data: order,
        message: 'Purchase order sent to supplier'
      });
    } catch (error) {
      console.error('Error sending purchase order:', error);
      res.status(500).json({ error: 'Failed to send purchase order' });
    }
  }
);

// Receive stock
router.post('/:id/receive',
  authenticate,
  authorize(['purchase.receive']),
  ensureTenant,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.inventoryItemId').notEmpty(),
    body('items.*.quantity').isNumeric().isInt({ gt: 0 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (!['SENT', 'ACKNOWLEDGED', 'PARTIAL_RECEIVED'].includes(order.status)) {
        return res.status(400).json({ error: 'Order not ready for receiving' });
      }
      
      // Process receiving through inventory service
      const result = await inventoryService.receiveStock(
        req.tenantId,
        req.params.id,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error receiving stock:', error);
      res.status(500).json({ error: error.message || 'Failed to receive stock' });
    }
  }
);

// Record payment
router.post('/:id/payment',
  authenticate,
  authorize(['purchase.payment']),
  ensureTenant,
  [
    body('amount').isNumeric().isFloat({ gt: 0 }),
    body('paymentMethod').isIn(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'CREDIT_NOTE']),
    body('paymentDate').isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      const payment = {
        amount: req.body.amount,
        paymentDate: new Date(req.body.paymentDate),
        paymentMethod: req.body.paymentMethod,
        reference: req.body.reference,
        checkNumber: req.body.checkNumber,
        notes: req.body.notes,
        recordedBy: req.user._id
      };
      
      order.payments.push(payment);
      order.paidAmount = order.payments.reduce((sum, p) => sum + p.amount, 0);
      
      await order.save();
      
      res.json({
        success: true,
        data: {
          payment,
          totalPaid: order.paidAmount,
          balance: order.balanceAmount,
          paymentStatus: order.paymentStatus
        }
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }
);

// Cancel order
router.post('/:id/cancel',
  authenticate,
  authorize(['purchase.cancel']),
  ensureTenant,
  [
    body('reason').notEmpty().withMessage('Cancellation reason is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot cancel this order' });
      }
      
      order.status = 'CANCELLED';
      order.cancelledBy = req.user._id;
      order.cancelledDate = new Date();
      order.cancellationReason = req.body.reason;
      
      await order.save();
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
  }
);

// Process return
router.post('/:id/return',
  authenticate,
  authorize(['purchase.return']),
  ensureTenant,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.inventoryItem').notEmpty(),
    body('items.*.quantity').isNumeric().isInt({ gt: 0 }),
    body('items.*.reason').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      const returnData = {
        items: req.body.items,
        returnDate: new Date(),
        creditNoteNumber: req.body.creditNoteNumber,
        creditAmount: req.body.creditAmount || 0,
        status: 'PENDING'
      };
      
      order.returns.push(returnData);
      order.hasReturns = true;
      
      await order.save();
      
      res.json({
        success: true,
        data: returnData
      });
    } catch (error) {
      console.error('Error processing return:', error);
      res.status(500).json({ error: 'Failed to process return' });
    }
  }
);

// Raise dispute
router.post('/:id/dispute',
  authenticate,
  authorize(['purchase.dispute']),
  ensureTenant,
  [
    body('reason').notEmpty(),
    body('description').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      order.hasDispute = true;
      order.dispute = {
        reason: req.body.reason,
        description: req.body.description,
        raisedDate: new Date()
      };
      order.status = 'DISPUTED';
      
      await order.save();
      
      res.json({
        success: true,
        data: order.dispute
      });
    } catch (error) {
      console.error('Error raising dispute:', error);
      res.status(500).json({ error: 'Failed to raise dispute' });
    }
  }
);

// Get order summary/dashboard
router.get('/summary/dashboard',
  authenticate,
  authorize(['purchase.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [
        totalOrders,
        pendingApprovals,
        overdueOrders,
        recentOrders,
        monthlySpend
      ] = await Promise.all([
        PurchaseOrder.countDocuments({
          tenantId: req.tenantId,
          createdAt: { $gte: thirtyDaysAgo }
        }),
        PurchaseOrder.countDocuments({
          tenantId: req.tenantId,
          status: 'PENDING_APPROVAL'
        }),
        PurchaseOrder.countDocuments({
          tenantId: req.tenantId,
          expectedDeliveryDate: { $lt: today },
          status: { $nin: ['COMPLETED', 'CANCELLED'] }
        }),
        PurchaseOrder.find({
          tenantId: req.tenantId
        })
        .sort({ orderDate: -1 })
        .limit(5)
        .select('orderNumber supplierName totalAmount status orderDate')
        .populate('supplier', 'name'),
        PurchaseOrder.aggregate([
          {
            $match: {
              tenantId: req.tenantId,
              orderDate: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);
      
      res.json({
        success: true,
        data: {
          summary: {
            totalOrders,
            pendingApprovals,
            overdueOrders,
            monthlySpend: monthlySpend[0]?.total || 0
          },
          recentOrders
        }
      });
    } catch (error) {
      console.error('Error fetching order summary:', error);
      res.status(500).json({ error: 'Failed to fetch order summary' });
    }
  }
);

// Export orders
router.get('/export',
  authenticate,
  authorize(['purchase.export']),
  ensureTenant,
  async (req, res) => {
    try {
      const { format = 'csv', ...filters } = req.query;
      
      const query = { tenantId: req.tenantId };
      
      if (filters.startDate || filters.endDate) {
        query.orderDate = {};
        if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
      }
      
      const orders = await PurchaseOrder.find(query)
        .populate('supplier', 'name code')
        .populate('items.inventoryItem', 'name sku')
        .sort({ orderDate: -1 });
      
      // Format data based on export type
      let exportData;
      if (format === 'csv') {
        // Create CSV format
        const headers = ['Order Number', 'Date', 'Supplier', 'Total Amount', 'Status', 'Payment Status'];
        const rows = orders.map(order => [
          order.orderNumber,
          order.orderDate.toISOString().split('T')[0],
          order.supplierName,
          order.totalAmount,
          order.status,
          order.paymentStatus
        ]);
        
        exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=purchase-orders.csv');
      } else {
        exportData = orders;
        res.setHeader('Content-Type', 'application/json');
      }
      
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting orders:', error);
      res.status(500).json({ error: 'Failed to export orders' });
    }
  }
);

module.exports = router;