// src/routes/admin/tables.js
const express = require('express');
const router = express.Router();
const Table = require('../../models/Table');
const Order = require('../../models/Order');
const { authenticate, authorize } = require('../../middleware/auth');
const QRCode = require('qrcode');

router.use(authenticate);
router.use(authorize('admin', 'manager', 'waiter'));

// Get all tables with complete details
router.get('/', async (req, res) => {
  try {
    const CustomerSession = require('../../models/CustomerSession');
    const TableState = require('../../models/TableState');
    const WaiterSession = require('../../models/WaiterSession');
    
    // Get all tables with tenant filter
    const tableFilter = {};
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const tables = await Table.find(tableFilter)
      .populate('currentOrder')
      .populate('waiter', 'name');

    // Get all active customer sessions with tenant filter
    const sessionFilter = { isActive: true };
    if (req.tenantId) {
      sessionFilter.tenantId = req.tenantId;
    }
    const activeSessions = await CustomerSession.find(sessionFilter)
      .populate('waiter', 'name email');
    
    // Get all active orders with tenant filter
    const orderFilter = {
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' }
    };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const activeOrders = await Order.find(orderFilter).populate('items.menuItem', 'name price');
    
    // Get table states with tenant filter
    const stateFilter = {};
    if (req.tenantId) {
      stateFilter.tenantId = req.tenantId;
    }
    const tableStates = await TableState.find(stateFilter)
      .populate('currentWaiter', 'name email')
      .populate('activeCustomerSession');
    
    // Map all data together
    const tablesWithDetails = tables.map(table => {
      const tableData = table.toObject();
      
      // Find customer session for this table
      const customerSession = activeSessions.find(
        session => session.tableNumber === table.number
      );
      
      // Find orders for this table
      const tableOrders = activeOrders.filter(
        order => order.tableNumber === table.number
      );
      
      // Find table state
      const tableState = tableStates.find(
        state => state.tableNumber === table.number
      );
      
      return {
        ...tableData,
        customerSession: customerSession || null,
        activeOrders: tableOrders,
        tableState: tableState || null,
        waiterInfo: tableState?.currentWaiter || null
      };
    });

    const tableStats = {
      total: tables.length,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      activeSessions: activeSessions.length,
      totalGuests: activeSessions.reduce((sum, session) => sum + (session.occupancy || 0), 0)
    };

    res.json({ tables: tablesWithDetails, stats: tableStats });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new table
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { number, capacity, location } = req.body;

    // Generate QR code for table
    const qrData = `${process.env.FRONTEND_URL}/table/${number}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const table = new Table({
      number,
      capacity,
      location,
      qrCode,
      tenantId: req.tenantId
    });

    await table.save();

    res.status(201).json({
      success: true,
      table,
      message: 'Table created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update table status
router.patch('/:tableNumber/status', async (req, res) => {
  try {
    const { status, waiterId } = req.body;

    const tableFilter = { number: req.params.tableNumber };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const table = await Table.findOne(tableFilter);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    table.status = status;
    
    if (status === 'occupied' && waiterId) {
      table.waiter = waiterId;
    } else if (status === 'available') {
      table.waiter = null;
      table.currentOrder = null;
    }

    await table.save();

    // Emit real-time update
    req.app.get('io').emit('table-status-update', {
      tableNumber: table.number,
      status: table.status
    });

    res.json({
      success: true,
      table,
      message: 'Table status updated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign waiter to table
router.patch('/:tableNumber/waiter', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { waiterId } = req.body;

    const tableFilter = { number: req.params.tableNumber };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const table = await Table.findOneAndUpdate(
      tableFilter,
      { waiter: waiterId },
      { new: true }
    ).populate('waiter', 'name');

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({
      success: true,
      table,
      message: 'Waiter assigned successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table history
router.get('/:tableNumber/history', async (req, res) => {
  try {
    const { date } = req.query;
    const query = { tableNumber: req.params.tableNumber };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Add tenant filter to query
    if (req.tenantId) {
      query.tenantId = req.tenantId;
    }
    
    const orders = await Order.find(query)
      .populate('waiter', 'name')
      .sort('-createdAt')
      .limit(50);

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => 
        order.paymentStatus === 'paid' ? sum + order.total : sum, 0
      ),
      averageOrderValue: orders.length ? 
        orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0
    };

    res.json({ orders, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate new QR code
router.post('/:tableNumber/qr-code', authorize('admin', 'manager'), async (req, res) => {
  try {
    const tableFilter = { number: req.params.tableNumber };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const table = await Table.findOne(tableFilter);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const qrData = `${process.env.FRONTEND_URL}/table/${table.number}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    table.qrCode = qrCode;
    await table.save();

    res.json({
      success: true,
      qrCode,
      message: 'QR code generated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete('/:tableNumber', authorize('admin'), async (req, res) => {
  try {
    const tableFilter = { number: req.params.tableNumber };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const table = await Table.findOne(tableFilter);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (table.status === 'occupied') {
      return res.status(400).json({ error: 'Cannot delete occupied table' });
    }

    await table.deleteOne();

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table layout
router.get('/layout', async (req, res) => {
  try {
    const tableFilter = { isActive: true };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const tables = await Table.find(tableFilter)
      .select('number capacity status location')
      .populate('currentOrder', 'orderNumber total')
      .populate('waiter', 'name');

    const layout = tables.reduce((acc, table) => {
      const floor = table.location?.floor || 'main';
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(table);
      return acc;
    }, {});

    res.json(layout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;