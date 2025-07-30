const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const Order = require('../../models/Order');
const User = require('../../models/User');

// Mobile kitchen routes
router.use(authenticate);
router.use(authorize('chef', 'admin'));

// Get kitchen orders for mobile app
router.get('/orders', async (req, res) => {
  try {
    const { station, status } = req.query;
    
    const query = {
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    };
    
    if (station && station !== 'all') {
      query['items.station'] = station;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('waiter', 'name')
      .populate('items.menuItem', 'name price')
      .sort('createdAt');
    
    // Calculate stats
    const stats = {
      ordersCompleted: await Order.countDocuments({ 
        status: 'completed',
        createdAt: { $gte: new Date().setHours(0,0,0,0) }
      }),
      avgPrepTime: 15, // You can calculate this properly
      pendingOrders: orders.filter(o => o.status === 'pending').length
    };
    
    res.json({ 
      orders, 
      stats,
      success: true 
    });
  } catch (error) {
    console.error('Mobile kitchen orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { 
        status,
        ...(status === 'preparing' && { startedAt: new Date() }),
        ...(status === 'ready' && { completedAt: new Date() })
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Emit socket event
    req.app.get('io').emit('order-status-update', {
      orderId: order._id,
      status: order.status,
      tableNumber: order.tableNumber
    });
    
    res.json({ 
      success: true, 
      order,
      message: `Order marked as ${status}`
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update individual item status
router.put('/orders/:orderId/items/:itemIndex/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId, itemIndex } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update item status
    if (order.items[itemIndex]) {
      order.items[itemIndex].status = status;
      
      if (status === 'preparing') {
        order.items[itemIndex].startedAt = new Date();
      } else if (status === 'ready') {
        order.items[itemIndex].completedAt = new Date();
      }
      
      // Check if any item is preparing
      const hasPreparingItems = order.items.some(item => item.status === 'preparing');
      if (hasPreparingItems && order.status === 'pending') {
        order.status = 'preparing';
      }
      
      // Check if all items are ready
      const allItemsReady = order.items.every(item => item.status === 'ready');
      if (allItemsReady) {
        order.status = 'ready';
      }
      
      await order.save();
      
      // Emit socket event
      req.app.get('io').emit('item-status-update', {
        orderId: order._id,
        itemIndex,
        status,
        orderStatus: order.status
      });
      
      res.json({ 
        success: true, 
        order,
        message: `Item marked as ${status}`
      });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('waiter', 'name')
      .populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by station
router.get('/orders/station/:station', async (req, res) => {
  try {
    const { station } = req.params;
    
    const query = {
      status: { $in: ['confirmed', 'preparing'] },
      'items.station': station
    };
    
    const orders = await Order.find(query)
      .populate('waiter', 'name')
      .sort('createdAt');
    
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order history
router.get('/orders/history', async (req, res) => {
  try {
    const { filter = 'today' } = req.query;
    
    let dateFilter = new Date();
    if (filter === 'today') {
      dateFilter.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (filter === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }
    
    const orders = await Order.find({
      createdAt: { $gte: dateFilter },
      status: { $in: ['ready', 'completed', 'cancelled'] }
    })
    .populate('waiter', 'name')
    .sort('-createdAt')
    .limit(100);
    
    // Calculate stats
    const stats = {
      totalOrders: orders.length,
      avgPrepTime: calculateAvgPrepTime(orders),
      topItems: await calculateTopItems(orders)
    };
    
    res.json({ orders, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team members
router.get('/team', async (req, res) => {
  try {
    const members = await User.find({ 
      role: { $in: ['chef', 'cook'] } 
    }).select('name role status station shiftStart shiftEnd');
    
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team member station
router.patch('/team/:memberId/station', async (req, res) => {
  try {
    const { station } = req.body;
    
    const member = await User.findByIdAndUpdate(
      req.params.memberId,
      { station },
      { new: true }
    );
    
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team member status
router.patch('/team/:memberId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const member = await User.findByIdAndUpdate(
      req.params.memberId,
      { status },
      { new: true }
    );
    
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order item status by index (fallback route)
router.patch('/orders/:orderId/item/:itemIndex', authenticate, authorize('chef', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const itemIndex = parseInt(req.params.itemIndex);
    
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.items[itemIndex]) {
      return res.status(404).json({ error: 'Item not found at index' });
    }

    // Update item status by index
    order.items[itemIndex].status = status;
    
    // Check if all items are ready
    const allReady = order.items.every(item => item.status === 'ready');
    if (allReady && order.status === 'preparing') {
      order.status = 'ready';
      order.preparedAt = new Date();
    }

    await order.save();

    // Notify waiters
    req.app.get('io').emit('kitchen-update', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      itemStatus: { itemIndex, status },
      orderStatus: order.status
    });

    res.json({
      success: true,
      order,
      message: 'Item status updated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateAvgPrepTime(orders) {
  const completedOrders = orders.filter(o => 
    o.status === 'ready' && o.confirmedAt && o.completedAt
  );
  
  if (completedOrders.length === 0) return 0;
  
  const totalTime = completedOrders.reduce((sum, order) => {
    const prepTime = (new Date(order.completedAt) - new Date(order.confirmedAt)) / 1000 / 60;
    return sum + prepTime;
  }, 0);
  
  return Math.round(totalTime / completedOrders.length);
}

async function calculateTopItems(orders) {
  const itemCounts = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      const name = item.name || item.menuItem?.name || 'Unknown';
      itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
    });
  });
  
  return Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Mobile kitchen route is working',
    user: req.user
  });
});

module.exports = router;