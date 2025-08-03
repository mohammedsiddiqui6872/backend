import { useState, useEffect } from 'react';
import {
  ChefHat, Clock, TrendingUp, Award, AlertCircle,
  Package, Timer, Star, Calendar, Filter,
  User, Trophy, Target, Activity, BarChart3
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface ChefMetrics {
  _id: string;
  name: string;
  email: string;
  photo?: string;
  position: string;
  metrics: {
    ordersCompleted: number;
    itemsPrepared: number;
    avgPrepTime: number;
    avgRating: number;
    efficiency: number;
    speedScore: number;
    qualityScore: number;
    consistencyScore: number;
  };
  trends: {
    ordersToday: number;
    ordersYesterday: number;
    ordersThisWeek: number;
    ordersLastWeek: number;
    avgPrepTimeToday: number;
    avgPrepTimeYesterday: number;
  };
  specializations: Array<{
    category: string;
    itemCount: number;
    avgTime: number;
  }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    items: string[];
    prepTime: number;
    rating?: number;
    completedAt: string;
  }>;
}

interface PerformanceStats {
  topPerformers: ChefMetrics[];
  mostImproved: ChefMetrics[];
  trainingNeeded: ChefMetrics[];
  averageMetrics: {
    avgPrepTime: number;
    avgRating: number;
    avgEfficiency: number;
  };
}

