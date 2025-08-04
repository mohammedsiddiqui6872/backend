const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const StaffAssignment = require('../../models/StaffAssignment');
const AssignmentRule = require('../../models/AssignmentRule');
const Table = require('../../models/Table');
const User = require('../../models/User');
const TableState = require('../../models/TableState');
const WaiterSession = require('../../models/WaiterSession');
const Order = require('../../models/Order');

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(enterpriseTenantIsolation);

// Get current assignments with filters
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { floors, sections, waiters, status, tableTypes } = req.query;
    
    const filters = { tenantId: req.tenantId };
    
    // Apply filters
    if (floors) filters.floorId = { $in: floors.split(',') };
    if (sections) filters.sectionId = { $in: sections.split(',') };
    if (waiters) filters.waiterId = { $in: waiters.split(',') };
    if (tableTypes) {
      // Need to join with tables to filter by type
      const tables = await Table.find({ 
        tenantId: req.tenantId,
        type: { $in: tableTypes.split(',') }
      }).select('_id');
      filters.tableId = { $in: tables.map(t => t._id) };
    }
    
    // Default to active assignments unless specified
    if (status) {
      if (status.includes('assigned')) {
        filters.status = 'active';
      }
    } else {
      filters.status = 'active';
    }
    
    const assignments = await StaffAssignment.find(filters)
      .populate('waiterId', 'name email avatar')
      .populate('tableId', 'number displayName location type')
      .populate('assignedBy', 'name')
      .sort('-assignedAt');
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Assign waiter to table (from admin/tables.js)
router.post('/tables/:tableId/assign-waiter', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { waiterId, role = 'primary' } = req.body;
    const { tableId } = req.params;
    
    // Verify table exists and belongs to tenant
    const table = await Table.findOne({
      _id: tableId,
      tenantId: req.tenantId
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Verify waiter exists and is active
    const waiter = await User.findOne({
      _id: waiterId,
      tenantId: req.tenantId,
      role: 'waiter',
      isActive: true
    });
    
    if (!waiter) {
      return res.status(404).json({ error: 'Waiter not found or not active' });
    }
    
    // Check if table already has a primary waiter
    const existingAssignment = await StaffAssignment.findOne({
      tenantId: req.tenantId,
      tableId: table._id,
      role: 'primary',
      status: 'active'
    });
    
    if (existingAssignment && role === 'primary') {
      return res.status(400).json({ 
        error: 'Table already has a primary waiter assigned',
        currentWaiter: existingAssignment.waiterId
      });
    }
    
    // Create assignment
    const assignment = new StaffAssignment({
      tenantId: req.tenantId,
      tableId: table._id,
      tableNumber: table.number,
      waiterId: waiter._id,
      waiterName: waiter.name,
      role,
      assignedBy: req.user._id,
      assignedByName: req.user.name,
      sectionId: table.location?.section,
      floorId: table.location?.floor,
      reason: 'manual'
    });
    
    await assignment.save();
    
    // Update table with waiter assignment
    await table.assignWaiter(waiterId, role);
    
    // Update table state if exists
    const tableState = await TableState.findOne({ 
      tableNumber: table.number,
      tenantId: req.tenantId 
    });
    
    if (tableState) {
      await tableState.assignWaiter(waiterId, req.user._id);
    }
    
    // Update waiter session if exists
    const waiterSession = await WaiterSession.getActiveSession(waiterId);
    if (waiterSession) {
      await waiterSession.addTable(table.number);
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('assignment:created', {
        assignment: await StaffAssignment.findById(assignment._id)
          .populate('waiterId', 'name email avatar')
          .populate('tableId', 'number displayName location')
      });
    }
    
    res.json({
      success: true,
      data: assignment,
      message: `Waiter assigned as ${role}`
    });
  } catch (error) {
    console.error('Error assigning waiter:', error);
    res.status(500).json({ error: 'Failed to assign waiter' });
  }
});

// Remove waiter from table
router.post('/tables/:tableId/remove-waiter', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { waiterId } = req.body;
    const { tableId } = req.params;
    
    // Find active assignment
    const assignment = await StaffAssignment.findOne({
      tenantId: req.tenantId,
      tableId,
      waiterId,
      status: 'active'
    });
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // End assignment
    await assignment.endAssignment(req.user._id);
    
    // Update table
    const table = await Table.findById(tableId);
    if (table) {
      await table.removeWaiter(waiterId);
    }
    
    // Update table state
    const tableState = await TableState.findOne({ 
      tableNumber: assignment.tableNumber,
      tenantId: req.tenantId 
    });
    
    if (tableState) {
      await tableState.releaseWaiter();
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('assignment:ended', {
        assignmentId: assignment._id,
        tableNumber: assignment.tableNumber,
        waiterId: assignment.waiterId
      });
    }
    
    res.json({
      success: true,
      message: 'Waiter removed from table'
    });
  } catch (error) {
    console.error('Error removing waiter:', error);
    res.status(500).json({ error: 'Failed to remove waiter' });
  }
});

