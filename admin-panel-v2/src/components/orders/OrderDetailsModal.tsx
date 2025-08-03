import { useState } from 'react';
import {
  X, Clock, User, MapPin, Phone, Mail, ShoppingBag,
  ChefHat, DollarSign, Calendar, AlertCircle, CheckCircle,
  Package, MessageSquare, TrendingUp
} from 'lucide-react';
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
  notes?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  userRole: string;
}

const OrderDetailsModal: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
  userRole
}) => {
  const [selectedItemStatus, setSelectedItemStatus] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const getItemStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      served: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextItemStatus = (currentStatus: string) => {
    const transitions: Record<string, string> = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'served'
    };
    return transitions[currentStatus] || null;
  };

  const handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    // In production, this would call an API to update individual item status
    console.log('Update item status:', itemId, newStatus);
    // You can implement the API call here
  };

  const calculatePrepTime = () => {
    if (order.status === 'pending' || order.status === 'confirmed') {
      return 'Not started';
    }
    const created = new Date(order.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);
    return `${diffMinutes} minutes`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">
                  Order #{order.orderNumber}
                </h3>
                <p className="mt-1 text-sm text-primary-200">
                  {format(new Date(order.createdAt), 'MMM dd, yyyy h:mm a')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-primary-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Order Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer & Table Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{order.customerName}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Table:</span>
                      <span className="ml-2 font-medium">{order.tableNumber}</span>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 font-medium">{order.customerPhone}</span>
                      </div>
                    )}
                    {order.customerEmail && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-medium">{order.customerEmail}</span>
                      </div>
                    )}
                  </div>
                  {order.waiter && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center text-sm">
                        <ChefHat className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Assigned Waiter:</span>
                        <span className="ml-2 font-medium">{order.waiter.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          {userRole === 'chef' && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {order.items.map((item) => (
                          <tr key={item._id}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {item.modifiers.map(m => m.name).join(', ')}
                                  </p>
                                )}
                                {item.specialRequests && (
                                  <p className="text-xs text-orange-600 flex items-center mt-1">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    {item.specialRequests}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900">
                              AED {(item.price * item.quantity).toFixed(2)}
                            </td>
                            {userRole === 'chef' && item.status !== 'served' && item.status !== 'cancelled' && (
                              <td className="px-4 py-3 text-center">
                                {getNextItemStatus(item.status) && (
                                  <button
                                    onClick={() => handleItemStatusUpdate(item._id, getNextItemStatus(item.status)!)}
                                    className="text-xs text-primary-600 hover:text-primary-900"
                                  >
                                    Mark as {getNextItemStatus(item.status)}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {(order.notes || order.cancelReason) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                    {order.notes && (
                      <p className="text-sm text-gray-600">{order.notes}</p>
                    )}
                    {order.cancelReason && (
                      <div className="mt-2 p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>Cancellation Reason:</strong> {order.cancelReason}
                        </p>
                        {order.cancelledBy && (
                          <p className="text-xs text-red-600 mt-1">
                            Cancelled by {order.cancelledBy} at {format(new Date(order.cancelledAt!), 'MMM dd, h:mm a')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Status & Payment */}
              <div className="space-y-6">
                {/* Order Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Order Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        order.status === 'paid' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Prep Time:</span>
                      <span className="text-sm font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {calculatePrepTime()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">AED {order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.discount && order.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">-AED {order.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">AED {order.tax.toFixed(2)}</span>
                    </div>
                    {order.tip && order.tip > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-medium text-green-600">+AED {order.tip.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-base font-medium text-gray-900">Total:</span>
                        <span className="text-base font-semibold text-gray-900">AED {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    {order.paymentStatus === 'paid' && (
                      <div className="pt-2">
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Paid via {order.paymentMethod}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                {order.status !== 'paid' && order.status !== 'cancelled' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => onStatusUpdate(order._id, 'confirmed')}
                          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                          Confirm Order
                        </button>
                      )}
                      {order.status === 'confirmed' && userRole === 'chef' && (
                        <button
                          onClick={() => onStatusUpdate(order._id, 'preparing')}
                          className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && userRole === 'chef' && (
                        <button
                          onClick={() => onStatusUpdate(order._id, 'ready')}
                          className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                        >
                          Mark as Ready
                        </button>
                      )}
                      {order.status === 'ready' && userRole === 'waiter' && (
                        <button
                          onClick={() => onStatusUpdate(order._id, 'served')}
                          className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                        >
                          Mark as Served
                        </button>
                      )}
                      <button
                        onClick={() => onStatusUpdate(order._id, 'cancelled')}
                        className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;