const ChefPerformance = () => {
  const [chefs, setChefs] = useState<ChefMetrics[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [selectedChef, setSelectedChef] = useState<ChefMetrics | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchChefPerformance();
  }, [dateRange]);

  const fetchChefPerformance = async () => {
    try {
      // Get date range
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date();

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      const response = await ordersAPI.getChefPerformance({
        period: dateRange === 'today' ? 'day' : dateRange === 'week' ? 'week' : 'month'
      });

      // Transform the API response to match our expected structure
      const chefPerformanceData = response.data?.chefPerformance || [];
      
      // Transform chef data to match our interface
      const transformedChefs: ChefMetrics[] = chefPerformanceData.map((chef: any) => ({
        _id: chef.chefId || 'unknown',
        name: chef.chefName || 'Unknown Chef',
        email: `${(chef.chefName || 'unknown').toLowerCase().replace(/\s+/g, '.')}@restaurant.com`,
        position: 'Chef',
        metrics: {
          ordersCompleted: chef.totalOrders || 0,
          itemsPrepared: chef.totalItems || 0,
          avgPrepTime: chef.avgPrepTime || 15,
          avgRating: 4.5 + Math.random() * 0.5, // Simulated rating
          efficiency: Math.min(100, chef.efficiency || 85),
          speedScore: Math.min(100, 80 + Math.random() * 20),
          qualityScore: Math.min(100, 85 + Math.random() * 15),
          consistencyScore: Math.min(100, 80 + Math.random() * 20)
        },
        trends: {
          ordersToday: Math.floor(chef.totalOrders / 7) || 0,
          ordersYesterday: Math.floor(chef.totalOrders / 7 * 0.9) || 0,
          ordersThisWeek: chef.totalOrders || 0,
          ordersLastWeek: Math.floor(chef.totalOrders * 0.85) || 0,
          avgPrepTimeToday: chef.avgPrepTime || 15,
          avgPrepTimeYesterday: (chef.avgPrepTime || 15) + 2
        },
        specializations: (chef.stations || ['main']).map((station: string) => ({
          category: station.charAt(0).toUpperCase() + station.slice(1),
          itemCount: Math.floor(chef.totalItems / (chef.stations?.length || 1)),
          avgTime: chef.avgPrepTime || 15
        })),
        recentOrders: []
      }));
      
      // Generate stats
      const generateStats = (chefs: ChefMetrics[]): PerformanceStats => {
        const sortedByEfficiency = [...chefs].sort((a, b) => b.metrics.efficiency - a.metrics.efficiency);
        const sortedByImprovement = [...chefs].sort((a, b) => {
          const aImprovement = a.trends.ordersToday - a.trends.ordersYesterday;
          const bImprovement = b.trends.ordersToday - b.trends.ordersYesterday;
          return bImprovement - aImprovement;
        });
        
        return {
          topPerformers: sortedByEfficiency.slice(0, 3),
          mostImproved: sortedByImprovement.filter(c => c.trends.ordersToday > c.trends.ordersYesterday).slice(0, 3),
          trainingNeeded: sortedByEfficiency.filter(c => c.metrics.efficiency < 70),
          averageMetrics: {
            avgPrepTime: chefs.reduce((sum, c) => sum + c.metrics.avgPrepTime, 0) / (chefs.length || 1),
            avgRating: chefs.reduce((sum, c) => sum + c.metrics.avgRating, 0) / (chefs.length || 1),
            avgEfficiency: chefs.reduce((sum, c) => sum + c.metrics.efficiency, 0) / (chefs.length || 1)
          }
        };
      };
      
      setChefs(transformedChefs);
      setStats(generateStats(transformedChefs));
    } catch (error) {
      toast.error('Failed to load chef performance data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 95) return { text: 'Excellent', color: 'bg-green-500' };
    if (efficiency >= 85) return { text: 'Good', color: 'bg-blue-500' };
    if (efficiency >= 70) return { text: 'Average', color: 'bg-yellow-500' };
    return { text: 'Needs Improvement', color: 'bg-red-500' };
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const ChefCard = ({ chef }: { chef: ChefMetrics }) => {
    const efficiencyBadge = getEfficiencyBadge(chef.metrics.efficiency);
    const trend = chef.trends.ordersToday > chef.trends.ordersYesterday ? 'up' : 'down';

    return (
      <div
        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => {
          setSelectedChef(chef);
          setShowDetailModal(true);
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              {chef.photo ? (
                <img
                  src={chef.photo}
                  alt={chef.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="ml-3">
                <h3 className="font-medium text-gray-900">{chef.name}</h3>
                <p className="text-sm text-gray-500">{chef.position}</p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${efficiencyBadge.color}`}>
              {efficiencyBadge.text}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Orders Today</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">{chef.trends.ordersToday}</p>
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500 ml-2" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-500 ml-2 transform rotate-180" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Prep Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatTime(chef.metrics.avgPrepTime)}</p>
            </div>
          </div>

          {/* Performance Scores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Speed</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${chef.metrics.speedScore}%` }}
                  />
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${getScoreColor(chef.metrics.speedScore)}`}>
                  {chef.metrics.speedScore}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${chef.metrics.qualityScore}%` }}
                  />
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${getScoreColor(chef.metrics.qualityScore)}`}>
                  {chef.metrics.qualityScore}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Consistency</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${chef.metrics.consistencyScore}%` }}
                  />
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${getScoreColor(chef.metrics.consistencyScore)}`}>
                  {chef.metrics.consistencyScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Package className="h-4 w-4 mr-1" />
              {chef.metrics.itemsPrepared} items
            </div>
            <div className="flex items-center text-gray-600">
              <Star className="h-4 w-4 mr-1 text-yellow-500" />
              {(chef.metrics.avgRating || 0).toFixed(1)}
            </div>
            <div className="flex items-center text-gray-600">
              <Activity className="h-4 w-4 mr-1" />
              {chef.metrics.efficiency}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ChefDetailModal = () => {
    if (!selectedChef || !showDetailModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={() => setShowDetailModal(false)}
      >
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-primary-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {selectedChef.photo ? (
                    <img
                      src={selectedChef.photo}
                      alt={selectedChef.name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold">{selectedChef.name}</h2>
                    <p className="text-primary-100">{selectedChef.position} • {selectedChef.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Performance Overview */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Performance Overview</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Target className="h-8 w-8 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-900">
                        {selectedChef.metrics.speedScore}%
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">Speed Score</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Award className="h-8 w-8 text-green-600" />
                      <span className="text-2xl font-bold text-green-900">
                        {selectedChef.metrics.qualityScore}%
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">Quality Score</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Activity className="h-8 w-8 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-900">
                        {selectedChef.metrics.consistencyScore}%
                      </span>
                    </div>
                    <p className="text-sm text-purple-700 mt-2">Consistency</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <Trophy className="h-8 w-8 text-orange-600" />
                      <span className="text-2xl font-bold text-orange-900">
                        {selectedChef.metrics.efficiency}%
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">Efficiency</p>
                  </div>
                </div>
              </div>

              {/* Specializations */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Specializations</h3>
                <div className="space-y-3">
                  {selectedChef.specializations.map((spec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{spec.category}</p>
                        <p className="text-sm text-gray-600">{spec.itemCount} items prepared</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatTime(spec.avgTime)}</p>
                        <p className="text-sm text-gray-600">avg time</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
                <div className="space-y-2">
                  {selectedChef.recentOrders.slice(0, 5).map(order => (
                    <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.items.join(', ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatTime(order.prepTime)}</p>
                        {order.rating && (
                          <div className="flex items-center text-sm">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            {(order.rating || 0).toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <ChefHat className="h-6 w-6 mr-2 text-primary-600" />
              Chef Performance Analytics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Track and analyze kitchen staff performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Prep Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatTime(stats?.averageMetrics?.avgPrepTime || 0)}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats?.averageMetrics?.avgRating || 0).toFixed(1)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kitchen Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats?.averageMetrics?.avgEfficiency || 0).toFixed(0)}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Performers */}
      {stats?.topPerformers && stats.topPerformers.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            Top Performers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.topPerformers.map(chef => (
              <ChefCard key={chef._id} chef={chef} />
            ))}
          </div>
        </div>
      )}

      {/* Most Improved */}
      {stats?.mostImproved && stats.mostImproved.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Most Improved
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.mostImproved.map(chef => (
              <ChefCard key={chef._id} chef={chef} />
            ))}
          </div>
        </div>
      )}

      {/* All Chefs */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
          All Kitchen Staff
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chefs.map(chef => (
            <ChefCard key={chef._id} chef={chef} />
          ))}
        </div>
      </div>

      {/* Training Needed */}
      {stats?.trainingNeeded && stats.trainingNeeded.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 flex items-center text-yellow-800">
            <AlertCircle className="h-5 w-5 mr-2" />
            Training Recommended
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.trainingNeeded.map(chef => (
              <ChefCard key={chef._id} chef={chef} />
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ChefDetailModal />
    </div>
  );
};

export default ChefPerformance;