const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');

// Test endpoint for mobile app
router.get('/test', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      tenant: {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name,
        subdomain: req.tenant.subdomain
      }
    });
  } catch (error) {
    console.error('Mobile test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get waiter tables without WaiterSession requirement
router.get('/waiter-tables', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    if (req.user.role !== 'waiter') {
      return res.status(403).json({ error: 'Only waiters can access this endpoint' });
    }

    const Table = require('../models/Table');
    const Order = require('../models/Order');

    // Get all tables for the tenant
    const tables = await Table.find({ 
      tenantId: req.tenant.tenantId,
      isActive: true 
    })
    .populate('currentWaiter', 'name')
    .sort('number');

    // Get active orders for each table
    const tableNumbers = tables.map(t => t.number);
    const activeOrders = await Order.find({
      tenantId: req.tenant.tenantId,
      tableNumber: { $in: tableNumbers },
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
    });

    // Group orders by table
    const ordersByTable = {};
    activeOrders.forEach(order => {
      if (!ordersByTable[order.tableNumber]) {
        ordersByTable[order.tableNumber] = [];
      }
      ordersByTable[order.tableNumber].push(order);
    });

    // Format tables for mobile app
    const formattedTables = tables.map(table => ({
      _id: table._id,
      number: table.number,
      status: table.status,
      capacity: table.capacity,
      zone: table.location?.zone || table.location?.section || 'main',
      activeOrders: ordersByTable[table.number] || [],
      currentGuests: table.activeCustomerSession ? table.capacity : 0,
      sessionInfo: table.sessionStartTime ? {
        loginTime: table.sessionStartTime,
        lastActivity: new Date()
      } : null
    }));

    // Count total orders across all tables
    const totalOrders = activeOrders.length;

    res.json({
      tables: formattedTables,
      totalOrders,
      waiterInfo: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Waiter tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;