// Bulk assign waiters
router.post('/bulk-assign', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { tableIds, waiterId, role = 'primary', reason, notifyWaiter } = req.body;
    
    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return res.status(400).json({ error: 'Table IDs are required' });
    }
    
    const successful = [];
    const conflicts = [];
    
    // Verify waiter
    const waiter = await User.findOne({
      _id: waiterId,
      tenantId: req.tenantId,
      role: 'waiter',
      isActive: true
    });
    
    if (!waiter) {
      return res.status(404).json({ error: 'Waiter not found' });
    }
    
    // Process each table
    for (const tableId of tableIds) {
      try {
        const table = await Table.findOne({
          _id: tableId,
          tenantId: req.tenantId
        });
        
        if (!table) continue;
        
        // Check for existing assignment
        const existing = await StaffAssignment.findOne({
          tenantId: req.tenantId,
          tableId: table._id,
          role: 'primary',
          status: 'active'
        });
        
        if (existing && role === 'primary') {
          conflicts.push({
            tableId: table._id,
            tableNumber: table.number,
            currentWaiterId: existing.waiterId,
            currentWaiterName: existing.waiterName,
            newWaiterId: waiterId,
            newWaiterName: waiter.name
          });
          continue;
        }
        
        // Create assignment
        const assignment = new StaffAssignment({
          tenantId: req.tenantId,
          tableId: table._id,
          tableNumber: table.number,
          waiterId: waiter._id,
          waiterName: waiter.name,
          role,
          assignedBy: req.user._id,
          assignedByName: req.user.name,
          sectionId: table.location?.section,
          floorId: table.location?.floor,
          reason: reason || 'manual',
          notes: `Bulk assignment of ${tableIds.length} tables`
        });
        
        await assignment.save();
        await table.assignWaiter(waiterId, role);
        
        successful.push(assignment);
      } catch (error) {
        console.error(`Error assigning table ${tableId}:`, error);
      }
    }
    
    // Emit socket events
    const io = req.app.get('io');
    if (io && successful.length > 0) {
      io.to(`tenant:${req.tenantId}`).emit('assignment:bulk-created', {
        assignments: successful,
        waiterId,
        waiterName: waiter.name
      });
    }
    
    res.json({
      successful,
      conflicts
    });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ error: 'Failed to perform bulk assignment' });
  }
});

// Get waiter loads
router.get('/waiter-loads', authorize('admin', 'manager'), async (req, res) => {
  try {
    const waiterLoads = await StaffAssignment.getWaiterLoads(req.tenantId);
    res.json(waiterLoads);
  } catch (error) {
    console.error('Error fetching waiter loads:', error);
    res.status(500).json({ error: 'Failed to fetch waiter loads' });
  }
});

// Get available waiters
router.get('/available-waiters', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { shiftId } = req.query;
    
    // Get all active waiters
    let waiters = await User.find({
      tenantId: req.tenantId,
      role: 'waiter',
      isActive: true
    }).select('name email maxTables');
    
    // If shift specified, filter by shift
    if (shiftId) {
      const Shift = require('../../models/Shift');
      const shift = await Shift.findById(shiftId);
      if (shift) {
        waiters = waiters.filter(w => w._id.toString() === shift.employee.toString());
      }
    }
    
    // Get current loads
    const loads = await StaffAssignment.getWaiterLoads(req.tenantId);
    
    // Filter available waiters
    const availableWaiters = loads.filter(load => load.isAvailable);
    
    res.json(availableWaiters);
  } catch (error) {
    console.error('Error fetching available waiters:', error);
    res.status(500).json({ error: 'Failed to fetch available waiters' });
  }
});

