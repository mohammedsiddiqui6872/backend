const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/admin/analytics/revenue-predictions
router.get('/revenue-predictions', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock data for demonstration - In production, this would use ML models
    const days = range === '7d' ? 7 : range === '14d' ? 14 : range === '30d' ? 30 : 90;
    const predictions = [];
    const baseRevenue = 5000 + Math.random() * 2000;
    
    const today = new Date();
    for (let i = -3; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const seasonalMultiplier = isWeekend ? 1.3 : 1;
      const randomVariation = 0.8 + Math.random() * 0.4;
      
      const predicted = baseRevenue * seasonalMultiplier * randomVariation;
      const confidence = i < 0 ? 100 : Math.max(70, 100 - i * 2);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        actualRevenue: i < 0 ? predicted * (0.9 + Math.random() * 0.2) : null,
        predictedRevenue: predicted,
        confidenceLevel: confidence,
        upperBound: predicted * 1.15,
        lowerBound: predicted * 0.85
      });
    }
    
    res.json({
      predictions,
      accuracy: 92.5,
      modelVersion: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching revenue predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/demand-forecasts
router.get('/demand-forecasts', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // In production, this would fetch actual menu items and use historical data
    const forecasts = [
      { id: '1', name: 'Chicken Biryani', category: 'Main Course', baseStock: 50 },
      { id: '2', name: 'Paneer Tikka', category: 'Appetizer', baseStock: 30 },
      { id: '3', name: 'Chocolate Brownie', category: 'Dessert', baseStock: 40 },
      { id: '4', name: 'Fresh Juice', category: 'Beverage', baseStock: 60 },
      { id: '5', name: 'Caesar Salad', category: 'Salad', baseStock: 25 }
    ].map(item => ({
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      currentStock: Math.floor(item.baseStock * Math.random()),
      predictedDemand: Math.floor(item.baseStock * (0.6 + Math.random() * 0.8)),
      recommendedStock: Math.floor(item.baseStock * 1.2),
      confidence: 75 + Math.random() * 20,
      trend: Math.random() > 0.7 ? 'increasing' : Math.random() > 0.4 ? 'stable' : 'decreasing',
      seasonalFactor: 0.8 + Math.random() * 0.4
    }));
    
    res.json({
      forecasts,
      accuracy: 88.3,
      modelVersion: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching demand forecasts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock anomalies - In production, this would use anomaly detection algorithms
    const anomalies = [];
    
    // Random chance of anomalies
    if (Math.random() > 0.3) {
      anomalies.push({
        id: '1',
        type: 'revenue',
        severity: 'high',
        description: 'Unusual revenue spike detected',
        impact: 'Revenue 45% higher than typical Tuesday',
        detectedAt: new Date().toISOString(),
        value: 8500,
        expectedValue: 5850,
        deviation: 45,
        tenantId
      });
    }
    
    if (Math.random() > 0.5) {
      anomalies.push({
        id: '2',
        type: 'orders',
        severity: 'medium',
        description: 'Lower than expected lunch orders',
        impact: '30% fewer orders during lunch hours',
        detectedAt: new Date().toISOString(),
        value: 35,
        expectedValue: 50,
        deviation: -30,
        tenantId
      });
    }
    
    if (Math.random() > 0.4) {
      anomalies.push({
        id: '3',
        type: 'items',
        severity: 'low',
        description: 'Unusual item combination patterns',
        impact: 'New pairing trend detected: Dessert + Coffee',
        detectedAt: new Date().toISOString(),
        value: 25,
        expectedValue: 10,
        deviation: 150,
        tenantId
      });
    }
    
    res.json({
      anomalies,
      totalDetected: anomalies.length,
      detectionRate: anomalies.length * 10,
      lastScan: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/ai-insights
router.get('/ai-insights', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock AI insights - In production, this would use ML models to generate insights
    const insights = [
      {
        id: '1',
        category: 'Revenue Optimization',
        insight: 'Weekend dinner revenue is 40% below potential',
        recommendation: 'Introduce weekend dinner specials or promotional offers',
        potentialImpact: 'Could increase weekly revenue by AED 3,500-4,200',
        confidence: 87,
        priority: 'high',
        tenantId
      },
      {
        id: '2',
        category: 'Inventory Management',
        insight: 'Chicken Biryani demand peaks on Fridays',
        recommendation: 'Increase Chicken Biryani prep by 30% on Thursdays',
        potentialImpact: 'Reduce stockouts and capture AED 1,200 in lost sales',
        confidence: 92,
        priority: 'high',
        tenantId
      },
      {
        id: '3',
        category: 'Staffing Optimization',
        insight: 'Overstaffing detected during 2-4 PM on weekdays',
        recommendation: 'Reduce staff by 1-2 members during slow afternoon hours',
        potentialImpact: 'Save AED 800-1,000 weekly in labor costs',
        confidence: 78,
        priority: 'medium',
        tenantId
      },
      {
        id: '4',
        category: 'Menu Engineering',
        insight: 'Dessert attachment rate is only 15%',
        recommendation: 'Train staff on dessert upselling techniques',
        potentialImpact: 'Increase average order value by AED 12-15',
        confidence: 85,
        priority: 'medium',
        tenantId
      }
    ];
    
    res.json({
      insights,
      totalInsights: insights.length,
      avgConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length,
      lastGenerated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/real-time-metrics
router.get('/real-time-metrics', async (req, res) => {
  try {
    const tenantId = req.tenant.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Mock real-time metrics - In production, this would come from cache/real-time system
    const metrics = {
      revenue: 12500 + Math.random() * 2000,
      revenueChange: -5 + Math.random() * 15,
      revenueSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      orders: Math.floor(85 + Math.random() * 20),
      ordersChange: -10 + Math.random() * 25,
      ordersSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      activeCustomers: Math.floor(35 + Math.random() * 15),
      customersChange: -5 + Math.random() * 20,
      customersSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      avgOrderValue: 140 + Math.random() * 40,
      avgOrderValueChange: -8 + Math.random() * 20,
      avgOrderValueSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      tableOccupancy: Math.floor(65 + Math.random() * 30),
      tableOccupancyChange: -15 + Math.random() * 30,
      tableOccupancySparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      avgPrepTime: Math.floor(15 + Math.random() * 15),
      avgPrepTimeChange: -5 + Math.random() * 10,
      avgPrepTimeSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      staffEfficiency: Math.floor(75 + Math.random() * 20),
      staffEfficiencyChange: -10 + Math.random() * 20,
      staffEfficiencySparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      customerSatisfaction: Math.floor(85 + Math.random() * 10),
      customerSatisfactionChange: -5 + Math.random() * 10,
      customerSatisfactionSparkline: Array.from({ length: 20 }, () => Math.random() * 100),
      
      lastUpdated: new Date().toISOString()
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;