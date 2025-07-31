import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

const Orders = () => {
  const [filter, setFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage customer orders in real-time
        </p>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Order Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Real-time order tracking and management coming soon.
        </p>
      </div>
    </div>
  );
};

export default Orders;