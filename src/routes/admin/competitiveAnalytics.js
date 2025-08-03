const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/admin/analytics/competitors
router.get('/competitors', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock competitor data - In production, integrate with competitor APIs
    const competitors = [
      {
        id: '1',
        name: 'Spice Garden Restaurant',
        type: 'direct',
        distance: 0.8,
        rating: 4.3,
        priceRange: '$$-$$$',
        marketShare: 22,
        strengths: ['Authentic cuisine', 'Fast delivery', 'Large portions'],
        weaknesses: ['Limited parking', 'No online ordering', 'Higher prices'],
        recentChanges: [
          {
            type: 'menu',
            description: 'Added 15 new vegan dishes',
            impact: 'negative',
            date: '2025-07-25'
          },
          {
            type: 'pricing',
            description: 'Reduced lunch prices by 15%',
            impact: 'negative',
            date: '2025-07-20'
          }
        ]
      },
      {
        id: '2',
        name: 'Quick Bites Cafe',
        type: 'indirect',
        distance: 1.2,
        rating: 4.1,
        priceRange: '$-$$',
        marketShare: 18,
        strengths: ['Fast service', 'Budget friendly', 'Good location'],
        weaknesses: ['Limited menu', 'Average quality', 'Small space'],
        recentChanges: [
          {
            type: 'expansion',
            description: 'Opened second location nearby',
            impact: 'negative',
            date: '2025-07-15'
          }
        ]
      },
      {
        id: '3',
        name: 'The Gourmet House',
        type: 'direct',
        distance: 2.1,
        rating: 4.6,
        priceRange: '$$$-$$$$',
        marketShare: 15,
        strengths: ['Premium quality', 'Excellent service', 'Ambiance'],
        weaknesses: ['Very expensive', 'Long wait times', 'Limited capacity'],
        recentChanges: [
          {
            type: 'service',
            description: 'Introduced reservation system',
            impact: 'neutral',
            date: '2025-07-10'
          }
        ]
      }
    ];
    
    res.json({ competitors });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/market-position
router.get('/market-position', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock market position data
    const position = [
      {
        dimension: 'Price Competitiveness',
        ourScore: 75,
        marketAverage: 65,
        topPerformer: 85,
        percentile: 72
      },
      {
        dimension: 'Service Speed',
        ourScore: 82,
        marketAverage: 70,
        topPerformer: 90,
        percentile: 81
      },
      {
        dimension: 'Menu Variety',
        ourScore: 88,
        marketAverage: 75,
        topPerformer: 92,
        percentile: 85
      },
      {
        dimension: 'Customer Satisfaction',
        ourScore: 86,
        marketAverage: 78,
        topPerformer: 91,
        percentile: 83
      },
      {
        dimension: 'Digital Presence',
        ourScore: 90,
        marketAverage: 60,
        topPerformer: 95,
        percentile: 88
      },
      {
        dimension: 'Value for Money',
        ourScore: 80,
        marketAverage: 72,
        topPerformer: 88,
        percentile: 78
      }
    ];
    
    res.json({ position });
  } catch (error) {
    console.error('Error fetching market position:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/pricing-opportunities
router.get('/pricing-opportunities', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock pricing opportunities
    const opportunities = [
      {
        itemId: '1',
        itemName: 'Chicken Biryani',
        currentPrice: 45,
        marketAverage: 52,
        suggestedPrice: 49,
        potentialRevenue: 1200,
        confidence: 85,
        reasoning: 'Your quality exceeds competitors, price below market average'
      },
      {
        itemId: '2',
        itemName: 'Vegetable Curry',
        currentPrice: 35,
        marketAverage: 32,
        suggestedPrice: 33,
        potentialRevenue: -400,
        confidence: 78,
        reasoning: 'Slightly above market, consider small reduction for volume'
      },
      {
        itemId: '3',
        itemName: 'Premium Thali',
        currentPrice: 65,
        marketAverage: 75,
        suggestedPrice: 72,
        potentialRevenue: 2100,
        confidence: 92,
        reasoning: 'Premium offering underpriced, customers willing to pay more'
      },
      {
        itemId: '4',
        itemName: 'Fresh Juice',
        currentPrice: 15,
        marketAverage: 18,
        suggestedPrice: 17,
        potentialRevenue: 800,
        confidence: 88,
        reasoning: 'High demand item, slight increase won\'t affect volume'
      }
    ];
    
    res.json({ opportunities });
  } catch (error) {
    console.error('Error fetching pricing opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/market-trends
router.get('/market-trends', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock market trends
    const trends = [
      {
        name: 'Plant-Based Revolution',
        impact: 'high',
        direction: 'growing',
        relevance: 85,
        description: '40% increase in vegan/vegetarian searches in your area',
        actionItems: [
          'Expand vegetarian menu section',
          'Highlight vegan options prominently',
          'Create plant-based combo meals'
        ]
      },
      {
        name: 'Contactless Dining',
        impact: 'medium',
        direction: 'growing',
        relevance: 75,
        description: 'QR ordering adoption up 60% among competitors',
        actionItems: [
          'Optimize mobile ordering experience',
          'Add contactless payment options',
          'Promote QR code ordering'
        ]
      },
      {
        name: 'Health-Conscious Eating',
        impact: 'high',
        direction: 'growing',
        relevance: 80,
        description: 'Calorie-conscious options seeing 35% growth',
        actionItems: [
          'Add nutritional information to menu',
          'Create healthy meal options',
          'Offer customizable portions'
        ]
      },
      {
        name: 'Late Night Delivery',
        impact: 'medium',
        direction: 'stable',
        relevance: 65,
        description: 'After 10 PM orders growing at 25% monthly',
        actionItems: [
          'Extend delivery hours',
          'Create late-night specific menu',
          'Partner with night delivery services'
        ]
      }
    ];
    
    res.json({ trends });
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/benchmark-data
router.get('/benchmark-data', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock benchmark data
    const categories = ['Revenue', 'Orders', 'Avg Order', 'Customer Return', 'Satisfaction'];
    const benchmark = categories.map(category => ({
      category,
      us: 75 + Math.random() * 20,
      marketLeader: 85 + Math.random() * 10,
      marketAverage: 65 + Math.random() * 15
    }));
    
    res.json({ benchmark });
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;