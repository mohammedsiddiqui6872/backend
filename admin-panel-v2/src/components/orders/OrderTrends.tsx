import { useState, useEffect } from 'react';
import {
  TrendingUp, Calendar, DollarSign, ShoppingBag, Clock,
  Users, AlertTriangle, Package, ChevronLeft, ChevronRight,
  Download, Filter, BarChart3, LineChart, PieChart, Info
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface TrendData {
  date: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  itemsSold: number;
  peakHour: number;
  customerCount: number;
}

interface CategoryTrend {
  category: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface TimePeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

interface SeasonalPattern {
  month: string;
  avgOrders: number;
  avgRevenue: number;
  peakDays: string[];
  popularItems: string[];
}

interface CustomerBehavior {
  newCustomers: number;
  returningCustomers: number;
  avgOrdersPerCustomer: number;
  preferredOrderTime: string;
  favoriteCategories: string[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const OrderTrends = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [comparisons, setComparisons] = useState<TimePeriodComparison[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);
  const [customerBehavior, setCustomerBehavior] = useState<CustomerBehavior | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders' | 'items'>('revenue');

  useEffect(() => {
    fetchTrendData();
  }, [timeRange, customStartDate, customEndDate]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      let startDate: Date;
      let endDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) return;
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      const response = await analyticsAPI.getTrendAnalysis({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const data = response.data || {};
      setTrendData(data.trends || []);
      setCategoryTrends(data.categoryTrends || []);
      setComparisons(data.comparisons || []);
      setSeasonalPatterns(data.seasonalPatterns || []);
      setCustomerBehavior(data.customerBehavior || null);
    } catch (error) {
      toast.error('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Orders', 'Revenue', 'Avg Order Value', 'Items Sold'],
      ...trendData.map(row => [
        row.date,
        row.orders,
        row.revenue,
        row.avgOrderValue,
        row.itemsSold
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => `AED ${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const TrendChart = () => {
    const dataKey = selectedMetric === 'revenue' ? 'revenue' : selectedMetric === 'orders' ? 'orders' : 'itemsSold';
    const color = selectedMetric === 'revenue' ? '#3B82F6' : selectedMetric === 'orders' ? '#10B981' : '#F59E0B';

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Trend Analysis</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                selectedMetric === 'revenue'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('orders')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                selectedMetric === 'orders'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setSelectedMetric('items')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                selectedMetric === 'items'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Items
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
            />
            <YAxis 
              tickFormatter={(value) => 
                selectedMetric === 'revenue' ? `AED ${value}` : value.toString()
              }
            />
            <Tooltip 
              labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
              formatter={(value: any) => 
                selectedMetric === 'revenue' ? formatCurrency(value) : value
              }
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${selectedMetric})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const ComparisonCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {comparisons.map((comp, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">{comp.metric}</p>
            <div className={`flex items-center text-sm font-medium ${
              comp.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {comp.change > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-1 transform rotate-180" />
              )}
              {formatPercent(comp.changePercent)}
            </div>
          </div>
          <p className="text-2xl font-bold">
            {comp.metric.includes('Revenue') || comp.metric.includes('AOV')
              ? formatCurrency(comp.current)
              : comp.current.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            vs {comp.metric.includes('Revenue') || comp.metric.includes('AOV')
              ? formatCurrency(comp.previous)
              : comp.previous.toLocaleString()} previous period
          </p>
        </div>
      ))}
    </div>
  );

  const CategoryTrendsChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Category Performance Trends</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categoryTrends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="previous" name="Previous Period" fill="#E5E7EB" />
          <Bar dataKey="current" name="Current Period" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {categoryTrends.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
            <span className="font-medium">{cat.category}</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {cat.current} orders
              </span>
              <div className={`flex items-center text-sm font-medium ${
                cat.trend === 'up' ? 'text-green-600' : 
                cat.trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {cat.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : cat.trend === 'down' ? (
                  <TrendingUp className="h-4 w-4 mr-1 transform rotate-180" />
                ) : (
                  <span className="mr-1">-</span>
                )}
                {formatPercent(cat.change)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CustomerBehaviorInsights = () => {
    if (!customerBehavior) return null;

    const pieData = [
      { name: 'New Customers', value: customerBehavior.newCustomers },
      { name: 'Returning Customers', value: customerBehavior.returningCustomers }
    ];

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Customer Behavior Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Customer Type Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Average Orders per Customer</p>
              <p className="text-2xl font-bold">{customerBehavior.avgOrdersPerCustomer.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Preferred Order Time</p>
              <p className="text-lg font-medium">{customerBehavior.preferredOrderTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Favorite Categories</p>
              <div className="flex flex-wrap gap-2">
                {customerBehavior.favoriteCategories.map((cat, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SeasonalPatterns = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Seasonal Patterns</h3>
      
      <div className="space-y-4">
        {seasonalPatterns.map((pattern, idx) => (
          <div key={idx} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{pattern.month}</h4>
              <div className="text-sm text-gray-600">
                Avg {pattern.avgOrders} orders/day
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Average Revenue</p>
                <p className="font-medium">{formatCurrency(pattern.avgRevenue)}</p>
              </div>
              <div>
                <p className="text-gray-600">Peak Days</p>
                <p className="font-medium">{pattern.peakDays.join(', ')}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">Popular Items</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {pattern.popularItems.slice(0, 3).map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Use seasonal patterns to plan inventory, staffing, and promotions. 
              Peak days typically require 20-30% more staff and inventory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary-600" />
              Order Trends & Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Historical patterns and predictive insights for your restaurant
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {timeRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </>
            )}
            
            <button
              onClick={exportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <ComparisonCards />

      {/* Main Trend Chart */}
      <TrendChart />

      {/* Category Trends */}
      <CategoryTrendsChart />

      {/* Customer Behavior */}
      <CustomerBehaviorInsights />

      {/* Seasonal Patterns */}
      <SeasonalPatterns />
    </div>
  );
};

export default OrderTrends;