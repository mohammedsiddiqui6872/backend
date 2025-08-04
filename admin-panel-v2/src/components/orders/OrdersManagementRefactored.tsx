import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocketConnection } from '../../hooks/useSocketConnection';
import { useInterval } from '../../hooks/useInterval';

// Modular components
import { OrdersHeader } from './OrdersHeader';
import { OrderStats } from './OrderStats';
import { OrdersList } from './OrdersList';
import { OrderTabs, OrderTab } from './OrderTabs';

// Modal components
import OrderDetailsModal from './OrderDetailsModal';
import PaymentModal from './PaymentModal';
import CreateOrderModal from './CreateOrderModal';
import EditOrderModal from './EditOrderModal';
import SplitBillModal from './SplitBillModal';
import MergeOrdersModal from './MergeOrdersModal';
import TransferOrderModal from './TransferOrderModal';

// Tab components
import OrderFlowPipeline from './OrderFlowPipeline';
import ChefPerformance from './ChefPerformance';
import OrderHeatMap from './OrderHeatMap';
import OrderTrends from './OrderTrends';
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

const OrdersManagementRefactored = () => {
  // State management
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [showMergeOrdersModal, setShowMergeOrdersModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<OrderTab>('orders');
  
  // Socket connection
  const socket = useSocketConnection();

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (!refreshing) {
      fetchOrders();
    }
  }, 30000);

  // Calculate filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
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

    return filtered;
  }, [orders, searchQuery, filterStatus, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const result = orders.reduce((acc, order) => {
      acc.totalOrders++;
      
      if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
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

    result.averageOrderValue = result.completedOrders > 0 
      ? result.totalRevenue / result.completedOrders 
      : 0;

    return result;
  }, [orders]);

  // Socket listeners setup
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (data: any) => {
      fetchOrders();
      toast.success(`New order #${data.orderNumber} from Table ${data.tableNumber}`);
    };

    const handleOrderStatusUpdated = (data: any) => {
      updateOrderInList(data.orderId, { status: data.status });
      toast.success(`Order status updated to ${data.status}`);
    };

    const handleOrderPaid = (data: any) => {
      updateOrderInList(data.orderId, { 
        paymentStatus: 'paid', 
        status: 'paid',
        paymentMethod: data.paymentMethod 
      });
      toast.success(`Order #${data.orderNumber} paid successfully`);
    };

    socket.on('order-created', handleOrderCreated);
    socket.on('order-status-updated', handleOrderStatusUpdated);
    socket.on('order-paid', handleOrderPaid);

    return () => {
      socket.off('order-created', handleOrderCreated);
      socket.off('order-status-updated', handleOrderStatusUpdated);
      socket.off('order-paid', handleOrderPaid);
    };
  }, [socket]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [filterDate]);

  const updateOrderInList = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
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
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handlePayment = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handleCreateOrder = () => {
    setShowCreateModal(true);
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
      <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <>
          {/* Header with filters */}
          <OrdersHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            sortBy={sortBy}
            setSortBy={setSortBy}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onCreateOrder={handleCreateOrder}
          />

          {/* Statistics */}
          <OrderStats stats={stats} />

          {/* Orders List */}
          <OrdersList
            orders={filteredOrders}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            loading={loading}
            onViewOrder={handleViewOrder}
            onEditOrder={handleEditOrder}
            onPayment={handlePayment}
            onUpdateStatus={handleStatusUpdate}
          />
        </>
      )}

      {activeTab === 'flow' && <OrderFlowPipeline />}
      {activeTab === 'performance' && <ChefPerformance />}
      {activeTab === 'heatmap' && <OrderHeatMap />}
      {activeTab === 'trends' && <OrderTrends />}
      {activeTab === 'loadbalancer' && <StationLoadBalancer />}
      {activeTab === 'multikitchen' && <MultiKitchenDisplay />}

      {/* Modals */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          userRole="admin"
        />
      )}

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

      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onOrderCreated={() => {
          setShowCreateModal(false);
          fetchOrders();
        }}
      />

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

      <MergeOrdersModal
        isOpen={showMergeOrdersModal}
        onClose={() => setShowMergeOrdersModal(false)}
        onMergeComplete={() => {
          setShowMergeOrdersModal(false);
          fetchOrders();
        }}
        currentOrder={selectedOrder || undefined}
      />

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
    </div>
  );
};

export default OrdersManagementRefactored;