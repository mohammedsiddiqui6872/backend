const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const Order = require('../../models/Order');
const CustomerSession = require('../../models/CustomerSession');
const User = require('../../models/User');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/admin/analytics/customer-segments
router.get('/customer-segments', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock customer segments - In production, use ML clustering
    const segments = [
      {
        id: '1',
        name: 'VIP Customers',
        count: 245,
        percentage: 12,
        avgOrderValue: 250,
        frequency: 8.5,
        lastVisit: '2 days ago',
        lifetimeValue: 12500,
        churnRisk: 'low'
      },
      {
        id: '2',
        name: 'Regular Customers',
        count: 580,
        percentage: 28,
        avgOrderValue: 150,
        frequency: 4.2,
        lastVisit: '1 week ago',
        lifetimeValue: 3200,
        churnRisk: 'low'
      },
      {
        id: '3',
        name: 'Occasional Visitors',
        count: 890,
        percentage: 43,
        avgOrderValue: 85,
        frequency: 1.8,
        lastVisit: '3 weeks ago',
        lifetimeValue: 450,
        churnRisk: 'medium'
      },
      {
        id: '4',
        name: 'At Risk',
        count: 350,
        percentage: 17,
        avgOrderValue: 95,
        frequency: 0.5,
        lastVisit: '2 months ago',
        lifetimeValue: 180,
        churnRisk: 'high'
      }
    ];
    
    res.json({ segments });
  } catch (error) {
    console.error('Error fetching customer segments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/customer-journey
router.get('/customer-journey', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock customer journey data
    const journey = [
      {
        stage: 'Discovery',
        customers: 5000,
        dropoffRate: 0,
        avgTime: '2 min',
        conversionRate: 100
      },
      {
        stage: 'Menu Browse',
        customers: 4200,
        dropoffRate: 16,
        avgTime: '5 min',
        conversionRate: 84
      },
      {
        stage: 'Add to Cart',
        customers: 2800,
        dropoffRate: 33,
        avgTime: '3 min',
        conversionRate: 56
      },
      {
        stage: 'Checkout',
        customers: 2100,
        dropoffRate: 25,
        avgTime: '2 min',
        conversionRate: 42
      },
      {
        stage: 'Order Complete',
        customers: 1850,
        dropoffRate: 12,
        avgTime: '1 min',
        conversionRate: 37
      }
    ];
    
    res.json({ journey });
  } catch (error) {
    console.error('Error fetching customer journey:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/loyalty-metrics
router.get('/loyalty-metrics', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock loyalty metrics
    const metrics = {
      totalMembers: 1580,
      activeMembers: 1120,
      pointsIssued: 158000,
      pointsRedeemed: 95000,
      avgPointsPerCustomer: 100,
      redemptionRate: 60,
      tierDistribution: [
        { tier: 'Bronze', count: 800, percentage: 51 },
        { tier: 'Silver', count: 500, percentage: 32 },
        { tier: 'Gold', count: 220, percentage: 14 },
        { tier: 'Platinum', count: 60, percentage: 3 }
      ]
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching loyalty metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/sentiment-analysis
router.get('/sentiment-analysis', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock sentiment data
    const sentiment = {
      overall: 4.2,
      positive: 68,
      neutral: 22,
      negative: 10,
      trends: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        positive: 60 + Math.random() * 20,
        neutral: 20 + Math.random() * 10,
        negative: 5 + Math.random() * 10
      })),
      topIssues: [
        { issue: 'Wait time', count: 45, sentiment: -0.6 },
        { issue: 'Food temperature', count: 32, sentiment: -0.4 },
        { issue: 'Portion size', count: 28, sentiment: -0.3 },
        { issue: 'Service quality', count: 22, sentiment: 0.2 },
        { issue: 'Menu variety', count: 18, sentiment: 0.1 }
      ]
    };
    
    res.json(sentiment);
  } catch (error) {
    console.error('Error fetching sentiment analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/behavior-patterns
router.get('/behavior-patterns', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock behavior patterns
    const patterns = [
      { time: '10:00', weekday: 15, weekend: 12 },
      { time: '11:00', weekday: 25, weekend: 20 },
      { time: '12:00', weekday: 80, weekend: 65 },
      { time: '13:00', weekday: 95, weekend: 85 },
      { time: '14:00', weekday: 70, weekend: 60 },
      { time: '15:00', weekday: 40, weekend: 45 },
      { time: '16:00', weekday: 35, weekend: 40 },
      { time: '17:00', weekday: 45, weekend: 50 },
      { time: '18:00', weekday: 70, weekend: 75 },
      { time: '19:00', weekday: 85, weekend: 95 },
      { time: '20:00', weekday: 90, weekend: 100 },
      { time: '21:00', weekday: 60, weekend: 80 },
      { time: '22:00', weekday: 30, weekend: 50 }
    ];
    
    res.json({ patterns });
  } catch (error) {
    console.error('Error fetching behavior patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;