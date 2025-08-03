const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/admin/analytics/pl-statement
router.get('/pl-statement', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock P&L statement - In production, calculate from actual data
    const statement = [
      {
        category: 'Revenue',
        subcategories: [
          { name: 'Food Sales', amount: 285000, percentage: 75, trend: 'up', variance: 12 },
          { name: 'Beverage Sales', amount: 85000, percentage: 22, trend: 'up', variance: 8 },
          { name: 'Delivery Fees', amount: 12000, percentage: 3, trend: 'stable', variance: 0 }
        ],
        total: 382000,
        percentageOfRevenue: 100
      },
      {
        category: 'Cost of Goods Sold',
        subcategories: [
          { name: 'Food Costs', amount: 95000, percentage: 68, trend: 'up', variance: -5 },
          { name: 'Beverage Costs', amount: 25000, percentage: 18, trend: 'stable', variance: -2 },
          { name: 'Packaging', amount: 8000, percentage: 6, trend: 'down', variance: 3 },
          { name: 'Other COGS', amount: 12000, percentage: 8, trend: 'stable', variance: 0 }
        ],
        total: 140000,
        percentageOfRevenue: 36.6
      },
      {
        category: 'Operating Expenses',
        subcategories: [
          { name: 'Labor Costs', amount: 95000, percentage: 52, trend: 'stable', variance: -1 },
          { name: 'Rent', amount: 35000, percentage: 19, trend: 'stable', variance: 0 },
          { name: 'Utilities', amount: 12000, percentage: 7, trend: 'up', variance: -8 },
          { name: 'Marketing', amount: 15000, percentage: 8, trend: 'up', variance: 15 },
          { name: 'Other OpEx', amount: 25000, percentage: 14, trend: 'down', variance: 5 }
        ],
        total: 182000,
        percentageOfRevenue: 47.6
      }
    ];
    
    res.json({ statement });
  } catch (error) {
    console.error('Error fetching P&L statement:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/cost-breakdown
router.get('/cost-breakdown', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock cost breakdown
    const breakdown = [
      {
        category: 'Food & Beverage',
        amount: 120000,
        percentage: 35,
        color: '#3B82F6',
        subcategories: [
          { name: 'Proteins', amount: 45000, percentage: 37.5 },
          { name: 'Vegetables', amount: 25000, percentage: 20.8 },
          { name: 'Dairy', amount: 20000, percentage: 16.7 },
          { name: 'Beverages', amount: 20000, percentage: 16.7 },
          { name: 'Others', amount: 10000, percentage: 8.3 }
        ]
      },
      {
        category: 'Labor',
        amount: 95000,
        percentage: 28,
        color: '#10B981',
        subcategories: [
          { name: 'Kitchen Staff', amount: 40000, percentage: 42.1 },
          { name: 'Service Staff', amount: 30000, percentage: 31.6 },
          { name: 'Management', amount: 20000, percentage: 21.1 },
          { name: 'Support Staff', amount: 5000, percentage: 5.2 }
        ]
      },
      {
        category: 'Overhead',
        amount: 72000,
        percentage: 21,
        color: '#F59E0B',
        subcategories: [
          { name: 'Rent', amount: 35000, percentage: 48.6 },
          { name: 'Utilities', amount: 12000, percentage: 16.7 },
          { name: 'Insurance', amount: 8000, percentage: 11.1 },
          { name: 'Maintenance', amount: 10000, percentage: 13.9 },
          { name: 'Others', amount: 7000, percentage: 9.7 }
        ]
      },
      {
        category: 'Marketing',
        amount: 15000,
        percentage: 4,
        color: '#EF4444'
      },
      {
        category: 'Technology',
        amount: 10000,
        percentage: 3,
        color: '#8B5CF6'
      },
      {
        category: 'Other',
        amount: 30000,
        percentage: 9,
        color: '#6B7280'
      }
    ];
    
    res.json({ breakdown });
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/roi-metrics
router.get('/roi-metrics', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock ROI metrics
    const metrics = [
      {
        id: '1',
        name: 'Digital Marketing Campaign',
        investment: 15000,
        returns: 45000,
        roi: 200,
        paybackPeriod: '2 months',
        status: 'excellent',
        trend: 'improving'
      },
      {
        id: '2',
        name: 'Kitchen Equipment Upgrade',
        investment: 50000,
        returns: 65000,
        roi: 30,
        paybackPeriod: '8 months',
        status: 'good',
        trend: 'stable'
      },
      {
        id: '3',
        name: 'Staff Training Program',
        investment: 8000,
        returns: 12000,
        roi: 50,
        paybackPeriod: '6 months',
        status: 'good',
        trend: 'improving'
      },
      {
        id: '4',
        name: 'Loyalty Program',
        investment: 20000,
        returns: 35000,
        roi: 75,
        paybackPeriod: '4 months',
        status: 'excellent',
        trend: 'stable'
      },
      {
        id: '5',
        name: 'Delivery Service Expansion',
        investment: 30000,
        returns: 28000,
        roi: -7,
        paybackPeriod: 'Not yet',
        status: 'poor',
        trend: 'improving'
      }
    ];
    
    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching ROI metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/cash-flow
router.get('/cash-flow', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock cash flow data
    const cashFlow = [];
    let cumulative = 0;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const inflow = (isWeekend ? 15000 : 12000) + Math.random() * 3000;
      const outflow = (isWeekend ? 10000 : 9000) + Math.random() * 2000;
      const netCashFlow = inflow - outflow;
      cumulative += netCashFlow;
      
      cashFlow.push({
        date: date.toISOString().split('T')[0],
        inflow,
        outflow,
        netCashFlow,
        cumulativeCashFlow: cumulative
      });
    }
    
    res.json({ cashFlow });
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/financial-ratios
router.get('/financial-ratios', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock financial ratios
    const ratios = [
      {
        name: 'Gross Profit Margin',
        value: 63.4,
        benchmark: 60,
        status: 'above',
        description: 'Revenue minus COGS as % of revenue'
      },
      {
        name: 'Net Profit Margin',
        value: 15.8,
        benchmark: 12,
        status: 'above',
        description: 'Net profit as % of revenue'
      },
      {
        name: 'Labor Cost Ratio',
        value: 24.9,
        benchmark: 30,
        status: 'above',
        description: 'Labor costs as % of revenue'
      },
      {
        name: 'Food Cost Ratio',
        value: 31.4,
        benchmark: 35,
        status: 'above',
        description: 'Food costs as % of food revenue'
      },
      {
        name: 'Operating Expense Ratio',
        value: 47.6,
        benchmark: 50,
        status: 'above',
        description: 'Operating expenses as % of revenue'
      },
      {
        name: 'EBITDA Margin',
        value: 18.2,
        benchmark: 15,
        status: 'above',
        description: 'Earnings before interest, tax, depreciation'
      }
    ];
    
    res.json({ ratios });
  } catch (error) {
    console.error('Error fetching financial ratios:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/financial-summary
router.get('/financial-summary', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock financial summary
    const summary = {
      revenue: 382000,
      revenueGrowth: 12.5,
      grossProfit: 242000,
      grossMargin: 63.4,
      netProfit: 60000,
      netMargin: 15.8,
      ebitda: 69556,
      ebitdaMargin: 18.2,
      cashOnHand: 125000,
      burnRate: 8500,
      runway: '14.7 months'
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;