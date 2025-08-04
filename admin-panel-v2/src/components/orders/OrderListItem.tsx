import React from 'react';
import {
  Clock, CheckCircle, XCircle, AlertCircle, User, MapPin,
  DollarSign, Eye, Edit, CreditCard, Activity
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
}

interface OrderListItemProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onPayment: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export const OrderListItem: React.FC<OrderListItemProps> = ({
  order,
  onView,
  onEdit,
  onPayment,
  onUpdateStatus
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'served': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'confirmed': return AlertCircle;
      case 'preparing': return Activity;
      case 'ready': return CheckCircle;
      case 'served': return CheckCircle;
      case 'paid': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const StatusIcon = getStatusIcon(order.status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleQuickStatusUpdate = () => {
    const statusFlow = {
      'pending': 'confirmed',
      'confirmed': 'preparing',
      'preparing': 'ready',
      'ready': 'served',
      'served': 'paid'
    };

    const nextStatus = statusFlow[order.status as keyof typeof statusFlow];
    if (nextStatus && order.status !== 'paid' && order.status !== 'cancelled') {
      onUpdateStatus(order._id, nextStatus);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">#{order.orderNumber}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
              <StatusIcon className="h-4 w-4" />
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            {order.paymentStatus === 'paid' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Paid
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Table {order.tableNumber}
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {order.customerName}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(order.createdAt), 'HH:mm')}
            </div>
            {order.waiter && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {order.waiter.name}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatCurrency(order.total)}</p>
          <p className="text-sm text-gray-600">{order.items.length} items</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {order.items.slice(0, 3).map((item, index) => (
              <span key={index} className="text-sm text-gray-600">
                {item.quantity}x {item.name}
                {index < Math.min(2, order.items.length - 1) && ','}
              </span>
            ))}
            {order.items.length > 3 && (
              <span className="text-sm text-gray-500">
                +{order.items.length - 3} more
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {order.status !== 'paid' && order.status !== 'cancelled' && (
              <button
                onClick={handleQuickStatusUpdate}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Next Status
              </button>
            )}
            {order.paymentStatus === 'pending' && order.status === 'served' && (
              <button
                onClick={() => onPayment(order)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Payment
              </button>
            )}
            <button
              onClick={() => onEdit(order)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onView(order)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};