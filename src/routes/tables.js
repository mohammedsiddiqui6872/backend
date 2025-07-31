// src/routes/tables.js
const express = require('express');
const router = express.Router();
const TableState = require('../models/TableState');
const Table = require('../models/Table');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const WaiterSession = require('../models/WaiterSession');
const { authenticate, authorize } = require('../middleware/auth');

// Get all tables
router.get('/', authenticate, async (req, res) => {
  try {
    // Add tenant filter
    const filter = {};
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    const tables = await Table.find(filter).sort('tableNumber');
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all table states with details
router.get('/state', authenticate, async (req, res) => {
  try {
    const tables = await TableState.getAllTableStates();
    
    // Enrich with additional data
    const tablesWithDetails = await Promise.all(tables.map(async (table) => {
      const tableData = table.toObject();
      
      // Get active orders for the table with tenant filter
      const orderFilter = {
        tableNumber: table.tableNumber,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        paymentStatus: { $ne: 'paid' }
      };
      if (req.tenantId) {
        orderFilter.tenantId = req.tenantId;
      }
      const activeOrders = await Order.find(orderFilter).populate('items.menuItem').sort('-createdAt');
      
      // Get waiter session info if waiter is assigned
      let waiterSessionInfo = null;
      if (table.currentWaiter) {
        const waiterSession = await WaiterSession.getActiveSession(table.currentWaiter._id);
        if (waiterSession) {
          waiterSessionInfo = {
            loginTime: waiterSession.loginTime,
            lastActivity: waiterSession.lastActivity,
            duration: Math.round((Date.now() - waiterSession.loginTime) / (1000 * 60)) // minutes
          };
        }
      }
      
      return {
        ...tableData,
        activeOrders,
        waiterSessionInfo
      };
    }));
    
    res.json(tablesWithDetails);
  } catch (error) {
    console.error('Error fetching table states:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific table state
router.get('/state/:tableNumber', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    const stateFilter = { tableNumber };
    if (req.tenantId) {
      stateFilter.tenantId = req.tenantId;
    }
    const tableState = await TableState.findOne(stateFilter)
      .populate('currentWaiter', 'name email')
      .populate('assistingWaiters', 'name email')
      .populate('activeCustomerSession');
    
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Get active orders with tenant filter
    const orderFilter = {
      tableNumber: tableNumber,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' }
    };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const activeOrders = await Order.find(orderFilter).populate('items.menuItem').sort('-createdAt');
    
    // Get waiter session info
    let waiterSessionInfo = null;
    if (tableState.currentWaiter) {
      const waiterSession = await WaiterSession.getActiveSession(tableState.currentWaiter._id);
      if (waiterSession) {
        waiterSessionInfo = {
          loginTime: waiterSession.loginTime,
          lastActivity: waiterSession.lastActivity,
          duration: Math.round((Date.now() - waiterSession.loginTime) / (1000 * 60))
        };
      }
    }
    
    res.json({
      ...tableState.toObject(),
      activeOrders,
      waiterSessionInfo
    });
  } catch (error) {
    console.error('Error fetching table state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign table to waiter
router.put('/:tableNumber/assign', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { waiterId } = req.body;
    const assignedBy = req.user._id;
    
    // Verify the user is admin or the waiter themselves
    if (req.user.role !== 'admin' && req.user._id.toString() !== waiterId) {
      return res.status(403).json({ error: 'Unauthorized to assign tables' });
    }
    
    // Get table state with tenant filter
    const stateFilter = { tableNumber };
    if (req.tenantId) {
      stateFilter.tenantId = req.tenantId;
    }
    const tableState = await TableState.findOne(stateFilter);
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check if table is already assigned
    if (tableState.currentWaiter && tableState.currentWaiter.toString() !== waiterId) {
      return res.status(400).json({ 
        error: 'Table is already assigned to another waiter',
        currentWaiter: tableState.currentWaiter
      });
    }
    
    // Assign table
    await tableState.assignWaiter(waiterId, assignedBy);
    
    // Update waiter session
    const waiterSession = await WaiterSession.getActiveSession(waiterId);
    if (waiterSession) {
      await waiterSession.addTable(tableNumber);
    }
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('table-assigned', {
        tableNumber,
        waiterId,
        assignedBy
      });
    }
    
    res.json({
      success: true,
      message: `Table ${tableNumber} assigned successfully`,
      tableState: await tableState.populate('currentWaiter', 'name email')
    });
  } catch (error) {
    console.error('Error assigning table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release/unassign table
router.put('/:tableNumber/release', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    // Get table state with tenant filter
    const stateFilter = { tableNumber };
    if (req.tenantId) {
      stateFilter.tenantId = req.tenantId;
    }
    const tableState = await TableState.findOne(stateFilter);
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check permissions - only current waiter or admin can release
    if (req.user.role !== 'admin' && 
        (!tableState.currentWaiter || tableState.currentWaiter.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized to release this table' });
    }
    
    // Check for active customer session with tenant filter
    if (tableState.activeCustomerSession) {
      const sessionFilter = { _id: tableState.activeCustomerSession };
      if (req.tenantId) {
        sessionFilter.tenantId = req.tenantId;
      }
      const customerSession = await CustomerSession.findOne(sessionFilter);
      if (customerSession && customerSession.isActive) {
        return res.status(400).json({ 
          error: 'Cannot release table with active customer session',
          customerName: customerSession.customerName
        });
      }
    }
    
    // Get waiter ID before clearing
    const waiterId = tableState.currentWaiter;
    
    // Clear table assignment
    tableState.currentWaiter = null;
    tableState.assistingWaiters = [];
    tableState.status = 'available';
    await tableState.save();
    
    // Update waiter session if exists
    if (waiterId) {
      const waiterSession = await WaiterSession.getActiveSession(waiterId);
      if (waiterSession) {
        await waiterSession.removeTable(tableNumber);
      }
    }
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('table-released', {
        tableNumber,
        releasedBy: req.user._id
      });
    }
    
    res.json({
      success: true,
      message: `Table ${tableNumber} released successfully`,
      tableState
    });
  } catch (error) {
    console.error('Error releasing table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update table status
router.put('/:tableNumber/status', authenticate, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get table state with tenant filter
    const stateFilter = { tableNumber };
    if (req.tenantId) {
      stateFilter.tenantId = req.tenantId;
    }
    const tableState = await TableState.findOne(stateFilter);
    if (!tableState) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && 
        (!tableState.currentWaiter || tableState.currentWaiter.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized to update table status' });
    }
    
    // Update status
    await tableState.updateStatus(status);
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('table-status-updated', {
        tableNumber,
        status,
        updatedBy: req.user._id
      });
    }
    
    res.json({
      success: true,
      message: `Table ${tableNumber} status updated to ${status}`,
      tableState
    });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new table (admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { number, capacity, section, notes } = req.body;
    
    // Check if table already exists with tenant filter
    const tableFilter = { number };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    const existingTable = await Table.findOne(tableFilter);
    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists' });
    }
    
    // Create table in old model (for compatibility)
    const table = new Table({
      number,
      capacity: capacity || 4,
      section: section || 'main',
      notes: notes || '',
      status: 'available',
      tenantId: req.tenantId
    });
    await table.save();
    
    // Create table state
    const tableState = new TableState({
      tableNumber: number,
      capacity: capacity || 4,
      tenantId: req.tenantId,
      section: section || 'main',
      notes: notes || '',
      status: 'available'
    });
    await tableState.save();
    
    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      table,
      tableState
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table (admin only)
router.delete('/:tableNumber', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    // Check for active sessions with tenant filter
    const sessionFilter = {
      tableNumber,
      isActive: true
    };
    if (req.tenantId) {
      sessionFilter.tenantId = req.tenantId;
    }
    const activeSession = await CustomerSession.findOne(sessionFilter);
    
    if (activeSession) {
      return res.status(400).json({ 
        error: 'Cannot delete table with active customer session' 
      });
    }
    
    // Check for active orders with tenant filter
    const orderFilter = {
      tableNumber,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' }
    };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const activeOrders = await Order.find(orderFilter);
    
    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete table with active orders' 
      });
    }
    
    // Delete from both models with tenant filter
    const deleteTableFilter = { number: tableNumber };
    const deleteStateFilter = { tableNumber };
    if (req.tenantId) {
      deleteTableFilter.tenantId = req.tenantId;
      deleteStateFilter.tenantId = req.tenantId;
    }
    await Table.findOneAndDelete(deleteTableFilter);
    await TableState.findOneAndDelete(deleteStateFilter);
    
    res.json({
      success: true,
      message: `Table ${tableNumber} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;