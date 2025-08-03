import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, DollarSign, Users, ShoppingCart,
  TrendingUp, Clock, Zap, AlertCircle,
  ChefHat, Coffee, Utensils, Timer,
  ArrowUp, ArrowDown, Minus, RefreshCw
} from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  label: string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  sparklineData?: number[];
}

interface LiveOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  amount: number;
  itemCount: number;
  status: string;
  timestamp: Date;
}

interface PerformanceMetrics {
  revenue: MetricData;
  orders: MetricData;
  customers: MetricData;
  avgOrderValue: MetricData;
  tableOccupancy: MetricData;
  avgPrepTime: MetricData;
  staffEfficiency: MetricData;
  customerSatisfaction: MetricData;
}

const RealTimePerformance: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    revenue: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Today\'s Revenue',
      unit: 'AED',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-green-500',
      sparklineData: []
    },
    orders: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Total Orders',
      unit: '',
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'text-blue-500',
      sparklineData: []
    },
    customers: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Active Customers',
      unit: '',
      icon: <Users className="w-6 h-6" />,
      color: 'text-purple-500',
      sparklineData: []
    },
    avgOrderValue: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Avg Order Value',
      unit: 'AED',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-indigo-500',
      sparklineData: []
    },
    tableOccupancy: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Table Occupancy',
      unit: '%',
      icon: <Utensils className="w-6 h-6" />,
      color: 'text-orange-500',
      sparklineData: []
    },
    avgPrepTime: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Avg Prep Time',
      unit: 'min',
      icon: <Timer className="w-6 h-6" />,
      color: 'text-red-500',
      sparklineData: []
    },
    staffEfficiency: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Staff Efficiency',
      unit: '%',
      icon: <ChefHat className="w-6 h-6" />,
      color: 'text-cyan-500',
      sparklineData: []
    },
    customerSatisfaction: {
      value: 0,
      change: 0,
      trend: 'neutral',
      label: 'Customer Satisfaction',
      unit: '%',
      icon: <Coffee className="w-6 h-6" />,
      color: 'text-pink-500',
      sparklineData: []
    }
  });

  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    const restaurant = JSON.parse(localStorage.getItem('restaurant') || '{}');
    
    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      query: { tenantId: restaurant.tenantId }
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to real-time updates');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Disconnected from real-time updates');
    });

    // Real-time metric updates
    socketRef.current.on('metrics:update', (data: any) => {
      updateMetrics(data);
      setLastUpdate(new Date());
    });

    // Live order feed
    socketRef.current.on('order:new', (order: LiveOrder) => {
      setLiveOrders(prev => [order, ...prev.slice(0, 9)]);
      // Update relevant metrics
      setMetrics(prev => ({
        ...prev,
        orders: {
          ...prev.orders,
          value: prev.orders.value + 1,
          trend: 'up'
        },
        revenue: {
          ...prev.revenue,
          value: prev.revenue.value + order.amount,
          trend: 'up'
        }
      }));
    });

    // Fetch initial data
    fetchInitialMetrics();

    // Set up periodic refresh
    const interval = setInterval(fetchInitialMetrics, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchInitialMetrics = async () => {
    try {
      const response = await analyticsAPI.getRealTimeMetrics();
      updateMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const updateMetrics = (data: any) => {
    setMetrics({
      revenue: {
        ...metrics.revenue,
        value: data.revenue || 0,
        change: data.revenueChange || 0,
        trend: data.revenueChange > 0 ? 'up' : data.revenueChange < 0 ? 'down' : 'neutral',
        sparklineData: data.revenueSparkline || []
      },
      orders: {
        ...metrics.orders,
        value: data.orders || 0,
        change: data.ordersChange || 0,
        trend: data.ordersChange > 0 ? 'up' : data.ordersChange < 0 ? 'down' : 'neutral',
        sparklineData: data.ordersSparkline || []
      },
      customers: {
        ...metrics.customers,
        value: data.activeCustomers || 0,
        change: data.customersChange || 0,
        trend: data.customersChange > 0 ? 'up' : data.customersChange < 0 ? 'down' : 'neutral',
        sparklineData: data.customersSparkline || []
      },
      avgOrderValue: {
        ...metrics.avgOrderValue,
        value: data.avgOrderValue || 0,
        change: data.avgOrderValueChange || 0,
        trend: data.avgOrderValueChange > 0 ? 'up' : data.avgOrderValueChange < 0 ? 'down' : 'neutral',
        sparklineData: data.avgOrderValueSparkline || []
      },
      tableOccupancy: {
        ...metrics.tableOccupancy,
        value: data.tableOccupancy || 0,
        change: data.tableOccupancyChange || 0,
        trend: data.tableOccupancyChange > 0 ? 'up' : data.tableOccupancyChange < 0 ? 'down' : 'neutral',
        sparklineData: data.tableOccupancySparkline || []
      },
      avgPrepTime: {
        ...metrics.avgPrepTime,
        value: data.avgPrepTime || 0,
        change: data.avgPrepTimeChange || 0,
        trend: data.avgPrepTimeChange < 0 ? 'up' : data.avgPrepTimeChange > 0 ? 'down' : 'neutral', // Lower is better
        sparklineData: data.avgPrepTimeSparkline || []
      },
      staffEfficiency: {
        ...metrics.staffEfficiency,
        value: data.staffEfficiency || 0,
        change: data.staffEfficiencyChange || 0,
        trend: data.staffEfficiencyChange > 0 ? 'up' : data.staffEfficiencyChange < 0 ? 'down' : 'neutral',
        sparklineData: data.staffEfficiencySparkline || []
      },
      customerSatisfaction: {
        ...metrics.customerSatisfaction,
        value: data.customerSatisfaction || 0,
        change: data.customerSatisfactionChange || 0,
        trend: data.customerSatisfactionChange > 0 ? 'up' : data.customerSatisfactionChange < 0 ? 'down' : 'neutral',
        sparklineData: data.customerSatisfactionSparkline || []
      }
    });
  };

  const MetricCard: React.FC<{ metric: MetricData; metricKey: string }> = ({ metric, metricKey }) => {
    const getTrendIcon = () => {
      if (metric.trend === 'up') return <ArrowUp className="w-4 h-4" />;
      if (metric.trend === 'down') return <ArrowDown className="w-4 h-4" />;
      return <Minus className="w-4 h-4" />;
    };

    const getTrendColor = () => {
      if (metricKey === 'avgPrepTime') {
        // For prep time, down is good
        if (metric.trend === 'down') return 'text-green-500';
        if (metric.trend === 'up') return 'text-red-500';
      } else {
        if (metric.trend === 'up') return 'text-green-500';
        if (metric.trend === 'down') return 'text-red-500';
      }
      return 'text-gray-500';
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${metric.color} opacity-5 rounded-full -mr-16 -mt-16`} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`${metric.color}`}>{metric.icon}</div>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(metric.change)}%</span>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="text-2xl font-bold text-gray-900">
              {metric.unit && metric.unit !== '%' && <span className="text-lg font-normal text-gray-500">{metric.unit} </span>}
              <CountUp
                start={0}
                end={metric.value}
                duration={1}
                decimals={metric.unit === 'AED' ? 2 : 0}
                separator=","
              />
              {metric.unit === '%' && <span className="text-lg font-normal text-gray-500">%</span>}
            </div>
            <div className="text-sm text-gray-500">{metric.label}</div>
          </div>

          {/* Mini sparkline */}
          {metric.sparklineData && metric.sparklineData.length > 0 && (
            <div className="h-8 flex items-end gap-0.5 mt-2">
              {metric.sparklineData.slice(-20).map((value, index) => {
                const height = (value / Math.max(...(metric.sparklineData || []))) * 100;
                return (
                  <div
                    key={index}
                    className={`flex-1 ${metric.color} opacity-20 hover:opacity-40 transition-opacity rounded-t`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-Time Performance</h2>
          <p className="text-gray-500">Live metrics updated in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchInitialMetrics}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(metrics).map(([key, metric]) => (
          <MetricCard key={key} metric={metric} metricKey={key} />
        ))}
      </div>

      {/* Live Order Feed */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Order Feed</h3>
          <Activity className="w-5 h-5 text-gray-400 animate-pulse" />
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {liveOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium text-gray-900">
                      Order #{order.orderNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      Table {order.tableNumber} • {order.itemCount} items
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    AED {order.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {liveOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No recent orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Alerts</h3>
        </div>
        
        <div className="space-y-2">
          {metrics.tableOccupancy.value > 90 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
            >
              <Zap className="w-5 h-5 text-orange-500" />
              <div>
                <div className="font-medium text-orange-900">High Table Occupancy</div>
                <div className="text-sm text-orange-700">
                  Currently at {metrics.tableOccupancy.value}% - Consider opening additional sections
                </div>
              </div>
            </motion.div>
          )}
          
          {metrics.avgPrepTime.value > 25 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <Timer className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-red-900">Elevated Prep Times</div>
                <div className="text-sm text-red-700">
                  Average prep time is {metrics.avgPrepTime.value} minutes - Check kitchen capacity
                </div>
              </div>
            </motion.div>
          )}
          
          {metrics.staffEfficiency.value < 70 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
            >
              <ChefHat className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900">Low Staff Efficiency</div>
                <div className="text-sm text-yellow-700">
                  Efficiency at {metrics.staffEfficiency.value}% - Consider additional training or support
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimePerformance;