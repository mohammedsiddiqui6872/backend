import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, AlertCircle, ChefHat, ShoppingBag, 
  Activity, RefreshCw, Settings, Timer, Users, TrendingUp 
} from 'lucide-react';
import { format } from 'date-fns';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useSocketListener } from '../../hooks/useEnhancedSocket';
import { useInterval } from '../../hooks/useInterval';

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
  status: string;
  createdAt: string;
  priority?: 'normal' | 'high' | 'rush';
  preparationTime?: number;
}

interface PipelineStage {
  name: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served';
  orders: Order[];
  color: string;
  icon: React.ElementType;
}

const OrderFlowPipelineFixed: React.FC = () => {
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { name: 'Pending', status: 'pending', orders: [], color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    { name: 'Confirmed', status: 'confirmed', orders: [], color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    { name: 'Preparing', status: 'preparing', orders: [], color: 'bg-orange-100 text-orange-800', icon: ChefHat },
    { name: 'Ready', status: 'ready', orders: [], color: 'bg-green-100 text-green-800', icon: Activity },
    { name: 'Served', status: 'served', orders: [], color: 'bg-purple-100 text-purple-800', icon: ShoppingBag }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Socket listeners with proper cleanup
  useSocketListener('order-status-updated', (data: any) => {
    fetchOrderFlow();
    if (data.status === 'ready') {
      toast.success(`Order #${data.orderNumber} is ready for service!`, {
        icon: '🔔',
        duration: 5000
      });
    }
  });

  useSocketListener('order-created', () => {
    fetchOrderFlow();
  });

  // Initial fetch
  useEffect(() => {
    fetchOrderFlow();
  }, []);

  // Auto refresh with proper cleanup
  useInterval(
    () => {
      if (autoRefresh) {
        fetchOrderFlow();
      }
    },
    autoRefresh ? refreshInterval : null
  );

  const fetchOrderFlow = async () => {
    try {
      const response = await ordersAPI.getOrderFlow();
      const orders = response.data || [];
      
      // Group orders by status
      const newStages = pipelineStages.map(stage => ({
        ...stage,
        orders: orders.filter((order: Order) => order.status === stage.status)
      }));
      
      setPipelineStages(newStages);
    } catch (error) {
      console.error('Failed to fetch order flow:', error);
      toast.error('Failed to fetch order flow');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, order: Order, currentStage: string) => {
    e.dataTransfer.setData('orderId', order._id);
    e.dataTransfer.setData('currentStage', currentStage);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const currentStage = e.dataTransfer.getData('currentStage');
    
    if (currentStage === newStage) return;
    
    try {
      await ordersAPI.updateOrderStatus(orderId, newStage);
      toast.success(`Order moved to ${newStage}`);
      fetchOrderFlow();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Order Flow Pipeline</h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Auto Refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
              </select>
            )}
          </div>
        </div>
        <button
          onClick={fetchOrderFlow}
          className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-5 gap-4">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.status}
              className="bg-white rounded-lg shadow"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.status)}
            >
              <div className={`p-4 rounded-t-lg ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    <h3 className="font-semibold">{stage.name}</h3>
                  </div>
                  <span className="text-sm font-medium">{stage.orders.length}</span>
                </div>
              </div>
              
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {stage.orders.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No orders</p>
                ) : (
                  stage.orders.map((order) => (
                    <div
                      key={order._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order, stage.status)}
                      className="bg-gray-50 p-3 rounded-lg cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">#{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.priority === 'rush' ? 'bg-red-100 text-red-800' :
                          order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.priority || 'normal'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Table {order.tableNumber}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(order.createdAt), 'h:mm a')}
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">{order.items.length} items</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">
                {pipelineStages.reduce((sum, stage) => sum + stage.orders.length, 0)}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Kitchen</p>
              <p className="text-2xl font-bold">
                {pipelineStages.find(s => s.status === 'preparing')?.orders.length || 0}
              </p>
            </div>
            <ChefHat className="h-8 w-8 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to Serve</p>
              <p className="text-2xl font-bold">
                {pipelineStages.find(s => s.status === 'ready')?.orders.length || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Wait Time</p>
              <p className="text-2xl font-bold">12m</p>
            </div>
            <Timer className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFlowPipelineFixed;