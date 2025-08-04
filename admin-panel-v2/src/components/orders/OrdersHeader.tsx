import React from 'react';
import {
  Search, Filter, RefreshCw, Plus, Calendar, ArrowUpDown
} from 'lucide-react';

interface OrdersHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  sortBy: 'newest' | 'oldest' | 'amount';
  setSortBy: (sort: 'newest' | 'oldest' | 'amount') => void;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateOrder: () => void;
}

export const OrdersHeader: React.FC<OrdersHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  sortBy,
  setSortBy,
  refreshing,
  onRefresh,
  onCreateOrder
}) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateOrder}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Order
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, table, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'amount')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount">Amount (High to Low)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};