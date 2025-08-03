import { useState, useEffect } from 'react';
import {
  ShoppingBag, Clock, ChefHat, CheckCircle, Package,
  TrendingUp, Activity, ArrowRight, Timer, AlertCircle,
  Users, MapPin, DollarSign, Zap
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useSocketConnection } from '../../hooks/useSocketConnection';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: Array<{
    _id: string;
    name: string;
    quantity: number;
    status: string;
  }>;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  waiter?: {
    name: string;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  status: string;
  icon: any;
  color: string;
  bgColor: string;
  orders: Order[];
  avgTime: number;
}

interface FlowMetrics {
  totalOrders: number;
  avgCycleTime: number;
  peakHour: string;
  bottleneck: string;
  ordersPerHour: number;
}

const OrderFlowPipeline = () => {
  const [stages, setStages] = useState<PipelineStage[]>([
    {
      id: 'pending',
      name: 'New Orders',
      status: 'pending',
      icon: ShoppingBag,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      orders: [],
      avgTime: 0
    },
    {
      id: 'confirmed',
      name: 'Confirmed',
      status: 'confirmed',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      orders: [],
      avgTime: 0
    },
    {
      id: 'preparing',
      name: 'In Kitchen',
      status: 'preparing',
      icon: ChefHat,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      orders: [],
      avgTime: 0
    },
    {
      id: 'ready',
      name: 'Ready',
      status: 'ready',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      orders: [],
      avgTime: 0
    },
    {
      id: 'served',
      name: 'Served',
      status: 'served',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      orders: [],
      avgTime: 0
    }
  ]);

  const [metrics, setMetrics] = useState<FlowMetrics>({
    totalOrders: 0,
    avgCycleTime: 0,
    peakHour: '',
    bottleneck: '',
    ordersPerHour: 0
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'timeline'>('pipeline');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const socket = useSocketConnection();

  useEffect(() => {
    fetchOrderFlow();
    setupSocketListeners();

    const interval = autoRefresh ? setInterval(fetchOrderFlow, 10000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('order-status-updated', (data: any) => {
      fetchOrderFlow();
      if (data.status === 'ready') {
        toast.success(`Order #${data.orderNumber} is ready for service!`, {
          icon: '🔔',
          duration: 5000
        });
      }
    });

    socket.on('order-created', () => {
      fetchOrderFlow();
    });
  };

  const fetchOrderFlow = async () => {
    try {
      const response = await ordersAPI.getOrders({
        status: ['pending', 'confirmed', 'preparing', 'ready', 'served'],
        date: 'today'
      });

      const orders = response.data || [];
      
      // Distribute orders by status
      const newStages = stages.map(stage => {
        const stageOrders = orders.filter((order: Order) => order.status === stage.status);
        const avgTime = calculateAverageTime(stageOrders, stage.status);
        
        return {
          ...stage,
          orders: stageOrders,
          avgTime
        };
      });

      setStages(newStages);
      calculateMetrics(orders);
      identifyBottleneck(newStages);
    } catch (error) {
      console.error('Failed to fetch order flow:', error);
    }
  };

  const calculateAverageTime = (orders: Order[], status: string): number => {
    if (orders.length === 0) return 0;

    const times = orders.map(order => {
      const created = new Date(order.createdAt);
      const updated = new Date(order.updatedAt);
      return differenceInMinutes(updated, created);
    });

    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const calculateMetrics = (orders: Order[]) => {
    const completedOrders = orders.filter(o => ['served', 'paid'].includes(o.status));
    
    // Calculate average cycle time
    const cycleTimes = completedOrders.map(order => {
      const created = new Date(order.createdAt);
      const completed = new Date(order.updatedAt);
      return differenceInMinutes(completed, created);
    });
    
    const avgCycleTime = cycleTimes.length > 0
      ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
      : 0;

    // Find peak hour
    const hourCounts: Record<number, number> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // Calculate orders per hour
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const hoursSinceStart = differenceInMinutes(new Date(), startOfDay) / 60;
    const ordersPerHour = hoursSinceStart > 0 ? Math.round(orders.length / hoursSinceStart) : 0;

    setMetrics({
      totalOrders: orders.length,
      avgCycleTime,
      peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',
      bottleneck: '', // Set by identifyBottleneck
      ordersPerHour
    });
  };

  const identifyBottleneck = (stages: PipelineStage[]) => {
    let maxOrders = 0;
    let bottleneckStage = '';

    stages.forEach(stage => {
      if (stage.orders.length > maxOrders && stage.status !== 'served') {
        maxOrders = stage.orders.length;
        bottleneckStage = stage.name;
      }
    });

    setMetrics(prev => ({ ...prev, bottleneck: bottleneckStage }));
  };

  const getTimeColor = (minutes: number): string => {
    if (minutes < 10) return 'text-green-600';
    if (minutes < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const OrderCard = ({ order, stage }: { order: Order; stage: PipelineStage }) => {
    const timeInStage = differenceInMinutes(new Date(), new Date(order.updatedAt));
    
    return (
      <div
        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedOrder(order)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">#{order.orderNumber}</span>
          <span className={`text-xs ${getTimeColor(timeInStage)}`}>
            <Timer className="h-3 w-3 inline mr-1" />
            {timeInStage}m
          </span>
        </div>
        <div className="text-xs text-gray-600">
          <div className="flex items-center mb-1">
            <MapPin className="h-3 w-3 mr-1" />
            Table {order.tableNumber}
          </div>
          <div className="flex items-center">
            <Package className="h-3 w-3 mr-1" />
            {order.items.length} items
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Activity className="h-6 w-6 mr-2 text-primary-600" />
            Live Order Flow Pipeline
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'pipeline' ? 'timeline' : 'pipeline')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {viewMode === 'pipeline' ? 'Timeline View' : 'Pipeline View'}
            </button>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.avgCycleTime}m</p>
                <p className="text-sm text-gray-600">Avg Cycle Time</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.ordersPerHour}</p>
                <p className="text-sm text-gray-600">Orders/Hour</p>
              </div>
              <Zap className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.peakHour}</p>
                <p className="text-sm text-gray-600">Peak Hour</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-red-700">{metrics.bottleneck || 'None'}</p>
                <p className="text-sm text-red-600">Bottleneck</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Pipeline View */}
        {viewMode === 'pipeline' && (
          <div className="flex items-start space-x-4 overflow-x-auto pb-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-start">
                <div className="min-w-[250px]">
                  <div className={`${stage.bgColor} rounded-t-lg p-4 border-t-4 ${stage.color.replace('text', 'border')}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <stage.icon className={`h-5 w-5 mr-2 ${stage.color}`} />
                        <h3 className="font-medium text-gray-900">{stage.name}</h3>
                      </div>
                      <span className="text-sm font-medium">{stage.orders.length}</span>
                    </div>
                    {stage.avgTime > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Avg: {stage.avgTime}m
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                    <div className="space-y-2">
                      {stage.orders.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-8">
                          No orders
                        </p>
                      ) : (
                        stage.orders.map(order => (
                          <OrderCard key={order._id} order={order} stage={stage} />
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {index < stages.length - 1 && (
                  <ArrowRight className="h-6 w-6 text-gray-400 mt-6 mx-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            {stages.flatMap(stage => 
              stage.orders.map(order => ({
                ...order,
                stageName: stage.name,
                stageColor: stage.color,
                stageIcon: stage.icon
              }))
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20)
            .map(order => (
              <div
                key={order._id}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <order.stageIcon className={`h-6 w-6 ${order.stageColor}`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">#{order.orderNumber}</span>
                    <span className="text-sm text-gray-600">Table {order.tableNumber}</span>
                    <span className="text-sm text-gray-600">{order.customerName}</span>
                    <span className={`text-sm font-medium ${order.stageColor}`}>
                      {order.stageName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {format(new Date(order.createdAt), 'h:mm a')} • 
                    Last Update: {format(new Date(order.updatedAt), 'h:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">AED {(order.totalAmount || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{order.items.length} items</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4">Order #{selectedOrder.orderNumber}</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                Table {selectedOrder.tableNumber}
              </div>
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                {selectedOrder.customerName}
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                Created: {format(new Date(selectedOrder.createdAt), 'h:mm a')}
              </div>
              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                Total: AED {(selectedOrder.totalAmount || 0).toFixed(2)}
              </div>
              {selectedOrder.waiter && (
                <div className="flex items-center text-sm">
                  <Users className="h-4 w-4 mr-2 text-gray-400" />
                  Waiter: {selectedOrder.waiter.name}
                </div>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Items:</h4>
              <div className="space-y-1">
                {selectedOrder.items.map(item => (
                  <div key={item._id} className="text-sm text-gray-600">
                    {item.quantity}x {item.name}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-6 w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderFlowPipeline;