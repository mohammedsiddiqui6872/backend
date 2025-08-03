// src/routes/admin/stations.js
const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager', 'chef'));

// Get station load data
router.get('/load-data', async (req, res) => {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
    
    // Get active orders by station
    const matchFilter = {
      status: { $in: ['confirmed', 'preparing'] },
      createdAt: { $gte: thirtyMinutesAgo }
    };
    
    if (req.tenantId) {
      matchFilter.tenantId = req.tenantId;
    }

    const stationOrders = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { $match: { 'items.status': { $in: ['pending', 'preparing'] } } },
      {
        $group: {
          _id: '$items.station',
          orders: { $sum: 1 },
          items: { 
            $push: {
              _id: '$items._id',
              orderId: '$_id',
              orderNumber: '$orderNumber',
              itemName: '$items.name',
              quantity: '$items.quantity',
              station: '$items.station',
              priority: {
                $cond: [
                  { $gt: [{ $subtract: [now, '$createdAt'] }, 1200000] }, // 20 minutes
                  'urgent',
                  {
                    $cond: [
                      { $gt: [{ $subtract: [now, '$createdAt'] }, 600000] }, // 10 minutes
                      'high',
                      'normal'
                    ]
                  }
                ]
              },
              estimatedTime: 15, // Default estimate
              waitTime: { $divide: [{ $subtract: [now, '$createdAt'] }, 60000] },
              canReassign: true
            }
          },
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    // Format station data
    const stations = {
      grill: { load: 0, chefs: 2, orders: 0, avgTime: 15, efficiency: 90, queue: [] },
      salad: { load: 0, chefs: 1, orders: 0, avgTime: 5, efficiency: 95, queue: [] },
      dessert: { load: 0, chefs: 1, orders: 0, avgTime: 10, efficiency: 85, queue: [] },
      beverage: { load: 0, chefs: 1, orders: 0, avgTime: 3, efficiency: 98, queue: [] },
      main: { load: 0, chefs: 3, orders: 0, avgTime: 20, efficiency: 88, queue: [] }
    };

    // Populate station data from aggregation results
    stationOrders.forEach(stationData => {
      const stationId = stationData._id || 'main';
      if (stations[stationId]) {
        const maxCapacity = stations[stationId].chefs * 10; // Each chef can handle 10 items
        stations[stationId].orders = stationData.orders;
        stations[stationId].load = Math.min(100, Math.round((stationData.totalQuantity / maxCapacity) * 100));
        stations[stationId].queue = stationData.items.slice(0, 10); // Limit to 10 items for UI
      }
    });

    res.json({ stations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reassign station item
router.post('/reassign-item', async (req, res) => {
  try {
    const { itemId, orderId, fromStation, toStation } = req.body;
    
    // Update the item's station
    const order = await Order.findOne({ 
      _id: orderId,
      tenantId: req.tenantId 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const item = order.items.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update item station
    item.station = toStation;
    await order.save();
    
    // Emit socket event for real-time update
    if (req.io) {
      req.io.to(`tenant:${req.tenantId}`).emit('station-item-reassigned', {
        orderId,
        itemId,
        fromStation,
        toStation
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Item reassigned successfully',
      item: {
        _id: item._id,
        name: item.name,
        station: item.station
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch reassign items
router.post('/batch-reassign', async (req, res) => {
  try {
    const { reassignments } = req.body;
    
    if (!Array.isArray(reassignments)) {
      return res.status(400).json({ error: 'Invalid reassignments data' });
    }
    
    const results = [];
    
    for (const reassignment of reassignments) {
      try {
        const order = await Order.findOne({ 
          _id: reassignment.orderId,
          tenantId: req.tenantId 
        });
        
        if (order) {
          const item = order.items.find(i => i._id.toString() === reassignment.itemId);
          if (item) {
            item.station = reassignment.toStation;
            await order.save();
            results.push({ itemId: reassignment.itemId, success: true });
          } else {
            results.push({ itemId: reassignment.itemId, success: false, error: 'Item not found' });
          }
        } else {
          results.push({ itemId: reassignment.itemId, success: false, error: 'Order not found' });
        }
      } catch (error) {
        results.push({ itemId: reassignment.itemId, success: false, error: error.message });
      }
    }
    
    // Emit socket event for real-time update
    if (req.io) {
      req.io.to(`tenant:${req.tenantId}`).emit('batch-station-reassignment', {
        reassignments: results
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      message: `${successCount} of ${reassignments.length} items reassigned successfully`,
      results 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;