const express = require('express');
const router = express.Router();
const multer = require('multer');
const Table = require('../../models/Table');
const TableCSVParser = require('../../utils/csvParser');
const { authenticate, authorize } = require('../../middleware/auth');
const { generateEncryptedQRCode } = require('../../utils/tableEncryption');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Apply middleware
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get sample CSV
router.get('/sample', (req, res) => {
  try {
    const parser = new TableCSVParser();
    const sampleCSV = parser.generateSampleCSV();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tables-sample.csv');
    res.send(sampleCSV);
  } catch (error) {
    console.error('Error generating sample CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate sample CSV' 
    });
  }
});

// Preview import (validate without saving)
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const parser = new TableCSVParser();
    const result = await parser.parse(req.file.buffer);

    // Check for duplicate table numbers
    const tableNumbers = result.tables.map(t => t.number);
    const existingTables = await Table.find({
      tenantId: req.tenantId,
      number: { $in: tableNumbers }
    }).select('number');

    const duplicates = existingTables.map(t => t.number);
    
    if (duplicates.length > 0) {
      result.warnings = result.warnings || [];
      result.warnings.push({
        type: 'duplicate',
        message: `Tables with these numbers already exist: ${duplicates.join(', ')}`,
        tables: duplicates
      });
    }

    res.json({
      success: result.success,
      preview: result.tables,
      errors: result.errors,
      warnings: result.warnings,
      summary: {
        ...result.summary,
        duplicates: duplicates.length
      }
    });
  } catch (error) {
    console.error('Error previewing CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to preview CSV' 
    });
  }
});

// Import tables from CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { mode = 'skip', updatePositions = false } = req.body;
    // Modes: 'skip' (skip duplicates), 'update' (update existing), 'replace' (delete and recreate)

    const parser = new TableCSVParser();
    const parseResult = await parser.parse(req.file.buffer);

    if (!parseResult.success && parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: parseResult.errors,
        message: 'CSV validation failed'
      });
    }

    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: []
    };

    // Process each table
    for (const tableData of parseResult.tables) {
      try {
        const existingTable = await Table.findOne({
          tenantId: req.tenantId,
          number: tableData.number
        });

        if (existingTable) {
          if (mode === 'skip') {
            results.skipped.push({
              number: tableData.number,
              reason: 'Table already exists'
            });
            continue;
          } else if (mode === 'update') {
            // Update existing table
            existingTable.displayName = tableData.displayName || existingTable.displayName;
            existingTable.capacity = tableData.capacity;
            existingTable.type = tableData.type;
            existingTable.section = tableData.section || existingTable.section;
            existingTable.status = tableData.status;
            
            if (updatePositions && tableData.position) {
              existingTable.position = tableData.position;
            }

            await existingTable.save();
            results.updated.push({
              number: tableData.number,
              _id: existingTable._id
            });
            continue;
          } else if (mode === 'replace') {
            await existingTable.remove();
          }
        }

        // Create new table
        const newTable = new Table({
          ...tableData,
          tenantId: req.tenantId,
          createdBy: req.user._id
        });

        // Generate encrypted QR code
        const qrData = generateEncryptedQRCode(
          req.tenantId,
          newTable._id.toString(),
          newTable.number,
          0 // No expiry
        );
        
        newTable.qrCode = {
          code: qrData.code,
          url: qrData.url,
          customization: {
            encrypted: true
          }
        };

        await newTable.save();
        results.created.push({
          number: newTable.number,
          _id: newTable._id
        });

      } catch (error) {
        results.errors.push({
          number: tableData.number,
          error: error.message
        });
      }
    }

    // Emit update event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('tables-imported', {
        summary: {
          created: results.created.length,
          updated: results.updated.length,
          skipped: results.skipped.length,
          errors: results.errors.length
        }
      });
    }

    res.json({
      success: true,
      results,
      summary: {
        total: parseResult.tables.length,
        created: results.created.length,
        updated: results.updated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('Error importing tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to import tables' 
    });
  }
});

// Bulk operations on existing tables
router.post('/bulk', async (req, res) => {
  try {
    const { action, tableIds, data } = req.body;

    if (!action || !tableIds || !Array.isArray(tableIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, tableIds'
      });
    }

    let result;

    switch (action) {
      case 'delete':
        result = await Table.deleteMany({
          tenantId: req.tenantId,
          _id: { $in: tableIds }
        });
        break;

      case 'updateStatus':
        if (!data?.status) {
          return res.status(400).json({
            success: false,
            error: 'Status is required for updateStatus action'
          });
        }
        result = await Table.updateMany(
          {
            tenantId: req.tenantId,
            _id: { $in: tableIds }
          },
          { status: data.status }
        );
        break;

      case 'updateSection':
        if (!data?.section) {
          return res.status(400).json({
            success: false,
            error: 'Section is required for updateSection action'
          });
        }
        result = await Table.updateMany(
          {
            tenantId: req.tenantId,
            _id: { $in: tableIds }
          },
          { section: data.section }
        );
        break;

      case 'updateType':
        if (!data?.type) {
          return res.status(400).json({
            success: false,
            error: 'Type is required for updateType action'
          });
        }
        result = await Table.updateMany(
          {
            tenantId: req.tenantId,
            _id: { $in: tableIds }
          },
          { type: data.type }
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Invalid action: ${action}`
        });
    }

    // Emit update event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('tables-bulk-updated', {
        action,
        affectedCount: result.modifiedCount || result.deletedCount || 0
      });
    }

    res.json({
      success: true,
      action,
      affectedCount: result.modifiedCount || result.deletedCount || 0
    });

  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Bulk operation failed' 
    });
  }
});

module.exports = router;