// Get assignment history
router.get('/history', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { tableNumber, waiterId, startDate, endDate, limit = 100 } = req.query;
    
    const query = { tenantId: req.tenantId };
    
    if (tableNumber) query.tableNumber = tableNumber;
    if (waiterId) query.waiterId = waiterId;
    
    if (startDate || endDate) {
      query.assignedAt = {};
      if (startDate) query.assignedAt.$gte = new Date(startDate);
      if (endDate) query.assignedAt.$lte = new Date(endDate);
    }
    
    const history = await StaffAssignment.find(query)
      .populate('waiterId', 'name')
      .populate('assignedBy', 'name')
      .sort('-assignedAt')
      .limit(parseInt(limit));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Export history
router.get('/history/export', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Get history data
    const query = { tenantId: req.tenantId };
    if (filters.waiterId) query.waiterId = filters.waiterId;
    if (filters.tableNumber) query.tableNumber = filters.tableNumber;
    if (filters.startDate || filters.endDate) {
      query.assignedAt = {};
      if (filters.startDate) query.assignedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.assignedAt.$lte = new Date(filters.endDate);
    }
    
    const history = await StaffAssignment.find(query)
      .populate('waiterId', 'name')
      .populate('assignedBy', 'name')
      .sort('-assignedAt');
    
    if (format === 'csv') {
      // Generate CSV
      const csv = [
        'Date,Time,Table,Waiter,Assigned By,Duration (min),Orders,Revenue,Reason',
        ...history.map(h => [
          new Date(h.assignedAt).toLocaleDateString(),
          new Date(h.assignedAt).toLocaleTimeString(),
          h.tableNumber,
          h.waiterName,
          h.assignedByName,
          h.duration || 0,
          h.ordersServed || 0,
          h.revenue || 0,
          h.reason
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=assignment-history-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // PDF export would require additional library
      res.status(501).json({ error: 'PDF export not implemented' });
    }
  } catch (error) {
    console.error('Error exporting history:', error);
    res.status(500).json({ error: 'Failed to export history' });
  }
});

// Get metrics
router.get('/metrics', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
    }
    
    // Get assignments in period
    const assignments = await StaffAssignment.find({
      tenantId: req.tenantId,
      assignedAt: { $gte: startDate }
    }).populate('waiterId', 'name');
    
    // Calculate metrics
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    
    // Average duration
    const completedAssignments = assignments.filter(a => a.status === 'ended' && a.duration);
    const averageAssignmentDuration = completedAssignments.length > 0
      ? completedAssignments.reduce((sum, a) => sum + a.duration, 0) / completedAssignments.length
      : 0;
    
    // Waiter stats
    const waiterStats = {};
    assignments.forEach(a => {
      const waiterId = a.waiterId._id.toString();
      if (!waiterStats[waiterId]) {
        waiterStats[waiterId] = {
          waiterId,
          waiterName: a.waiterName,
          tablesServed: 0,
          revenue: 0
        };
      }
      waiterStats[waiterId].tablesServed++;
      waiterStats[waiterId].revenue += a.revenue || 0;
    });
    
    const topWaiters = Object.values(waiterStats)
      .sort((a, b) => b.tablesServed - a.tablesServed)
      .slice(0, 10);
    
    // Average tables per waiter
    const activeWaiters = new Set(assignments.map(a => a.waiterId._id.toString())).size;
    const averageTablesPerWaiter = activeWaiters > 0 ? totalAssignments / activeWaiters : 0;
    
    // Busiest hours
    const hourCounts = {};
    assignments.forEach(a => {
      const hour = new Date(a.assignedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const busiestHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), assignments: count }))
      .sort((a, b) => b.assignments - a.assignments);
    
    // Assignments by reason
    const assignmentsByReason = {
      manual: 0,
      shift_start: 0,
      rotation: 0,
      emergency: 0,
      rule_based: 0
    };
    
    assignments.forEach(a => {
      if (assignmentsByReason.hasOwnProperty(a.reason)) {
        assignmentsByReason[a.reason]++;
      }
    });
    
    res.json({
      tenantId: req.tenantId,
      period,
      totalAssignments,
      activeAssignments,
      averageTablesPerWaiter,
      averageAssignmentDuration,
      topWaiters,
      busiestHours,
      assignmentsByReason
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Rotate assignments
router.post('/rotate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { sectionId } = req.body;
    
    // Get current active assignments
    const query = { tenantId: req.tenantId, status: 'active' };
    if (sectionId) query.sectionId = sectionId;
    
    const currentAssignments = await StaffAssignment.find(query);
    
    if (currentAssignments.length < 2) {
      return res.status(400).json({ error: 'Not enough assignments to rotate' });
    }
    
    // Simple rotation: move each waiter to the next table
    const rotations = [];
    const waiterIds = currentAssignments.map(a => a.waiterId);
    const tableIds = currentAssignments.map(a => a.tableId);
    
    for (let i = 0; i < currentAssignments.length; i++) {
      const nextIndex = (i + 1) % currentAssignments.length;
      
      // End current assignment
      await currentAssignments[i].endAssignment(req.user._id);
      
      // Create new assignment
      const newAssignment = new StaffAssignment({
        tenantId: req.tenantId,
        tableId: tableIds[nextIndex],
        tableNumber: currentAssignments[nextIndex].tableNumber,
        waiterId: waiterIds[i],
        waiterName: currentAssignments[i].waiterName,
        role: 'primary',
        assignedBy: req.user._id,
        assignedByName: req.user.name,
        sectionId: currentAssignments[nextIndex].sectionId,
        floorId: currentAssignments[nextIndex].floorId,
        reason: 'rotation'
      });
      
      await newAssignment.save();
      rotations.push(newAssignment);
      
      // Update table
      const table = await Table.findById(tableIds[nextIndex]);
      if (table) {
        await table.assignWaiter(waiterIds[i], 'primary');
      }
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('assignment:rotation', {
        rotations,
        sectionId
      });
    }
    
    res.json({
      rotated: rotations.length,
      newAssignments: rotations
    });
  } catch (error) {
    console.error('Error rotating assignments:', error);
    res.status(500).json({ error: 'Failed to rotate assignments' });
  }
});

// Emergency reassign all tables from one waiter to another
router.post('/emergency-reassign', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { fromWaiterId, toWaiterId } = req.body;
    
    if (!fromWaiterId || !toWaiterId) {
      return res.status(400).json({ error: 'Both waiter IDs are required' });
    }
    
    // Verify both waiters exist
    const [fromWaiter, toWaiter] = await Promise.all([
      User.findOne({ _id: fromWaiterId, tenantId: req.tenantId, role: 'waiter' }),
      User.findOne({ _id: toWaiterId, tenantId: req.tenantId, role: 'waiter', isActive: true })
    ]);
    
    if (!fromWaiter || !toWaiter) {
      return res.status(404).json({ error: 'One or both waiters not found' });
    }
    
    // Get all active assignments for the from waiter
    const assignments = await StaffAssignment.find({
      tenantId: req.tenantId,
      waiterId: fromWaiterId,
      status: 'active'
    });
    
    const reassigned = [];
    
    for (const assignment of assignments) {
      // End current assignment
      await assignment.endAssignment(req.user._id);
      
      // Create new assignment
      const newAssignment = new StaffAssignment({
        tenantId: req.tenantId,
        tableId: assignment.tableId,
        tableNumber: assignment.tableNumber,
        waiterId: toWaiterId,
        waiterName: toWaiter.name,
        role: assignment.role,
        assignedBy: req.user._id,
        assignedByName: req.user.name,
        sectionId: assignment.sectionId,
        floorId: assignment.floorId,
        reason: 'emergency',
        notes: `Emergency reassignment from ${fromWaiter.name}`
      });
      
      await newAssignment.save();
      reassigned.push(newAssignment);
      
      // Update table
      const table = await Table.findById(assignment.tableId);
      if (table) {
        await table.removeWaiter(fromWaiterId);
        await table.assignWaiter(toWaiterId, assignment.role);
      }
    }
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('assignment:emergency-reassign', {
        fromWaiterId,
        fromWaiterName: fromWaiter.name,
        toWaiterId,
        toWaiterName: toWaiter.name,
        reassignedCount: reassigned.length
      });
    }
    
    res.json({
      reassigned: reassigned.length,
      assignments: reassigned
    });
  } catch (error) {
    console.error('Error in emergency reassignment:', error);
    res.status(500).json({ error: 'Failed to perform emergency reassignment' });
  }
});

