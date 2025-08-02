import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';
import { menuAnalyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface VelocityItem {
  _id: string;
  name: string;
  category: string;
  image?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  salesPerDay: number;
  revenuePerDay: number;
  velocity: number;
  peakHour: number | null;
  peakHourSales: number;
  bestDayOfWeek: number | null;
  bestDaySales: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  stockDaysRemaining: number | null;
}

interface VelocitySummary {
  totalItems: number;
  avgSalesPerDay: number;
  totalRevenue: number;
  fastMovers: number;
  slowMovers: number;
  criticalStock: number;
}

const SalesVelocityTracker = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VelocityItem[]>([]);
  const [summary, setSummary] = useState<VelocitySummary | null>(null);
  const [period, setPeriod] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchVelocityData();
  }, [period, selectedCategory, limit]);

  const fetchVelocityData = async () => {
    try {
      setLoading(true);
      const response = await menuAnalyticsAPI.getSalesVelocity({
        period,
        category: selectedCategory,
        limit
      });

      if (response.data.success) {
        setItems(response.data.data.items);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching velocity data:', error);
      toast.error('Failed to load sales velocity data');
    } finally {
      setLoading(false);
    }
  };

  const getHourDisplay = (hour: number | null) => {
    if (hour === null) return '-';
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getDayDisplay = (day: number | null) => {
    if (day === null) return '-';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day - 1] || '-';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 bg-green-50';
      case 'decreasing':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Sales Velocity Tracking</h2>
        <p className="mt-1 text-sm text-gray-600">
          Monitor how fast your menu items are selling and identify trends
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Daily Sales</p>
                <p className="text-xl font-semibold text-gray-900">
                  {summary.avgSalesPerDay.toFixed(1)}
                </p>
              </div>
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${(summary.totalRevenue / 1000).toFixed(1)}k
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fast Movers</p>
                <p className="text-xl font-semibold text-green-600">
                  {summary.fastMovers}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Slow Movers</p>
                <p className="text-xl font-semibold text-orange-600">
                  {summary.slowMovers}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Stock</p>
                <p className="text-xl font-semibold text-red-600">
                  {summary.criticalStock}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-xl font-semibold text-gray-900">
                  {summary.totalItems}
                </p>
              </div>
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="">All Categories</option>
              {/* Categories will be populated dynamically */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Show Top
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
              <option value={100}>100 items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item._id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-lg object-cover mr-4"
                  />
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getTrendColor(item.trend)}`}>
                <div className="flex items-center">
                  {getTrendIcon(item.trend)}
                  <span className="ml-1 capitalize">{item.trend}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Sales Velocity</p>
                <p className="text-xl font-semibold text-gray-900">
                  {item.velocity.toFixed(1)}/day
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue/Day</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${item.revenuePerDay.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Peak Hour</p>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="font-medium">{getHourDisplay(item.peakHour)}</span>
                </div>
                {item.peakHour !== null && (
                  <p className="text-xs text-gray-500">{item.peakHourSales} sales</p>
                )}
              </div>

              <div>
                <p className="text-gray-600 mb-1">Best Day</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="font-medium">{getDayDisplay(item.bestDayOfWeek)}</span>
                </div>
                {item.bestDayOfWeek !== null && (
                  <p className="text-xs text-gray-500">{item.bestDaySales} sales</p>
                )}
              </div>

              <div>
                <p className="text-gray-600 mb-1">Stock Days</p>
                {item.stockDaysRemaining !== null ? (
                  <div className={`flex items-center ${
                    item.stockDaysRemaining < 7 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span className="font-medium">{item.stockDaysRemaining} days</span>
                  </div>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Sold ({period} days)</span>
                <span className="font-medium">{item.totalQuantitySold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-medium">${item.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesVelocityTracker;