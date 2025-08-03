const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Shift = require('../../models/Shift');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// GET /api/admin/analytics/employee-performance
router.get('/employee-performance', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Calculate date range
    const days = parseInt(range.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get all employees
    const employees = await User.find({ 
      tenantId,
      role: { $in: ['chef', 'waiter', 'bartender', 'cashier'] },
      isActive: true
    });
    
    // Mock performance data - In production, calculate from actual data
    const employeePerformance = employees.map(emp => {
      const metrics = {
        productivity: 75 + Math.random() * 20,
        quality: 80 + Math.random() * 15,
        speed: 70 + Math.random() * 25,
        teamwork: 85 + Math.random() * 10,
        punctuality: 90 + Math.random() * 10,
        customerSatisfaction: 75 + Math.random() * 20
      };
      
      const level = Math.floor(5 + Math.random() * 15);
      const xp = Math.floor(2500 + Math.random() * 7500);
      
      return {
        id: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.profile?.department || 'Unknown',
        avatar: emp.profile?.avatar,
        metrics,
        gamification: {
          level,
          xp,
          nextLevelXp: 10000,
          badges: generateBadges(),
          achievements: generateAchievements(),
          streak: Math.floor(Math.random() * 30),
          rank: Math.floor(Math.random() * 10) + 1
        },
        performance: {
          ordersServed: Math.floor(50 + Math.random() * 150),
          averageOrderTime: 12 + Math.random() * 8,
          customerRating: 4.2 + Math.random() * 0.8,
          upsellRate: 15 + Math.random() * 25,
          errorRate: Math.random() * 5,
          efficiency: 75 + Math.random() * 20
        },
        trends: {
          productivity: Array.from({ length: 7 }, () => 70 + Math.random() * 25),
          quality: Array.from({ length: 7 }, () => 75 + Math.random() * 20),
          date: Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
          })
        }
      };
    });
    
    res.json({ employees: employeePerformance });
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/team-performance
router.get('/team-performance', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Mock team performance data
    const teams = [
      { department: 'Kitchen', averageScore: 85, topPerformer: 'Ahmed Hassan', improvement: 12, challenges: 3 },
      { department: 'Service', averageScore: 88, topPerformer: 'Sara Ahmed', improvement: 8, challenges: 2 },
      { department: 'Front Desk', averageScore: 82, topPerformer: 'Mohammed Ali', improvement: 15, challenges: 4 },
      { department: 'Bar', averageScore: 90, topPerformer: 'Omar Khalil', improvement: 5, challenges: 1 }
    ];
    
    res.json({ teams });
  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/performance-leaderboard
router.get('/performance-leaderboard', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const tenantId = req.tenant.tenantId;
    
    // Get all employees
    const employees = await User.find({ 
      tenantId,
      role: { $in: ['chef', 'waiter', 'bartender', 'cashier'] },
      isActive: true
    });
    
    // Mock leaderboard data
    const mockEmployees = employees.map(emp => ({
      id: emp._id,
      name: emp.name,
      role: emp.role,
      department: emp.profile?.department || 'Unknown',
      performance: {
        ordersServed: Math.floor(50 + Math.random() * 150),
        customerRating: 4.2 + Math.random() * 0.8,
        efficiency: 75 + Math.random() * 20
      },
      gamification: {
        level: Math.floor(5 + Math.random() * 15),
        xp: Math.floor(2500 + Math.random() * 7500)
      }
    }));
    
    const leaderboard = {
      daily: [...mockEmployees].sort((a, b) => b.performance.ordersServed - a.performance.ordersServed),
      weekly: [...mockEmployees].sort((a, b) => b.gamification.xp - a.gamification.xp),
      monthly: [...mockEmployees].sort((a, b) => b.performance.customerRating - a.performance.customerRating),
      allTime: [...mockEmployees].sort((a, b) => b.gamification.level - a.gamification.level)
    };
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching performance leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/employee/:employeeId/game-stats
router.get('/employee/:employeeId/game-stats', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.tenant.tenantId;
    
    const employee = await User.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Mock game stats
    const gameStats = {
      level: Math.floor(5 + Math.random() * 15),
      xp: Math.floor(2500 + Math.random() * 7500),
      nextLevelXp: 10000,
      badges: generateBadges(),
      achievements: generateAchievements(),
      streak: Math.floor(Math.random() * 30),
      rank: Math.floor(Math.random() * 10) + 1,
      recentActivity: [
        { type: 'badge_earned', name: 'Speed Demon', timestamp: new Date() },
        { type: 'achievement_progress', name: 'Order Master', progress: 85, timestamp: new Date() },
        { type: 'level_up', level: 10, timestamp: new Date() }
      ]
    };
    
    res.json(gameStats);
  } catch (error) {
    console.error('Error fetching employee game stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function generateBadges() {
  const badges = [
    {
      id: 'b1',
      name: 'Speed Demon',
      description: 'Complete 100 orders under average time',
      icon: 'zap',
      rarity: 'rare',
      earnedDate: new Date().toISOString()
    },
    {
      id: 'b2',
      name: 'Customer Hero',
      description: 'Maintain 5-star rating for 30 days',
      icon: 'star',
      rarity: 'epic',
      earnedDate: new Date().toISOString()
    },
    {
      id: 'b3',
      name: 'Team Player',
      description: 'Help teammates 50 times',
      icon: 'users',
      rarity: 'common',
      earnedDate: new Date().toISOString()
    },
    {
      id: 'b4',
      name: 'Perfect Month',
      description: 'No errors or complaints for 30 days',
      icon: 'shield',
      rarity: 'legendary',
      earnedDate: new Date().toISOString()
    }
  ];
  
  // Return random subset of badges
  const count = Math.floor(Math.random() * 3) + 1;
  return badges.slice(0, count);
}

function generateAchievements() {
  return [
    {
      id: 'a1',
      name: 'Order Master',
      description: 'Serve 1000 orders',
      progress: Math.floor(Math.random() * 1000),
      target: 1000,
      reward: '500 XP',
      completed: false
    },
    {
      id: 'a2',
      name: 'Perfect Week',
      description: 'No errors for 7 days',
      progress: Math.floor(Math.random() * 7),
      target: 7,
      reward: 'Special Badge',
      completed: false
    },
    {
      id: 'a3',
      name: 'Upsell Champion',
      description: 'Upsell 100 items',
      progress: Math.floor(Math.random() * 100),
      target: 100,
      reward: '300 XP',
      completed: false
    },
    {
      id: 'a4',
      name: 'Speed Runner',
      description: 'Complete 50 orders in record time',
      progress: Math.floor(Math.random() * 50),
      target: 50,
      reward: 'Speed Badge',
      completed: false
    }
  ];
}

module.exports = router;