// src/routes/admin/tables.js
const express = require('express');
const router = express.Router();
const Table = require('../../models/Table');
const TableLayout = require('../../models/TableLayout');
const TableCustomerSession = require('../../models/TableCustomerSession');
const Order = require('../../models/Order');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

router.use(authenticate);
router.use(enterpriseTenantIsolation);
router.use(authorize('admin', 'manager', 'waiter'));

// Get all tables with complete details
router.get('/', async (req, res) => {
  try {
    const CustomerSession = require('../../models/CustomerSession');
    const TableState = require('../../models/TableState');
    const WaiterSession = require('../../models/WaiterSession');
    
    // Get all tables with MANDATORY tenant filter
    const tables = await Table.find({ tenantId: req.tenantId })
      .populate('currentOrder')
      .populate('waiter', 'name');

    // Get all active customer sessions with MANDATORY tenant filter
    const activeSessions = await CustomerSession.find({ 
      tenantId: req.tenantId,
      isActive: true 
    })
      .populate('waiter', 'name email');
    
    // Get all active orders with MANDATORY tenant filter
    const activeOrders = await Order.find({
      tenantId: req.tenantId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' }
    }).populate('items.menuItem', 'name price');
    
    // Get table states with MANDATORY tenant filter
    const tableStates = await TableState.find({ tenantId: req.tenantId })
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
    ).populate('currentWaiter', 'name email')
     .populate('assistingWaiters', 'name email');

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Update layout if location changed
    if (updates.location) {
      const layout = await TableLayout.getOrCreate(req.tenantId);
      await layout.assignTableToSection(
        updates.location.floor,
        updates.location.section,
        table.number
      );
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

    const table = await Table.findOneAndUpdate(
      { 
        tenantId: req.tenantId,
        number: req.params.tableNumber 
      },
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

    // Add MANDATORY tenant filter to query
    query.tenantId = req.tenantId;
    
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
    const table = await Table.findOne({ 
      tenantId: req.tenantId,
      number: req.params.tableNumber 
    });
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

module.exports = router;