// ===== ASSIGNMENT RULES ENDPOINTS =====

// Get all rules
router.get('/rules', authorize('admin', 'manager'), async (req, res) => {
  try {
    const rules = await AssignmentRule.getActiveRules(req.tenantId);
    res.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Get single rule
router.get('/rules/:ruleId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const rule = await AssignmentRule.findOne({
      _id: req.params.ruleId,
      tenantId: req.tenantId
    }).populate('preferredWaiters', 'name')
      .populate('createdBy', 'name');
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Error fetching rule:', error);
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create rule
router.post('/rules', authorize('admin'), async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      tenantId: req.tenantId,
      createdBy: req.user._id
    };
    
    const rule = new AssignmentRule(ruleData);
    await rule.save();
    
    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Update rule
router.put('/rules/:ruleId', authorize('admin'), async (req, res) => {
  try {
    const rule = await AssignmentRule.findOneAndUpdate(
      { _id: req.params.ruleId, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// Delete rule
router.delete('/rules/:ruleId', authorize('admin'), async (req, res) => {
  try {
    const rule = await AssignmentRule.findOneAndDelete({
      _id: req.params.ruleId,
      tenantId: req.tenantId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Toggle rule active state
router.patch('/rules/:ruleId/toggle', authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const rule = await AssignmentRule.findOneAndUpdate(
      { _id: req.params.ruleId, tenantId: req.tenantId },
      { isActive },
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Error toggling rule:', error);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// Test rule
router.post('/rules/:ruleId/test', authorize('admin'), async (req, res) => {
  try {
    const result = await AssignmentRule.testRule(req.params.ruleId);
    res.json(result);
  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

module.exports = router;