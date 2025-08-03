import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, RefreshCw, Clock, CheckCircle, XCircle,
  AlertCircle, DollarSign, User, Users, MapPin, ShoppingBag,
  ChevronRight, Eye, Edit, Trash2, Plus, CreditCard,
  Loader2, Calendar, TrendingUp, ArrowUpDown, ArrowRight, Activity, ChefHat, BarChart3
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import OrderDetailsModal from './OrderDetailsModal';
import PaymentModal from './PaymentModal';
import CreateOrderModal from './CreateOrderModal';
import EditOrderModal from './EditOrderModal';
import SplitBillModal from './SplitBillModal';
import MergeOrdersModal from './MergeOrdersModal';
import TransferOrderModal from './TransferOrderModal';
import OrderFlowPipeline from './OrderFlowPipeline';
import ChefPerformance from './ChefPerformance';
import OrderHeatMap from './OrderHeatMap';
import OrderTrends from './OrderTrends';
import { useSocketConnection } from '../../hooks/useSocketConnection';
import StationLoadBalancer from './StationLoadBalancer';
import MultiKitchenDisplay from './MultiKitchenDisplay';

interface OrderItem {
  _id: string;
  menuItem?: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  tip?: number;
  discount?: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'wallet';
  waiter?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [showMergeOrdersModal, setShowMergeOrdersModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin'); // For demo, in production get from auth
  const [activeTab, setActiveTab] = useState<'orders' | 'flow' | 'performance' | 'heatmap' | 'trends' | 'loadbalancer' | 'multikitchen'>('orders');

  // Socket connection for real-time updates
  const socket = useSocketConnection();

  useEffect(() => {
    fetchOrders();
    // Set up real-time listeners
    setupSocketListeners();

    return () => {
      // Clean up socket listeners
      if (socket) {
        socket.off('order-created');
        socket.off('order-updated');
        socket.off('order-status-updated');
        socket.off('order-paid');
        socket.off('order-cancelled');
      }
    };
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, filterStatus, filterDate, sortBy]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('order-created', (data: any) => {
      fetchOrders();
      toast.success(`New order #${data.orderNumber} from Table ${data.tableNumber}`);
    });

    socket.on('order-status-updated', (data: any) => {
      updateOrderInList(data.orderId, { status: data.status });
      toast.success(`Order status updated to ${data.status}`);
    });

    socket.on('order-paid', (data: any) => {
      updateOrderInList(data.orderId, { 
        paymentStatus: 'paid', 
        status: 'paid',
        paymentMethod: data.paymentMethod 
      });
      toast.success(`Order #${data.orderNumber} paid successfully`);
    });
  };

  const updateOrderInList = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => 
      (prevOrders || []).map(order => 
        order._id === orderId ? { ...order, ...updates } : order
      )
    );
  };

  const fetchOrders = async () => {
    try {
      const params: any = {};
      
      // Add date filter
      if (filterDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.startDate = today.toISOString();
      } else if (filterDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString();
      }

      const response = await ordersAPI.getOrders(params);
      const ordersData = response.data || [];
      
      setOrders(ordersData);
      calculateStats(ordersData);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const stats = ordersData.reduce((acc, order) => {
      acc.totalOrders++;
      
      if (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing') {
        acc.pendingOrders++;
      } else if (order.status === 'paid') {
        acc.completedOrders++;
      }
      
      if (order.paymentStatus === 'paid') {
        acc.totalRevenue += order.total;
      }
      
      return acc;
    }, {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    });

    stats.averageOrderValue = stats.completedOrders > 0 
      ? stats.totalRevenue / stats.completedOrders 
      : 0;

    setStats(stats);
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.tableNumber.includes(searchQuery)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount':
          return b.total - a.total;
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, newStatus);
      updateOrderInList(orderId, { status: newStatus as Order['status'] });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleSplitBill = (order: Order) => {
    setSelectedOrder(order);
    setShowSplitBillModal(true);
  };

  const handleTransferOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowTransferModal(true);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      served: 'bg-purple-100 text-purple-800',
      paid: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
      case 'preparing':
        return <AlertCircle className="h-4 w-4" />;
      case 'ready':
      case 'served':
        return <CheckCircle className="h-4 w-4" />;
      case 'paid':
        return <DollarSign className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <ShoppingBag className="h-4 w-4" />;
    }
  };

  const getNextStatus = (currentStatus: string, role: string) => {
    const transitions: Record<string, Record<string, string[]>> = {
      admin: {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['served'],
        served: ['paid']
      },
      waiter: {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['cancelled'],
        ready: ['served']
      },
      chef: {
        confirmed: ['preparing'],
        preparing: ['ready']
      }
    };

    return transitions[role]?.[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Order Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('flow')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'flow'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Order Flow Pipeline
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <ChefHat className="h-5 w-5 mr-2" />
                Chef Performance
              </div>
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'heatmap'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Heat Maps
              </div>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'trends'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Trends
              </div>
            </button>
            <button
              onClick={() => setActiveTab('loadbalancer')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'loadbalancer'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Station Load Balancer
              </div>
            </button>
            <button
              onClick={() => setActiveTab('multikitchen')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'multikitchen'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <ChefHat className="h-5 w-5 mr-2" />
                Multi-Kitchen
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.pendingOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    AED {(stats.totalRevenue || 0).toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Order Value
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    AED {(stats.averageOrderValue || 0).toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, customer name, or table..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Date Filter */}
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount">Highest Amount</option>
          </select>

          {/* Create Order Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </button>

          {/* Merge Orders Button */}
          <button
            onClick={() => setShowMergeOrdersModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            Merge Orders
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredOrders && filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <li key={order._id} className="hover:bg-gray-50 transition-colors">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            Order #{order.orderNumber}
                          </h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          Table {order.tableNumber}
                          <span className="mx-2">•</span>
                          <User className="h-4 w-4 mr-1" />
                          {order.customerName}
                          {order.waiter && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Waiter: {order.waiter.name}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(order.createdAt), 'MMM dd, yyyy h:mm a')}
                          <span className="mx-2">•</span>
                          {order.items.length} items
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          AED {(order.total || 0).toFixed(2)}
                        </p>
                        {order.paymentStatus === 'paid' && (
                          <p className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Paid ({order.paymentMethod})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status Update Dropdown */}
                        {order.status !== 'paid' && order.status !== 'cancelled' && (
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                              className="block py-1 px-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Update Status</option>
                              {(getNextStatus(order.status, selectedRole) || []).map(status => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Edit Button */}
                        {!['paid', 'cancelled'].includes(order.status) && (
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        )}

                        {/* Transfer Button */}
                        {!['paid', 'cancelled'].includes(order.status) && (
                          <button
                            onClick={() => handleTransferOrder(order)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Transfer
                          </button>
                        )}

                        {/* Split Bill Button */}
                        {order.status === 'served' && order.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => handleSplitBill(order)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Split
                          </button>
                        )}

                        {/* Payment Button */}
                        {order.status === 'served' && order.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => handlePayment(order)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Orders will appear here when customers place them'}
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          userRole={selectedRole}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={() => {
          setShowCreateModal(false);
          fetchOrders();
        }}
      />

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrder(null);
          }}
          onOrderUpdated={() => {
            setShowEditModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Split Bill Modal */}
      {showSplitBillModal && selectedOrder && (
        <SplitBillModal
          order={selectedOrder}
          isOpen={showSplitBillModal}
          onClose={() => {
            setShowSplitBillModal(false);
            setSelectedOrder(null);
          }}
          onSplitComplete={() => {
            setShowSplitBillModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Merge Orders Modal */}
      <MergeOrdersModal
        isOpen={showMergeOrdersModal}
        onClose={() => setShowMergeOrdersModal(false)}
        onMergeComplete={() => {
          setShowMergeOrdersModal(false);
          fetchOrders();
        }}
        currentOrder={selectedOrder || undefined}
      />

      {/* Transfer Order Modal */}
      {showTransferModal && selectedOrder && (
        <TransferOrderModal
          order={selectedOrder}
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedOrder(null);
          }}
          onTransferComplete={() => {
            setShowTransferModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}
        </>
      )}

      {/* Order Flow Pipeline Tab */}
      {activeTab === 'flow' && (
        <OrderFlowPipeline />
      )}

      {/* Chef Performance Tab */}
      {activeTab === 'performance' && (
        <ChefPerformance />
      )}

      {/* Heat Map Tab */}
      {activeTab === 'heatmap' && (
        <OrderHeatMap />
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <OrderTrends />
      )}

      {/* Station Load Balancer Tab */}
      {activeTab === 'loadbalancer' && (
        <StationLoadBalancer />
      )}

      {/* Multi-Kitchen Display Tab */}
      {activeTab === 'multikitchen' && (
        <MultiKitchenDisplay />
      )}
    </div>
  );
};

export default OrdersManagement;