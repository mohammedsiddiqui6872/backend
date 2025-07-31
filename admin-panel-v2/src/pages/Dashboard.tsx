import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { analyticsAPI, ordersAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  averageOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customerName?: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, ordersResponse] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        ordersAPI.getOrders({ limit: 10 })
      ]);
      
      setStats(statsResponse.data);
      setRecentOrders(ordersResponse.data.orders || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's an overview of your restaurant.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                AED {stats?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Today: AED {stats?.todayRevenue?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalOrders || 0}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Today: {stats?.todayOrders || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.activeCustomers || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Currently dining
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order</p>
              <p className="text-2xl font-semibold text-gray-900">
                AED {stats?.averageOrderValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Per customer
          </p>
        </div>
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Pending Orders</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">
                {stats?.pendingOrders || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Completed Today</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">
                {stats?.completedOrders || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between">
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
                      AED {order.totalAmount.toFixed(2)}
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
    </div>
  );
};

export default Dashboard;