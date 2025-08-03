import { useState, useEffect } from 'react';
import {
  X, Merge, Check, AlertCircle, ShoppingBag, User,
  MapPin, Clock, DollarSign, ArrowRight, CheckCircle
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  waiter?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete: () => void;
  currentOrder?: Order;
}

const MergeOrdersModal: React.FC<Props> = ({ isOpen, onClose, onMergeComplete, currentOrder }) => {
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [primaryOrderId, setPrimaryOrderId] = useState<string>('');
  const [mergedCustomerName, setMergedCustomerName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentOrder) {
        setSelectedTable(currentOrder.tableNumber);
        setPrimaryOrderId(currentOrder._id);
        setSelectedOrders([currentOrder._id]);
        setMergedCustomerName(currentOrder.customerName);
        fetchTableOrders(currentOrder.tableNumber);
      }
    } else {
      // Reset state
      setTableOrders([]);
      setSelectedOrders([]);
      setSelectedTable('');
      setPrimaryOrderId('');
      setMergedCustomerName('');
    }
  }, [isOpen, currentOrder]);

  const fetchTableOrders = async (tableNumber: string) => {
    setFetching(true);
    try {
      const response = await ordersAPI.getOrders({
        tableNumber,
        status: ['pending', 'confirmed', 'preparing', 'ready', 'served']
      });
      
      // Filter out paid and cancelled orders
      const eligibleOrders = response.data.filter((order: Order) => 
        order.paymentStatus !== 'paid' && order.status !== 'cancelled'
      );
      
      setTableOrders(eligibleOrders);
      
      // If we have a current order, pre-select it
      if (currentOrder && eligibleOrders.some((o: Order) => o._id === currentOrder._id)) {
        setSelectedOrders([currentOrder._id]);
      }
    } catch (error) {
      toast.error('Failed to fetch table orders');
    } finally {
      setFetching(false);
    }
  };

  const handleTableChange = (tableNumber: string) => {
    setSelectedTable(tableNumber);
    setSelectedOrders([]);
    setPrimaryOrderId('');
    if (tableNumber) {
      fetchTableOrders(tableNumber);
    } else {
      setTableOrders([]);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      // Don't allow deselecting the primary order
      if (orderId === primaryOrderId) {
        toast.error('Cannot deselect the primary order');
        return;
      }
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const calculateMergedTotals = () => {
    const selectedOrderObjects = tableOrders.filter(order => 
      selectedOrders.includes(order._id)
    );
    
    const subtotal = selectedOrderObjects.reduce((sum, order) => sum + order.subtotal, 0);
    const tax = selectedOrderObjects.reduce((sum, order) => sum + order.tax, 0);
    const total = selectedOrderObjects.reduce((sum, order) => sum + order.total, 0);
    const itemCount = selectedOrderObjects.reduce((sum, order) => sum + order.items.length, 0);
    
    return { subtotal, tax, total, itemCount };
  };

  const handleMergeOrders = async () => {
    if (selectedOrders.length < 2) {
      toast.error('Please select at least 2 orders to merge');
      return;
    }
    
    if (!primaryOrderId) {
      toast.error('Please select a primary order');
      return;
    }
    
    if (!mergedCustomerName.trim()) {
      toast.error('Please enter a customer name for the merged order');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get all selected orders
      const ordersToMerge = tableOrders.filter(order => 
        selectedOrders.includes(order._id)
      );
      
      // Find the primary order
      const primaryOrder = ordersToMerge.find(order => order._id === primaryOrderId);
      if (!primaryOrder) {
        throw new Error('Primary order not found');
      }
      
      // Combine all items from selected orders
      const mergedItems = ordersToMerge.flatMap(order => 
        order.items.map(item => ({
          ...item,
          _id: undefined, // Remove _id for new order items
          fromOrder: order.orderNumber // Track source for reference
        }))
      );
      
      // Create the merged order data
      const mergedOrderData = {
        tableNumber: selectedTable,
        customerName: mergedCustomerName.trim(),
        customerPhone: primaryOrder.customerPhone,
        items: mergedItems,
        status: 'pending', // Reset to pending for kitchen
        paymentStatus: 'pending',
        mergedFrom: ordersToMerge.map(o => o.orderNumber),
        waiter: primaryOrder.waiter?._id,
        createdBy: 'merge-orders'
      };
      
      // Create the new merged order
      await ordersAPI.createOrder(mergedOrderData);
      
      // Cancel all original orders
      await Promise.all(
        ordersToMerge.map(order => 
          ordersAPI.cancelOrder(order._id, `Merged into new order`)
        )
      );
      
      toast.success(`Successfully merged ${selectedOrders.length} orders`);
      onMergeComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to merge orders');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { subtotal, tax, total, itemCount } = calculateMergedTotals();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Merge className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-semibold">Merge Orders</h2>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Table Selection */}
          {!currentOrder && (
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center space-x-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select Table:
                </label>
                <input
                  type="text"
                  value={selectedTable}
                  onChange={(e) => handleTableChange(e.target.value)}
                  placeholder="Enter table number"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={() => selectedTable && fetchTableOrders(selectedTable)}
                  disabled={!selectedTable || fetching}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {fetching ? 'Loading...' : 'Load Orders'}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-300px)] overflow-y-auto">
            {tableOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {selectedTable 
                    ? 'No eligible orders found for this table' 
                    : 'Enter a table number to load orders'}
                </p>
              </div>
            ) : (
              <>
                {/* Merged Order Details */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-3">Merged Order Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name for Merged Order
                      </label>
                      <input
                        type="text"
                        value={mergedCustomerName}
                        onChange={(e) => setMergedCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Order
                      </label>
                      <select
                        value={primaryOrderId}
                        onChange={(e) => {
                          setPrimaryOrderId(e.target.value);
                          if (!selectedOrders.includes(e.target.value)) {
                            setSelectedOrders([...selectedOrders, e.target.value]);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select primary order</option>
                        {selectedOrders.map(orderId => {
                          const order = tableOrders.find(o => o._id === orderId);
                          return order ? (
                            <option key={orderId} value={orderId}>
                              Order #{order.orderNumber} - {order.customerName}
                            </option>
                          ) : null;
                        })}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        The primary order's waiter will be assigned to the merged order
                      </p>
                    </div>
                  </div>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">
                    Select Orders to Merge ({selectedOrders.length} selected)
                  </h3>
                  
                  {tableOrders.map(order => (
                    <div
                      key={order._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedOrders.includes(order._id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleOrderSelection(order._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center ${
                            selectedOrders.includes(order._id)
                              ? 'bg-primary-600 border-primary-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedOrders.includes(order._id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                Order #{order.orderNumber}
                              </h4>
                              {primaryOrderId === order._id && (
                                <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                                  Primary
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                                order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            
                            <div className="mt-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {order.customerName}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(order.createdAt), 'h:mm a')}
                                </span>
                                {order.waiter && (
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    Waiter: {order.waiter.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                {order.items.length} items
                              </p>
                              <div className="mt-1 text-xs text-gray-500">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <span key={idx}>
                                    {item.quantity}x {item.name}
                                    {idx < Math.min(2, order.items.length - 1) && ', '}
                                  </span>
                                ))}
                                {order.items.length > 3 && ` +${order.items.length - 3} more`}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">AED {order.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{order.items.length} items</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Merge Summary */}
                {selectedOrders.length > 1 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">Merge Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Orders to Merge</p>
                        <p className="font-medium">{selectedOrders.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Items</p>
                        <p className="font-medium">{itemCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Subtotal</p>
                        <p className="font-medium">AED {subtotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Amount</p>
                        <p className="font-medium text-green-700">AED {total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                Original orders will be cancelled after merging
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeOrders}
                  disabled={loading || selectedOrders.length < 2 || !primaryOrderId || !mergedCustomerName.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Merge className="h-4 w-4 mr-2" />
                      Merge Orders
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeOrdersModal;