import { useState, useEffect, useRef } from 'react';
import {
  Clock, ChefHat, AlertTriangle, CheckCircle, Timer,
  Flame, Salad, IceCream, Coffee, Package,
  RefreshCw, Filter, Eye, Loader2, TrendingUp,
  AlertCircle, User, MapPin, MessageSquare, PackageX, X
} from 'lucide-react';
import { ordersAPI, stockAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useSocketConnection } from '../../hooks/useSocketConnection';
import RecipeDisplay from './RecipeDisplay';

interface OrderItem {
  _id: string;
  menuItem?: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  station?: 'grill' | 'salad' | 'dessert' | 'beverage' | 'main';
  preparedBy?: string;
  preparedAt?: string;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  allergens?: string[];
  dietary?: string[];
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  waiter?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  priority?: 'normal' | 'high' | 'urgent';
  estimatedTime?: number;
}

interface Station {
  id: string;
  name: string;
  icon: any;
  color: string;
  orders: Order[];
}

interface ChefMetrics {
  ordersCompleted: number;
  averagePrepTime: number;
  itemsPrepared: number;
  efficiency: number;
}

interface LowStockItem {
  menuItemId: string;
  menuItemName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  percentageRemaining: number;
  ingredientsLow: Array<{
    name: string;
    currentStock: number;
    unit: string;
  }>;
}

