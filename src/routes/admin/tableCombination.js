const express = require('express');
const router = express.Router();
const Table = require('../../models/Table');
const { authenticate, authorize } = require('../../middleware/auth');

// Apply middleware
router.use(authenticate);
router.use(authorize('admin', 'manager', 'waiter'));

// Get combinable tables for a specific table
router.get('/:tableId/combinable', async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found' 
      });
    }

    if (!table.isCombinable) {
      return res.json({
        success: true,
        combinableTables: [],
        message: 'This table is not combinable'
      });
    }

    // Debug logging
    console.log(`[TableCombination] Table ${table.number} combinesWith:`, table.combinesWith);
    
    // Get all tables this can combine with
    const combinableTables = await Table.find({
      tenantId: req.tenantId,
      number: { $in: table.combinesWith },
      isActive: true,
      status: 'available',
      'combination.isCombined': false
    }).select('number displayName capacity location status type');
    
    console.log(`[TableCombination] Found ${combinableTables.length} combinable tables:`, 
      combinableTables.map(t => t.number));

    res.json({
      success: true,
      combinableTables,
      currentTable: {
        number: table.number,
        displayName: table.displayName,
        capacity: table.capacity
      }
    });
  } catch (error) {
    console.error('Error fetching combinable tables:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch combinable tables' 
    });
  }
});

// Combine tables
router.post('/:tableId/combine', async (req, res) => {
  try {
    const { tablesToCombine, arrangement = 'linear' } = req.body;

    if (!Array.isArray(tablesToCombine) || tablesToCombine.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide tables to combine'
      });
    }

    const mainTable = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!mainTable) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found' 
      });
    }
    
    // Debug logging
    console.log(`[TableCombination] Combining tables:`);
    console.log(`  Main table: ${mainTable.number}, combinesWith:`, mainTable.combinesWith);
    console.log(`  Tables to combine:`, tablesToCombine.map(t => t.tableNumber));

    // Process table status rules for combination
    const ruleEngine = req.app.get('ruleEngine');
    if (ruleEngine) {
      await ruleEngine.processEvent(
        req.tenantId,
        'table_combined',
        mainTable.number,
        {
          combined_tables: tablesToCombine.map(t => t.tableNumber),
          arrangement,
          user_id: req.user._id,
          user_name: req.user.name
        }
      );
    }

    // Perform the combination
    const combinedTable = await mainTable.combineWith(
      tablesToCombine,
      req.user._id,
      arrangement
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('tables-combined', {
        mainTable: {
          id: combinedTable._id,
          number: combinedTable.number,
          totalCapacity: combinedTable.combination.totalCapacity
        },
        combinedTables: tablesToCombine,
        arrangement,
        combinedBy: req.user.name
      });
    }

    res.json({
      success: true,
      table: combinedTable,
      message: `Tables combined successfully. Total capacity: ${combinedTable.combination.totalCapacity}`
    });
  } catch (error) {
    console.error('Error combining tables:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to combine tables' 
    });
  }
});

// Split tables
router.post('/:tableId/split', async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.tableId,
      tenantId: req.tenantId
    });

    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found' 
      });
    }

    if (!table.combination.isCombined) {
      return res.status(400).json({
        success: false,
        error: 'This table is not part of a combination'
      });
    }

    // Store combined tables info before splitting
    const wasMainTable = table.combination.isMainTable;
    const combinedTableNumbers = wasMainTable 
      ? table.combination.combinedTables.map(t => t.tableNumber)
      : [];

    // Process table status rules for split
    const ruleEngine = req.app.get('ruleEngine');
    if (ruleEngine) {
      await ruleEngine.processEvent(
        req.tenantId,
        'table_split',
        table.number,
        {
          was_main_table: wasMainTable,
          split_tables: combinedTableNumbers,
          user_id: req.user._id,
          user_name: req.user.name
        }
      );
    }

    // Perform the split
    await table.split(req.user._id);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('tables-split', {
        tableNumber: table.number,
        wasMainTable,
        splitTables: combinedTableNumbers,
        splitBy: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Tables split successfully'
    });
  } catch (error) {
    console.error('Error splitting tables:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to split tables' 
    });
  }
});

// Get current combinations
router.get('/combinations', async (req, res) => {
  try {
    const combinations = await Table.find({
      tenantId: req.tenantId,
      'combination.isCombined': true,
      'combination.isMainTable': true
    })
    .populate('combination.combinedBy', 'name')
    .populate('combination.combinedTables.tableId', 'number displayName capacity location')
    .select('number displayName capacity combination location status');

    res.json({
      success: true,
      combinations,
      total: combinations.length
    });
  } catch (error) {
    console.error('Error fetching combinations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch combinations' 
    });
  }
});

// Get combination history
router.get('/history', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    
    const query = {
      tenantId: req.tenantId,
      'combination.combinedAt': { $exists: true }
    };

    if (startDate || endDate) {
      query['combination.combinedAt'] = {};
      if (startDate) query['combination.combinedAt'].$gte = new Date(startDate);
      if (endDate) query['combination.combinedAt'].$lte = new Date(endDate);
    }

    const history = await Table.find(query)
      .populate('combination.combinedBy', 'name')
      .select('number displayName combination')
      .sort({ 'combination.combinedAt': -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching combination history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch combination history' 
    });
  }
});

module.exports = router;