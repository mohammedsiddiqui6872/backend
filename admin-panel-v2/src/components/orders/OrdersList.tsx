import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { OrderListItem } from './OrderListItem';
import { VirtualizedList } from '../common/VirtualizedList';

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

interface OrdersListProps {
  orders: Order[];
  searchQuery: string;
  filterStatus: string;
  loading: boolean;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onPayment: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  searchQuery,
  filterStatus,
  loading,
  onViewOrder,
  onEditOrder,
  onPayment,
  onUpdateStatus
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchQuery || filterStatus !== 'all' 
            ? 'Try adjusting your filters'
            : 'Orders will appear here when customers place them'}
        </p>
      </div>
    );
  }

  // For large lists, use virtualization
  if (orders.length > 50) {
    return (
      <div className="bg-white rounded-lg shadow">
        <VirtualizedList
          items={orders}
          itemHeight={160} // Approximate height of OrderListItem
          containerClassName="h-[600px]"
          renderItem={(order) => (
            <div className="p-2">
              <OrderListItem
                order={order}
                onView={onViewOrder}
                onEdit={onEditOrder}
                onPayment={onPayment}
                onUpdateStatus={onUpdateStatus}
              />
            </div>
          )}
          getItemKey={(order) => order._id}
          overscan={5}
        />
      </div>
    );
  }

  // For smaller lists, render normally
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderListItem
          key={order._id}
          order={order}
          onView={onViewOrder}
          onEdit={onEditOrder}
          onPayment={onPayment}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  );
};