const KitchenDisplay = () => {
  const [stations, setStations] = useState<Station[]>([
    { id: 'grill', name: 'Grill Station', icon: Flame, color: 'orange', orders: [] },
    { id: 'salad', name: 'Salad Station', icon: Salad, color: 'green', orders: [] },
    { id: 'dessert', name: 'Dessert Station', icon: IceCream, color: 'pink', orders: [] },
    { id: 'beverage', name: 'Beverage Station', icon: Coffee, color: 'brown', orders: [] },
    { id: 'main', name: 'Main Kitchen', icon: ChefHat, color: 'blue', orders: [] },
  ]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [metrics, setMetrics] = useState<ChefMetrics>({
    ordersCompleted: 0,
    averagePrepTime: 0,
    itemsPrepared: 0,
    efficiency: 95
  });
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [showRecipeDisplay, setShowRecipeDisplay] = useState(false);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Socket connection for real-time updates
  const socket = useSocketConnection();

  useEffect(() => {
    fetchOrders();
    fetchLowStockItems();
    setupSocketListeners();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
      fetchLowStockItems();
    }, 30000);

    return () => {
      clearInterval(interval);
      // Clear all timers
      Object.values(timersRef.current).forEach(timer => clearInterval(timer));
    };
  }, []);

  useEffect(() => {
    distributeOrdersToStations();
  }, [allOrders]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('order-created', (data: any) => {
      fetchOrders();
      toast.success(`New order #${data.orderNumber} received!`, {
        icon: '🔔',
        duration: 5000
      });
    });

    socket.on('order-status-updated', (data: any) => {
      if (data.status === 'confirmed') {
        toast.success(`Order #${data.orderNumber} confirmed and ready for kitchen!`, {
          icon: '👨‍🍳',
          duration: 4000
        });
      }
      fetchOrders();
    });

    socket.on('order-cancelled', (data: any) => {
      toast.error(`Order #${data.orderNumber} has been cancelled`, {
        icon: '❌',
        duration: 4000
      });
      fetchOrders();
    });
  };

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getOrders({
        status: ['confirmed', 'preparing']
      });
      const orders = response.data || [];
      
      // Add priority and estimated time to orders
      const ordersWithMetadata = orders.map((order: Order) => ({
        ...order,
        priority: calculatePriority(order),
        estimatedTime: calculateEstimatedTime(order)
      }));
      
      setAllOrders(ordersWithMetadata);
      calculateMetrics(ordersWithMetadata);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const response = await stockAPI.getLowStockItems(20); // Items below 20% stock
      const lowStock = response.data || [];
      
      // Process low stock items to include ingredient details
      const processedItems: LowStockItem[] = lowStock.map((item: any) => ({
        menuItemId: item.menuItem?._id || item._id,
        menuItemName: item.menuItem?.name || item.name,
        currentStock: item.currentStock,
        minStock: item.minStock,
        unit: item.unit,
        percentageRemaining: (item.currentStock / item.minStock) * 100,
        ingredientsLow: item.ingredients?.filter((ing: any) => 
          ing.currentStock < ing.minStock
        ).map((ing: any) => ({
          name: ing.name,
          currentStock: ing.currentStock,
          unit: ing.unit
        })) || []
      }));
      
      setLowStockItems(processedItems);
      
      // Show alert if critical items (below 10%)
      const criticalItems = processedItems.filter((item: LowStockItem) => item.percentageRemaining < 10);
      if (criticalItems.length > 0 && !showLowStockAlert) {
        setShowLowStockAlert(true);
        toast.error(`${criticalItems.length} items critically low on stock!`, {
          duration: 5000,
          icon: '⚠️'
        });
      }
    } catch (error) {
      console.error('Failed to fetch low stock items:', error);
    }
  };

  const calculatePriority = (order: Order): 'normal' | 'high' | 'urgent' => {
    const minutesSinceCreated = differenceInMinutes(new Date(), new Date(order.createdAt));
    
    if (minutesSinceCreated > 20) return 'urgent';
    if (minutesSinceCreated > 10) return 'high';
    return 'normal';
  };

  const calculateEstimatedTime = (order: Order): number => {
    // Base time per item type (in minutes)
    const prepTimes: Record<string, number> = {
      grill: 15,
      salad: 5,
      dessert: 10,
      beverage: 3,
      main: 20
    };

    let totalTime = 0;
    order.items.forEach(item => {
      if (item.status !== 'ready' && item.status !== 'served') {
        totalTime += prepTimes[item.station || 'main'] || 10;
      }
    });

    return totalTime;
  };

  const calculateMetrics = (orders: Order[]) => {
    // This would normally come from backend analytics
    setMetrics({
      ordersCompleted: 127,
      averagePrepTime: 12.5,
      itemsPrepared: 342,
      efficiency: 95
    });
  };

  const distributeOrdersToStations = () => {
    const newStations: Station[] = stations.map(station => ({
      ...station,
      orders: [] as Order[]
    }));

    // Group orders by station based on items
    allOrders.forEach(order => {
      const ordersByStation: Record<string, Order> = {};

      order.items.forEach(item => {
        if (item.status === 'ready' || item.status === 'served') return;
        
        const itemStation = item.station || 'main';
        if (!ordersByStation[itemStation]) {
          ordersByStation[itemStation] = {
            ...order,
            items: []
          };
        }
        ordersByStation[itemStation].items.push(item);
      });

      // Add order to relevant stations
      Object.entries(ordersByStation).forEach(([stationId, stationOrder]) => {
        const station = newStations.find(s => s.id === stationId);
        if (station && stationOrder.items.length > 0) {
          station.orders.push(stationOrder);
        }
      });
    });

    setStations(newStations);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordering within the same station
      const station = stations.find(s => s.id === source.droppableId);
      if (!station) return;

      const newOrders = Array.from(station.orders);
      const [reorderedItem] = newOrders.splice(source.index, 1);
      newOrders.splice(destination.index, 0, reorderedItem);

      setStations(stations.map(s => 
        s.id === station.id ? { ...s, orders: newOrders } : s
      ));
    }
  };

  const checkItemStock = (menuItemId?: string) => {
    if (!menuItemId) return null;
    return lowStockItems.find(item => item.menuItemId === menuItemId);
  };

  const handleItemStatusUpdate = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      // Check stock before marking as preparing
      if (newStatus === 'preparing') {
        const order = allOrders.find(o => o._id === orderId);
        const item = order?.items.find(i => i._id === itemId);
        const stockStatus = checkItemStock(item?.menuItem);
        
        if (stockStatus && stockStatus.percentageRemaining < 10) {
          const confirm = window.confirm(
            `Warning: ${stockStatus.menuItemName} is critically low on stock (${stockStatus.percentageRemaining.toFixed(0)}% remaining). Continue anyway?`
          );
          if (!confirm) return;
        }
      }

      await ordersAPI.updateItemStatus(orderId, itemId, newStatus);
      
      // Update local state
      setAllOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            return {
              ...order,
              items: order.items.map(item => 
                item._id === itemId ? { ...item, status: newStatus as any } : item
              )
            };
          }
          return order;
        })
      );

      toast.success(`Item marked as ${newStatus}`);
      
      // Refresh stock levels after preparing
      if (newStatus === 'preparing') {
        setTimeout(fetchLowStockItems, 2000);
      }
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  const handleMarkAllReady = async (order: Order) => {
    try {
      // Mark all pending/preparing items as ready
      const updates = order.items
        .filter(item => item.status !== 'ready' && item.status !== 'served')
        .map(item => handleItemStatusUpdate(order._id, item._id, 'ready'));

      await Promise.all(updates);
      
      // Update order status if all items are ready
      const allReady = order.items.every(item => 
        item.status === 'ready' || item.status === 'served'
      );
      
      if (allReady) {
        await ordersAPI.updateOrderStatus(order._id, 'ready');
        toast.success(`Order #${order.orderNumber} is ready for service!`, {
          icon: '✅',
          duration: 5000
        });
      }
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getStationColor = (stationId: string) => {
    const colors: Record<string, string> = {
      grill: 'border-orange-500 bg-orange-50',
      salad: 'border-green-500 bg-green-50',
      dessert: 'border-pink-500 bg-pink-50',
      beverage: 'border-yellow-600 bg-yellow-50',
      main: 'border-blue-500 bg-blue-50'
    };
    return colors[stationId] || 'border-gray-500 bg-gray-50';
  };

  const formatPrepTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const OrderTimer = ({ order }: { order: Order }) => {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        const minutes = differenceInMinutes(new Date(), new Date(order.createdAt));
        setElapsedTime(minutes);
      }, 1000);

      timersRef.current[order._id] = timer;

      return () => {
        clearInterval(timer);
        delete timersRef.current[order._id];
      };
    }, [order]);

    return (
      <div className={`flex items-center text-sm ${
        elapsedTime > 20 ? 'text-red-600' : elapsedTime > 10 ? 'text-orange-600' : 'text-gray-600'
      }`}>
        <Timer className="h-4 w-4 mr-1" />
        {formatPrepTime(elapsedTime)}
      </div>
    );
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
      {/* Header with Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.ordersCompleted}</p>
            <p className="text-sm text-gray-600">Orders Completed Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.averagePrepTime}m</p>
            <p className="text-sm text-gray-600">Avg Prep Time</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.itemsPrepared}</p>
            <p className="text-sm text-gray-600">Items Prepared</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{metrics.efficiency}%</p>
            <p className="text-sm text-gray-600">Kitchen Efficiency</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <PackageX className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Low Stock Alert</h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-2">{lowStockItems.length} items running low:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {lowStockItems.slice(0, 8).map(item => (
                    <div key={item.menuItemId} className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        item.percentageRemaining < 10 ? 'bg-red-500' :
                        item.percentageRemaining < 20 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`} />
                      <span className="truncate">
                        {item.menuItemName} ({Math.round(item.percentageRemaining)}%)
                      </span>
                    </div>
                  ))}
                </div>
                {lowStockItems.length > 8 && (
                  <p className="mt-2 text-xs">+{lowStockItems.length - 8} more items</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowLowStockAlert(!showLowStockAlert)}
              className="ml-3 text-red-600 hover:text-red-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="all">All Stations</option>
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showUrgentOnly}
                onChange={(e) => setShowUrgentOnly(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Urgent Orders Only</span>
            </label>
          </div>

          <button
            onClick={() => setShowRecipeDisplay(!showRecipeDisplay)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChefHat className="h-4 w-4 mr-2" />
            {showRecipeDisplay ? 'Hide' : 'Show'} Recipes
          </button>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Station Boards */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stations
            .filter(station => selectedStation === 'all' || station.id === selectedStation)
            .map(station => {
              const Icon = station.icon;
              const filteredOrders = showUrgentOnly 
                ? station.orders.filter(o => o.priority === 'urgent')
                : station.orders;

              return (
                <div key={station.id} className="bg-white rounded-lg shadow">
                  {/* Station Header */}
                  <div className={`p-4 border-b ${getStationColor(station.id)} border-t-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className={`h-5 w-5 mr-2 text-${station.color}-600`} />
                        <h3 className="font-medium text-gray-900">{station.name}</h3>
                      </div>
                      <span className="text-sm text-gray-600">
                        {filteredOrders.length} orders
                      </span>
                    </div>
                  </div>

                  {/* Orders List */}
                  <Droppable droppableId={station.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 min-h-[400px] ${
                          snapshot.isDraggingOver ? 'bg-gray-50' : ''
                        }`}
                      >
                        {filteredOrders.map((order, index) => (
                          <Draggable
                            key={order._id}
                            draggableId={order._id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 ${
                                  snapshot.isDragging ? 'opacity-50' : ''
                                }`}
                              >
                                <div className={`border rounded-lg p-3 ${
                                  order.priority === 'urgent' ? 'border-red-400 bg-red-50' :
                                  order.priority === 'high' ? 'border-orange-400 bg-orange-50' :
                                  'border-gray-200 bg-white'
                                }`}>
                                  {/* Order Header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                      <span className="font-medium text-sm">
                                        #{order.orderNumber}
                                      </span>
                                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                        getPriorityColor(order.priority || 'normal')
                                      }`}>
                                        {order.priority}
                                      </span>
                                    </div>
                                    <OrderTimer order={order} />
                                  </div>

                                  {/* Table Info */}
                                  <div className="flex items-center text-xs text-gray-600 mb-2">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Table {order.tableNumber}
                                    <span className="mx-1">•</span>
                                    <User className="h-3 w-3 mr-1" />
                                    {order.waiter?.name || 'Unassigned'}
                                  </div>

                                  {/* Items */}
                                  <div className="space-y-2">
                                    {order.items.map(item => (
                                      <div
                                        key={item._id}
                                        className={`p-2 rounded ${
                                          item.status === 'ready' ? 'bg-green-100' :
                                          item.status === 'preparing' ? 'bg-yellow-100' :
                                          'bg-gray-100'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                              <p className="text-sm font-medium">
                                                {item.quantity}x {item.name}
                                              </p>
                                              {(() => {
                                                const stockStatus = checkItemStock(item.menuItem);
                                                if (stockStatus && stockStatus.percentageRemaining < 20) {
                                                  return (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                      stockStatus.percentageRemaining < 10 
                                                        ? 'bg-red-100 text-red-700' 
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                      <PackageX className="h-3 w-3 mr-0.5" />
                                                      {Math.round(stockStatus.percentageRemaining)}%
                                                    </span>
                                                  );
                                                }
                                                return null;
                                              })()}
                                            </div>
                                            {item.modifiers && item.modifiers.length > 0 && (
                                              <p className="text-xs text-gray-600">
                                                {item.modifiers.map(m => m.name).join(', ')}
                                              </p>
                                            )}
                                            {item.specialRequests && (
                                              <p className="text-xs text-orange-600 flex items-center mt-1">
                                                <MessageSquare className="h-3 w-3 mr-1" />
                                                {item.specialRequests}
                                              </p>
                                            )}
                                            {item.allergens && item.allergens.length > 0 && (
                                              <p className="text-xs text-red-600 flex items-center mt-1">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Allergens: {item.allergens.join(', ')}
                                              </p>
                                            )}
                                          </div>
                                          <div className="ml-2">
                                            {item.status !== 'ready' && item.status !== 'served' && (
                                              <button
                                                onClick={() => handleItemStatusUpdate(
                                                  order._id,
                                                  item._id,
                                                  item.status === 'pending' ? 'preparing' : 'ready'
                                                )}
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                  item.status === 'pending'
                                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                }`}
                                              >
                                                {item.status === 'pending' ? 'Start' : 'Ready'}
                                              </button>
                                            )}
                                            {item.status === 'ready' && (
                                              <CheckCircle className="h-5 w-5 text-green-600" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <button
                                      onClick={() => handleMarkAllReady(order)}
                                      className="w-full px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                                    >
                                      Mark All Ready
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
        </div>
      </DragDropContext>

      {/* Recipe Display Modal */}
      {showRecipeDisplay && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowRecipeDisplay(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Recipe Reference</h2>
                  <button
                    onClick={() => setShowRecipeDisplay(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                  <RecipeDisplay />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;