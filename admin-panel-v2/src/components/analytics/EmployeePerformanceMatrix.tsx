import React, { useState, useEffect } from 'react';
import {
  Award, Target, TrendingUp, Users, Clock, Star, 
  Trophy, Zap, Activity, BarChart3, Medal, Shield,
  Calendar, Download, Filter, ChevronUp, ChevronDown,
  Gamepad2, Crown, Flame, Heart
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';

interface EmployeeMetrics {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  metrics: {
    productivity: number;
    quality: number;
    speed: number;
    teamwork: number;
    punctuality: number;
    customerSatisfaction: number;
  };
  gamification: {
    level: number;
    xp: number;
    nextLevelXp: number;
    badges: Badge[];
    achievements: Achievement[];
    streak: number;
    rank: number;
  };
  performance: {
    ordersServed: number;
    averageOrderTime: number;
    customerRating: number;
    upsellRate: number;
    errorRate: number;
    efficiency: number;
  };
  trends: {
    productivity: number[];
    quality: number[];
    date: string[];
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedDate: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  completed: boolean;
}

interface TeamPerformance {
  department: string;
  averageScore: number;
  topPerformer: string;
  improvement: number;
  challenges: number;
}

interface Leaderboard {
  daily: EmployeeMetrics[];
  weekly: EmployeeMetrics[];
  monthly: EmployeeMetrics[];
  allTime: EmployeeMetrics[];
}

const EmployeePerformanceMatrix: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'comparison'>('grid');
  const [employees, setEmployees] = useState<EmployeeMetrics[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'productivity' | 'quality' | 'speed'>('overall');

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const [employeesRes, teamRes, leaderboardRes] = await Promise.all([
        analyticsAPI.getEmployeePerformance({ range: dateRange }),
        analyticsAPI.getTeamPerformance({ range: dateRange }),
        analyticsAPI.getPerformanceLeaderboard({ range: dateRange })
      ]);

      setEmployees(employeesRes.data.employees || mockEmployeeData());
      setTeamPerformance(teamRes.data.teams || mockTeamData());
      setLeaderboard(leaderboardRes.data || mockLeaderboardData());
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      // Use mock data as fallback
      setEmployees(mockEmployeeData());
      setTeamPerformance(mockTeamData());
      setLeaderboard(mockLeaderboardData());
    }
    setLoading(false);
  };

  // Mock data generators
  const mockEmployeeData = (): EmployeeMetrics[] => {
    const names = ['Ahmed Hassan', 'Sara Ahmed', 'Mohammed Ali', 'Fatima Khan', 'Omar Khalil'];
    const roles = ['Chef', 'Waiter', 'Cashier', 'Manager', 'Bartender'];
    const departments = ['Kitchen', 'Service', 'Front Desk', 'Management', 'Bar'];
    
    return names.map((name, index) => ({
      id: `emp-${index + 1}`,
      name,
      role: roles[index],
      department: departments[index],
      metrics: {
        productivity: 75 + Math.random() * 20,
        quality: 80 + Math.random() * 15,
        speed: 70 + Math.random() * 25,
        teamwork: 85 + Math.random() * 10,
        punctuality: 90 + Math.random() * 10,
        customerSatisfaction: 75 + Math.random() * 20
      },
      gamification: {
        level: Math.floor(5 + Math.random() * 15),
        xp: Math.floor(2500 + Math.random() * 7500),
        nextLevelXp: 10000,
        badges: [
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
          }
        ],
        achievements: [
          {
            id: 'a1',
            name: 'Order Master',
            description: 'Serve 1000 orders',
            progress: 850,
            target: 1000,
            reward: '500 XP',
            completed: false
          },
          {
            id: 'a2',
            name: 'Perfect Week',
            description: 'No errors for 7 days',
            progress: 5,
            target: 7,
            reward: 'Special Badge',
            completed: false
          }
        ],
        streak: Math.floor(Math.random() * 30),
        rank: index + 1
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
    }));
  };

  const mockTeamData = (): TeamPerformance[] => [
    { department: 'Kitchen', averageScore: 85, topPerformer: 'Ahmed Hassan', improvement: 12, challenges: 3 },
    { department: 'Service', averageScore: 88, topPerformer: 'Sara Ahmed', improvement: 8, challenges: 2 },
    { department: 'Front Desk', averageScore: 82, topPerformer: 'Mohammed Ali', improvement: 15, challenges: 4 },
    { department: 'Bar', averageScore: 90, topPerformer: 'Omar Khalil', improvement: 5, challenges: 1 }
  ];

  const mockLeaderboardData = (): Leaderboard => {
    const employees = mockEmployeeData();
    return {
      daily: employees.sort((a, b) => b.performance.ordersServed - a.performance.ordersServed),
      weekly: employees.sort((a, b) => b.gamification.xp - a.gamification.xp),
      monthly: employees.sort((a, b) => b.performance.customerRating - a.performance.customerRating),
      allTime: employees.sort((a, b) => b.gamification.level - a.gamification.level)
    };
  };

  const getOverallScore = (metrics: EmployeeMetrics['metrics']) => {
    const weights = {
      productivity: 0.25,
      quality: 0.25,
      speed: 0.15,
      teamwork: 0.15,
      punctuality: 0.1,
      customerSatisfaction: 0.1
    };
    
    return Object.entries(metrics).reduce((score, [key, value]) => {
      return score + value * weights[key as keyof typeof weights];
    }, 0);
  };

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'epic': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'rare': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 20) return 'text-orange-600';
    if (level >= 15) return 'text-purple-600';
    if (level >= 10) return 'text-blue-600';
    if (level >= 5) return 'text-green-600';
    return 'text-gray-600';
  };

  const renderPerformanceRadar = (employee: EmployeeMetrics) => {
    const data = Object.entries(employee.metrics).map(([key, value]) => ({
      metric: key.replace(/([A-Z])/g, ' $1').trim(),
      value: value
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" fontSize={12} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.6}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedEmployeeData = selectedEmployee 
    ? employees.find(e => e.id === selectedEmployee)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Performance Matrix</h2>
          <p className="text-gray-500">Advanced metrics, gamification & productivity tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1 rounded ${viewMode === 'comparison' ? 'bg-white shadow' : ''}`}
            >
              Compare
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Team Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {teamPerformance.map((team, index) => (
          <motion.div
            key={team.department}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">{team.department}</h3>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{team.averageScore}%</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {team.improvement > 0 ? (
                <ChevronUp className="w-4 h-4 text-green-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-500" />
              )}
              <span className={team.improvement > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(team.improvement)}%
              </span>
              <span className="text-gray-500">vs last period</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Top: {team.topPerformer}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => {
            const overallScore = getOverallScore(employee.metrics);
            
            return (
              <motion.div
                key={employee.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer"
                onClick={() => setSelectedEmployee(employee.id)}
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getLevelColor(employee.gamification.level)}`}>
                      Lv.{employee.gamification.level}
                    </div>
                    <div className="text-xs text-gray-500">
                      {employee.gamification.xp}/{employee.gamification.nextLevelXp} XP
                    </div>
                  </div>
                </div>

                {/* Performance Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Overall Score</span>
                    <span className="text-sm font-medium">{Math.round(overallScore)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${overallScore}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {employee.performance.ordersServed}
                    </div>
                    <div className="text-xs text-gray-500">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {employee.performance.customerRating.toFixed(1)}⭐
                    </div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {employee.gamification.streak}🔥
                    </div>
                    <div className="text-xs text-gray-500">Streak</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 mb-4">
                  {employee.gamification.badges.slice(0, 3).map((badge) => (
                    <div
                      key={badge.id}
                      className={`px-2 py-1 rounded-full text-xs text-white ${getBadgeColor(badge.rarity)}`}
                      title={badge.description}
                    >
                      {badge.name}
                    </div>
                  ))}
                  {employee.gamification.badges.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{employee.gamification.badges.length - 3} more
                    </span>
                  )}
                </div>

                {/* Achievement Progress */}
                <div className="space-y-2">
                  {employee.gamification.achievements.slice(0, 2).map((achievement) => (
                    <div key={achievement.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">{achievement.name}</span>
                        <span className="text-gray-500">
                          {achievement.progress}/{achievement.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-green-500 h-1 rounded-full"
                          style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badges
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const overallScore = getOverallScore(employee.metrics);
                
                return (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEmployee(employee.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${getLevelColor(employee.gamification.level)}`}>
                        Lv.{employee.gamification.level}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.gamification.xp} XP
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.performance.ordersServed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {employee.performance.customerRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${employee.performance.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {Math.round(employee.performance.efficiency)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(overallScore)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {employee.gamification.badges.slice(0, 3).map((badge, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full ${getBadgeColor(badge.rarity)}`}
                            title={badge.name}
                          />
                        ))}
                        {employee.gamification.badges.length > 3 && (
                          <span className="text-xs text-gray-500 ml-1">
                            +{employee.gamification.badges.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'comparison' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Scatter Plot */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vs Efficiency</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="efficiency" name="Efficiency" unit="%" />
                <YAxis dataKey="rating" name="Rating" />
                <ZAxis dataKey="orders" name="Orders" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  name="Employees"
                  data={employees.map(e => ({
                    name: e.name,
                    efficiency: e.performance.efficiency,
                    rating: e.performance.customerRating,
                    orders: e.performance.ordersServed
                  }))}
                  fill="#3B82F6"
                >
                  {employees.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#10B981' : '#3B82F6'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Leaderboard</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Leaders</h4>
                <div className="space-y-2">
                  {leaderboard?.daily.slice(0, 3).map((emp, index) => (
                    <div key={emp.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          'bg-orange-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{emp.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {emp.performance.ordersServed} orders
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly XP Leaders</h4>
                <div className="space-y-2">
                  {leaderboard?.weekly.slice(0, 3).map((emp, index) => (
                    <div key={emp.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          'bg-orange-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{emp.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {emp.gamification.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      <AnimatePresence>
        {selectedEmployeeData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Employee Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployeeData.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedEmployeeData.name}</h2>
                    <p className="text-gray-500">{selectedEmployeeData.role} - {selectedEmployeeData.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Performance Radar */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                {renderPerformanceRadar(selectedEmployeeData)}
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gamification Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Gamification Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Level Progress</span>
                        <span className="text-sm font-medium">
                          {selectedEmployeeData.gamification.xp}/{selectedEmployeeData.gamification.nextLevelXp} XP
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                          style={{ 
                            width: `${(selectedEmployeeData.gamification.xp / selectedEmployeeData.gamification.nextLevelXp) * 100}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Achievements</h4>
                      <div className="space-y-2">
                        {selectedEmployeeData.gamification.achievements.map((achievement) => (
                          <div key={achievement.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{achievement.name}</span>
                              <span className="text-xs text-gray-500">{achievement.reward}</span>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">{achievement.description}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  achievement.completed ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ 
                                  width: `${(achievement.progress / achievement.target) * 100}%` 
                                }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {achievement.progress}/{achievement.target}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Trends */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={selectedEmployeeData.trends.date.map((date, i) => ({
                      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                      productivity: selectedEmployeeData.trends.productivity[i],
                      quality: selectedEmployeeData.trends.quality[i]
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="productivity" 
                        stroke="#3B82F6" 
                        name="Productivity"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="quality" 
                        stroke="#10B981" 
                        name="Quality"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Badges Earned</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployeeData.gamification.badges.map((badge) => (
                        <div
                          key={badge.id}
                          className={`px-3 py-2 rounded-lg text-white text-sm ${getBadgeColor(badge.rarity)}`}
                        >
                          <div className="font-medium">{badge.name}</div>
                          <div className="text-xs opacity-90">{badge.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeePerformanceMatrix;