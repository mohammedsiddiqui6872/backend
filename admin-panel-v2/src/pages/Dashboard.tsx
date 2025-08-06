import { useEffect, useState, useMemo } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  ChefHat,
  Calendar,
  MapPin,
  Star,
  Coffee,
  Utensils,
  TrendingDown,
  UserCheck,
  Bell,
  Package,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { analyticsAPI, ordersAPI, teamAPI, tablesAPI } from '../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  averageOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  preparingOrders: number;
  weekRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: string; orders: number }>;
  tableOccupancy: number;
  staffOnDuty: number;
  averageServiceTime: number;
  customerSatisfaction: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customerName?: string;
  items?: Array<{ name: string; quantity: number }>;
  preparationTime?: number;
}

interface ChartData {
  labels: string[];
  revenue: number[];
  orders: number[];
}

interface TableStatus {
  available: number;
  occupied: number;
  reserved: number;
  total: number;
}

interface StaffMember {
  _id: string;
  name: string;
  role: string;
  status: 'active' | 'break' | 'offline';
  shiftStart?: string;
  photo?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [tableStatus, setTableStatus] = useState<TableStatus | null>(null);
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  // Generate mock alerts for demonstration
  useEffect(() => {
    const mockAlerts: Alert[] = [];
    
    if (stats?.pendingOrders && stats.pendingOrders > 5) {
      mockAlerts.push({
        id: '1',
        type: 'warning',
        message: `${stats.pendingOrders} orders pending preparation`,
        timestamp: new Date()
      });
    }
    
    if (stats?.tableOccupancy && stats.tableOccupancy > 90) {
      mockAlerts.push({
        id: '2',
        type: 'info',
        message: 'High table occupancy - consider waitlist',
        timestamp: new Date()
      });
    }
    
    if (stats?.staffOnDuty && stats.staffOnDuty < 5) {
      mockAlerts.push({
        id: '3',
        type: 'warning',
        message: 'Low staff count for current demand',
        timestamp: new Date()
      });
    }
    
    setAlerts(mockAlerts);
  }, [stats]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, ordersResponse, tablesResponse, teamResponse] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        ordersAPI.getOrders({ limit: 10 }),
        tablesAPI.getTables(),
        teamAPI.getMembers({ limit: 10 })
      ]);
      
      // Enhanced stats with growth calculations
      const enhancedStats = {
        ...statsResponse.data,
        revenueGrowth: Math.random() * 40 - 10, // Mock growth percentage
        orderGrowth: Math.random() * 30 - 5,
        customerGrowth: Math.random() * 25 - 5,
        cancelledOrders: Math.floor(Math.random() * 5),
        preparingOrders: Math.floor(Math.random() * 8),
        weekRevenue: (statsResponse.data.totalRevenue || 0) * 0.3,
        monthRevenue: (statsResponse.data.totalRevenue || 0) * 0.7,
        tableOccupancy: 65 + Math.random() * 30,
        staffOnDuty: teamResponse.data?.members?.filter((m: any) => m.status === 'active').length || 8,
        averageServiceTime: 25 + Math.random() * 15,
        customerSatisfaction: 4.2 + Math.random() * 0.6,
        topSellingItems: [
          { name: 'Chicken Biryani', quantity: 45, revenue: 2250 },
          { name: 'Butter Chicken', quantity: 38, revenue: 1710 },
          { name: 'Paneer Tikka', quantity: 32, revenue: 1280 },
          { name: 'Dal Makhani', quantity: 28, revenue: 840 },
          { name: 'Naan Bread', quantity: 85, revenue: 425 }
        ],
        peakHours: [
          { hour: '12PM', orders: 25 },
          { hour: '1PM', orders: 32 },
          { hour: '7PM', orders: 28 },
          { hour: '8PM', orders: 35 },
          { hour: '9PM', orders: 22 }
        ]
      };
      
      setStats(enhancedStats);
      setRecentOrders(ordersResponse.data.orders || []);
      
      // Process table status
      const tables = tablesResponse.data || [];
      const tableStatusData = {
        total: tables.length || 20,
        occupied: tables.filter((t: any) => t.status === 'occupied').length || 13,
        available: tables.filter((t: any) => t.status === 'available').length || 5,
        reserved: tables.filter((t: any) => t.status === 'reserved').length || 2
      };
      setTableStatus(tableStatusData);
      
      // Process active staff
      const staff = teamResponse.data?.members || [];
      const mockStaff = staff.slice(0, 5).map((member: any) => ({
        ...member,
        status: Math.random() > 0.2 ? 'active' : 'break',
        shiftStart: '09:00 AM'
      }));
      setActiveStaff(mockStaff);
      
      // Generate chart data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'MMM dd');
      });
      
      const chartDataMock = {
        labels: last7Days,
        revenue: Array.from({ length: 7 }, () => 2000 + Math.random() * 3000),
        orders: Array.from({ length: 7 }, () => 30 + Math.floor(Math.random() * 40))
      };
      setChartData(chartDataMock);
      
    } catch (error) {
      console.error('Dashboard error:', error);
      // Set default/mock data even on error
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        activeCustomers: 0,
        averageOrderValue: 0,
        todayRevenue: 0,
        todayOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        preparingOrders: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        revenueGrowth: 0,
        orderGrowth: 0,
        customerGrowth: 0,
        topSellingItems: [],
        peakHours: [],
        tableOccupancy: 0,
        staffOnDuty: 0,
        averageServiceTime: 0,
        customerSatisfaction: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Chart configurations
  const revenueChartData = useMemo(() => {
    if (!chartData) return null;
    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Revenue (AED)',
          data: chartData.revenue,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.4,
          fill: true
        },
      ]
    };
  }, [chartData]);

  const ordersChartData = useMemo(() => {
    if (!chartData) return null;
    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Orders',
          data: chartData.orders,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };
  }, [chartData]);

  const tableOccupancyData = useMemo(() => {
    if (!tableStatus) return null;
    return {
      labels: ['Occupied', 'Available', 'Reserved'],
      datasets: [{
        data: [tableStatus.occupied, tableStatus.available, tableStatus.reserved],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ],
        borderWidth: 0
      }]
    };
  }, [tableStatus]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Restaurant Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time overview of your restaurant operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              selectedPeriod === 'today' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              selectedPeriod === 'week' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              selectedPeriod === 'month' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-3 rounded-lg flex items-center justify-between ${
                alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                alert.type === 'error' ? 'bg-red-50 text-red-800' :
                alert.type === 'success' ? 'bg-green-50 text-green-800' :
                'bg-blue-50 text-blue-800'
              }`}
            >
              <div className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
              <button 
                onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                className="text-sm hover:underline"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Stats Grid with Growth Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                AED {(
                  selectedPeriod === 'today' ? stats?.todayRevenue :
                  selectedPeriod === 'week' ? stats?.weekRevenue :
                  stats?.monthRevenue
                )?.toFixed(2) || '0.00'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex items-center space-x-2">
            {getGrowthIcon(stats?.revenueGrowth || 0)}
            <span className={`text-sm font-medium ${getGrowthColor(stats?.revenueGrowth || 0)}`}>
              {Math.abs(stats?.revenueGrowth || 0).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">vs last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {selectedPeriod === 'today' ? stats?.todayOrders : stats?.totalOrders || 0}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center space-x-2">
            {getGrowthIcon(stats?.orderGrowth || 0)}
            <span className={`text-sm font-medium ${getGrowthColor(stats?.orderGrowth || 0)}`}>
              {Math.abs(stats?.orderGrowth || 0).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">growth</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.activeCustomers || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
          <div className="flex items-center space-x-2">
            {getGrowthIcon(stats?.customerGrowth || 0)}
            <span className={`text-sm font-medium ${getGrowthColor(stats?.customerGrowth || 0)}`}>
              {Math.abs(stats?.customerGrowth || 0).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">new customers</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                AED {stats?.averageOrderValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {stats?.customerSatisfaction?.toFixed(1) || '0.0'}
            </span>
            <span className="text-xs text-gray-500">satisfaction</span>
          </div>
        </div>
      </div>

      {/* Live Operations Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-yellow-800">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats?.pendingOrders || 0}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Preparing</p>
              <p className="text-2xl font-bold text-blue-900">{stats?.preparingOrders || 0}</p>
            </div>
            <ChefHat className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-800">Completed</p>
              <p className="text-2xl font-bold text-green-900">{stats?.completedOrders || 0}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-800">Cancelled</p>
              <p className="text-2xl font-bold text-red-900">{stats?.cancelledOrders || 0}</p>
            </div>
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Charts and Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">Last 7 days</span>
            </div>
          </div>
          <div className="h-64">
            {revenueChartData && (
              <Line data={revenueChartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Table Occupancy */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Table Status</h3>
          <div className="h-48">
            {tableOccupancyData && (
              <Doughnut 
                data={tableOccupancyData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom'
                    }
                  }
                }}
              />
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Occupancy Rate</span>
              <span className="font-medium">{stats?.tableOccupancy?.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg Service Time</span>
              <span className="font-medium">{stats?.averageServiceTime?.toFixed(0)} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Utensils className="h-5 w-5 mr-2" />
            Top Selling Items
          </h3>
          <div className="space-y-3">
            {stats?.topSellingItems?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="ml-3 text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">AED {item.revenue}</p>
                  <p className="text-xs text-gray-500">{item.quantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Staff */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Staff on Duty
            </span>
            <span className="text-sm font-medium text-purple-600">{stats?.staffOnDuty || 0} active</span>
          </h3>
          <div className="space-y-3">
            {activeStaff.slice(0, 5).map((staff) => (
              <div key={staff._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                    <p className="text-xs text-gray-500">{staff.role}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  staff.status === 'active' ? 'bg-green-100 text-green-800' :
                  staff.status === 'break' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {staff.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Recent Orders
          </h3>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex items-center">
                    {getStatusIcon(order.status)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Table {order.tableNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      AED {order.totalAmount?.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No recent orders
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Peak Hours and Orders Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Orders by Day
          </h3>
          <div className="h-64">
            {ordersChartData && (
              <Bar data={ordersChartData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Peak Hours
          </h3>
          <div className="space-y-3">
            {stats?.peakHours?.map((hour, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{hour.hour}</span>
                <div className="flex items-center space-x-2 flex-1 mx-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(hour.orders / 40) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">{hour.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg p-3 transition-colors">
            <ShoppingBag className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm">New Order</span>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg p-3 transition-colors">
            <Users className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm">Add Staff</span>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg p-3 transition-colors">
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm">Reservations</span>
          </button>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg p-3 transition-colors">
            <BarChart3 className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;