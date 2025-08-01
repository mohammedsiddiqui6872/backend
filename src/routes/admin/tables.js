// src/routes/admin/tables.js
const express = require('express');
const router = express.Router();

// Load models in dependency order to avoid circular reference issues
const User = require('../../models/User');
const Order = require('../../models/Order');
const CustomerSession = require('../../models/CustomerSession');
const Table = require('../../models/Table');
const TableLayout = require('../../models/TableLayout');
const TableCustomerSession = require('../../models/TableCustomerSession');
const TableState = require('../../models/TableState');
const WaiterSession = require('../../models/WaiterSession');

const { authenticate, authorize } = require('../../middleware/auth');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

// Note: Tenant isolation is already applied at the app level in server-multi-tenant.js
router.use(authenticate);
router.use(authorize('admin', 'manager', 'waiter'));

// Get all tables with complete details
router.get('/', async (req, res) => {
  try {
    console.log('[Tables API] Starting request for tenant:', req.tenantId);
    
    // Get all tables with MANDATORY tenant filter
    let tables;
    try {
      tables = await Table.find({ tenantId: req.tenantId })
        .populate({ path: 'currentOrder', strictPopulate: false })
        .populate({ path: 'currentWaiter', select: 'name', strictPopulate: false })
        .populate({ path: 'assistingWaiters', select: 'name', strictPopulate: false });
      console.log('[Tables API] Tables query successful, found:', tables.length);
    } catch (error) {
      console.error('[Tables API] Error in tables query:', error.message);
      throw error;
    }

    // Get all active customer sessions with MANDATORY tenant filter
    let activeSessions;
    try {
      activeSessions = await CustomerSession.find({ 
        tenantId: req.tenantId,
        isActive: true 
      })
        .populate({ path: 'waiter', select: 'name email', strictPopulate: false });
      console.log('[Tables API] Customer sessions query successful, found:', activeSessions.length);
    } catch (error) {
      console.error('[Tables API] Error in customer sessions query:', error.message);
      throw error;
    }
    
    // Get all active orders with MANDATORY tenant filter
    let activeOrders;
    try {
      activeOrders = await Order.find({
        tenantId: req.tenantId,
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        paymentStatus: { $ne: 'paid' }
      }).populate({ path: 'items.menuItem', select: 'name price', strictPopulate: false });
      console.log('[Tables API] Orders query successful, found:', activeOrders.length);
    } catch (error) {
      console.error('[Tables API] Error in orders query:', error.message);
      throw error;
    }
    
    // Get table states with MANDATORY tenant filter
    let tableStates;
    try {
      tableStates = await TableState.find({ tenantId: req.tenantId })
        .populate({ path: 'currentWaiter', select: 'name email', strictPopulate: false })
        .populate({ path: 'activeCustomerSession', strictPopulate: false });
      console.log('[Tables API] Table states query successful, found:', tableStates.length);
    } catch (error) {
      console.error('[Tables API] Error in table states query:', error.message);
      throw error;
    }
    
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
    const {
      number, displayName, capacity, minCapacity, maxCapacity,
      type, shape, location, features, isCombinable, combinesWith, metadata
    } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({ 
      tenantId: req.tenantId, 
      number 
    });
    
    if (existingTable) {
      return res.status(409).json({ 
        error: 'Table number already exists' 
      });
    }

    const table = new Table({
      tenantId: req.tenantId,
      number,
      displayName,
      capacity,
      minCapacity,
      maxCapacity,
      type: type || 'regular',
      shape: shape || 'square',
      location: location || {
        floor: 'main',
        section: 'dining',
        x: 0,
        y: 0
      },
      features: features || [],
      isCombinable: isCombinable || false,
      combinesWith: combinesWith || [],
      metadata: metadata || {}
    });

    await table.save();

    // Add table to layout
    const layout = await TableLayout.getOrCreate(req.tenantId);
    await layout.assignTableToSection(
      location?.floor || 'main',
      location?.section || 'dining',
      number
    );

    res.status(201).json({
      success: true,
      table,
      message: 'Table created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update table
router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id;
    delete updates.tenantId;
    delete updates.qrCode; // Don't allow QR code updates through this endpoint
    
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate({ path: 'currentWaiter', select: 'name email', strictPopulate: false })
     .populate({ path: 'assistingWaiters', select: 'name email', strictPopulate: false });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Update layout if location changed
    if (updates.location) {
      try {
        const layout = await TableLayout.getOrCreate(req.tenantId);
        
        // Verify that the section exists in the floor
        const floor = layout.getFloor(updates.location.floor);
        if (!floor) {
          return res.status(400).json({ error: `Floor ${updates.location.floor} not found` });
        }
        
        const section = layout.getSection(updates.location.floor, updates.location.section);
        if (!section) {
          // If section doesn't exist, use the first section of the floor
          const firstSection = floor.sections[0];
          if (!firstSection) {
            return res.status(400).json({ error: `No sections found in floor ${updates.location.floor}` });
          }
          
          console.log(`Section ${updates.location.section} not found in floor ${updates.location.floor}, using first section: ${firstSection.id}`);
          updates.location.section = firstSection.id;
          
          // Update the table with the corrected section
          await Table.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { $set: { 'location.section': firstSection.id } }
          );
        }
        
        await layout.assignTableToSection(
          updates.location.floor,
          updates.location.section,
          table.number
        );
      } catch (layoutError) {
        console.error('Error updating table layout:', layoutError);
        return res.status(500).json({ error: `Failed to update table layout: ${layoutError.message}` });
      }
    }

    res.json({
      success: true,
      table,
      message: 'Table updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update table status
router.patch('/:tableNumber/status', async (req, res) => {
  try {
    const { status, waiterId } = req.body;

    const table = await Table.findOne({ 
      tenantId: req.tenantId,
      number: req.params.tableNumber 
    });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    table.status = status;
    
    if (status === 'occupied' && waiterId) {
      table.currentWaiter = waiterId;
    } else if (status === 'available') {
      table.currentWaiter = null;
      table.currentOrder = null;
    }

    await table.save();

    // Emit real-time update if Socket.io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('table-status-update', {
        tableNumber: table.number,
        status: table.status
      });
    }

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

    const table = await Table.findOneAndUpdate(
      { 
        tenantId: req.tenantId,
        number: req.params.tableNumber 
      },
      { currentWaiter: waiterId },
      { new: true }
    ).populate({ path: 'currentWaiter', select: 'name', strictPopulate: false });

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

    // Add MANDATORY tenant filter to query
    query.tenantId = req.tenantId;
    
    const orders = await Order.find(query)
      .populate({ path: 'waiter', select: 'name', strictPopulate: false })
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

// Generate new QR code (single table)
router.post('/:tableNumber/qr-code', authorize('admin', 'manager'), async (req, res) => {
  try {
    const table = await Table.findOne({ 
      tenantId: req.tenantId,
      number: req.params.tableNumber 
    });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Use encrypted QR code generation
    const { generateEncryptedQRCode } = require('../../utils/tableEncryption');
    const qrData = generateEncryptedQRCode(
      table.tenantId,
      table._id.toString(),
      table.number,
      0 // No expiry
    );

    table.qrCode = {
      code: qrData.code,
      url: qrData.url,
      customization: {
        ...table.qrCode?.customization,
        encrypted: true
      }
    };
    await table.save();

    // Generate visual QR code
    const qrCodeDataUrl = await QRCode.toDataURL(qrData.url);

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      qrData: table.qrCode,
      message: 'Encrypted QR code generated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Regenerate QR codes (bulk)
router.post('/regenerate-qr', authorize('admin'), async (req, res) => {
  try {
    const { tableIds, useEncryption = true } = req.body;
    const filter = { tenantId: req.tenantId };
    
    // If specific tables are provided, filter by them
    if (tableIds && tableIds.length > 0) {
      filter._id = { $in: tableIds };
    }
    
    const tables = await Table.find(filter);
    const { generateEncryptedQRCode } = require('../../utils/tableEncryption');
    
    let updatedCount = 0;
    for (let table of tables) {
      if (useEncryption) {
        // Generate new encrypted QR code
        const qrData = generateEncryptedQRCode(
          table.tenantId,
          table._id.toString(),
          table.number,
          0 // No expiry
        );
        
        table.qrCode = {
          code: qrData.code,
          url: qrData.url,
          customization: {
            ...table.qrCode?.customization,
            encrypted: true
          }
        };
      } else {
        // Force regeneration with old method
        table.qrCode = null;
      }
      
      await table.save();
      updatedCount++;
    }
    
    res.json({ 
      success: true, 
      message: `Regenerated QR codes for ${updatedCount} tables`,
      encrypted: useEncryption,
      tablesUpdated: updatedCount
    });
  } catch (error) {
    console.error('Error regenerating QR codes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete('/:tableNumber', authorize('admin'), async (req, res) => {
  try {
    const table = await Table.findOne({ 
      tenantId: req.tenantId,
      number: req.params.tableNumber 
    });
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
    const tables = await Table.find({ 
      tenantId: req.tenantId,
      isActive: true 
    })
      .select('number capacity status location')
      .populate({ path: 'currentOrder', select: 'orderNumber total', strictPopulate: false })
      .populate({ path: 'currentWaiter', select: 'name', strictPopulate: false });

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

// Bulk operations
router.post('/bulk', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { operation, tables, updateFields } = req.body;
    let results = [];

    switch (operation) {
      case 'create':
        // Create multiple tables
        for (const tableData of tables) {
          try {
            const table = new Table({
              ...tableData,
              tenantId: req.tenantId
            });
            await table.save();
            results.push({ success: true, table });
          } catch (error) {
            results.push({ 
              success: false, 
              error: error.message, 
              tableNumber: tableData.number 
            });
          }
        }
        break;

      case 'update':
        // Update multiple tables
        const tableIds = tables.map(t => t._id);
        await Table.updateMany(
          { _id: { $in: tableIds }, tenantId: req.tenantId },
          { $set: updateFields }
        );
        results = { updated: tableIds.length };
        break;

      case 'delete':
        // Delete multiple tables
        const tableNumbers = tables.map(t => t.number);
        const deletedTables = await Table.deleteMany({
          number: { $in: tableNumbers },
          tenantId: req.tenantId,
          status: 'available' // Only delete available tables
        });
        results = { deleted: deletedTables.deletedCount };
        break;

      case 'updateStatus':
        // Bulk status update
        const ids = tables.map(t => t._id);
        await Table.bulkUpdateStatus(req.tenantId, ids, updateFields.status);
        results = { updated: ids.length };
        break;
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Table layout management
router.get('/layout/config', async (req, res) => {
  try {
    const layout = await TableLayout.getOrCreate(req.tenantId);
    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/layout/config', authorize('admin', 'manager'), async (req, res) => {
  try {
    const updates = req.body;
    delete updates._id;
    delete updates.tenantId;

    const layout = await TableLayout.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Floor management
router.post('/layout/floors', authorize('admin', 'manager'), async (req, res) => {
  try {
    const layout = await TableLayout.getOrCreate(req.tenantId);
    await layout.addFloor(req.body);
    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/layout/floors/:floorId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const layout = await TableLayout.getOrCreate(req.tenantId);
    await layout.updateFloor(req.params.floorId, req.body);
    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/layout/floors/:floorId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const layout = await TableLayout.getOrCreate(req.tenantId);
    await layout.removeFloor(req.params.floorId);
    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Section management
router.post('/layout/floors/:floorId/sections', authorize('admin', 'manager'), async (req, res) => {
  try {
    const layout = await TableLayout.getOrCreate(req.tenantId);
    await layout.addSection(req.params.floorId, req.body);
    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// QR Code bulk operations
router.post('/qr-codes/export', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { format = 'pdf', tableIds, options = {} } = req.body;
    
    const query = { tenantId: req.tenantId, isActive: true };
    if (tableIds && tableIds.length > 0) {
      query._id = { $in: tableIds };
    }

    const tables = await Table.find(query).sort('number');

    if (format === 'pdf') {
      // Generate PDF with QR codes
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=table-qr-codes.pdf');
      doc.pipe(res);

      // Add header
      doc.fontSize(20).text('Table QR Codes', { align: 'center' });
      doc.moveDown();

      // Add QR codes in grid
      let x = 50, y = 100;
      const qrSize = options.qrSize || 150;
      const spacing = 20;

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        
        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(table.qrCode.url, {
          width: qrSize,
          margin: 1
        });
        
        // Add QR code to PDF
        doc.image(qrDataUrl, x, y, { width: qrSize, height: qrSize });
        
        // Add table number
        doc.fontSize(12)
           .text(`Table ${table.displayName || table.number}`, x, y + qrSize + 5, {
             width: qrSize,
             align: 'center'
           });

        // Move to next position
        x += qrSize + spacing;
        if (x + qrSize > doc.page.width - 50) {
          x = 50;
          y += qrSize + spacing + 30;
          
          // Add new page if needed
          if (y + qrSize > doc.page.height - 50) {
            doc.addPage();
            y = 50;
          }
        }
      }

      doc.end();
    } else if (format === 'zip') {
      // Generate ZIP with individual QR code images
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=table-qr-codes.zip');
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      for (const table of tables) {
        const qrBuffer = await QRCode.toBuffer(table.qrCode.url, {
          width: options.qrSize || 300,
          margin: 2
        });
        
        archive.append(qrBuffer, { 
          name: `table-${table.number}-qr.png` 
        });
      }

      await archive.finalize();
    } else {
      res.status(400).json({ error: 'Invalid format. Use pdf or zip.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Table sessions
router.get('/:tableId/sessions', async (req, res) => {
  try {
    const { startDate, endDate, status, limit = 50 } = req.query;
    
    const sessions = await TableCustomerSession.getSessionsByTable(
      req.tenantId,
      req.params.tableId,
      { startDate, endDate, status, limit: parseInt(limit) }
    );

    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:tableId/current-session', async (req, res) => {
  try {
    const session = await TableCustomerSession.getActiveSession(
      req.tenantId,
      req.params.tableId
    );

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Table analytics
router.get('/:tableId/analytics', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const analytics = await TableCustomerSession.getTableAnalytics(
      req.tenantId,
      req.params.tableId,
      period
    );

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Waiter assignment
router.post('/:tableId/assign-waiter', async (req, res) => {
  try {
    const { waiterId, role = 'primary' } = req.body;
    
    const table = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    await table.assignWaiter(waiterId, role);

    res.json({
      success: true,
      table,
      message: `Waiter assigned as ${role}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tableId/remove-waiter', async (req, res) => {
  try {
    const { waiterId } = req.body;
    
    const table = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    await table.removeWaiter(waiterId);

    res.json({
      success: true,
      table,
      message: 'Waiter removed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tables by QR code (for customer app)
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const table = await Table.getTableByQRCode(req.params.qrCode);
    
    if (!table) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    res.json({
      success: true,
      table: {
        number: table.number,
        displayName: table.displayName,
        capacity: table.capacity,
        type: table.type,
        features: table.features,
        status: table.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get maintenance logs for a table
router.get('/:tableId/maintenance', async (req, res) => {
  try {
    const TableMaintenanceLog = require('../../models/TableMaintenanceLog');
    
    const logs = await TableMaintenanceLog.find({
      tenantId: req.tenantId,
      tableId: req.params.tableId,
      isArchived: false
    })
    .sort('-scheduledDate')
    .populate('assignedTo.userId', 'name')
    .populate('performedBy.userId', 'name');

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch maintenance logs' 
    });
  }
});

// Create maintenance log for a table
router.post('/:tableId/maintenance', async (req, res) => {
  try {
    const TableMaintenanceLog = require('../../models/TableMaintenanceLog');
    const table = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const maintenanceLog = new TableMaintenanceLog({
      tenantId: req.tenantId,
      tableId: req.params.tableId,
      tableNumber: table.number,
      ...req.body,
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    });

    await maintenanceLog.save();

    // Update table metadata
    if (req.body.type === 'cleaning') {
      await Table.findByIdAndUpdate(req.params.tableId, {
        'metadata.lastCleaned': new Date(),
        'metadata.maintenanceNotes': req.body.notes || table.metadata.maintenanceNotes
      });
    }

    res.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance log created successfully'
    });
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create maintenance log' 
    });
  }
});

module.exports = router;