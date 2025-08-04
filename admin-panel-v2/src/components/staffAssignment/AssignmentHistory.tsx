import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Download, 
  Filter, 
  Calendar,
  User,
  Clock,
  TrendingUp,
  Search,
  ChevronDown,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { userAPI } from '../../services/userAPI';
import { AssignmentHistory as AssignmentHistoryType } from '../../types/staffAssignment';
import { User as UserType } from '../../types/user';
import toast from 'react-hot-toast';

const AssignmentHistory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AssignmentHistoryType[]>([]);
  const [waiters, setWaiters] = useState<UserType[]>([]);
  const [filters, setFilters] = useState({
    waiterId: '',
    tableNumber: '',
    dateRange: 'week' as 'today' | 'week' | 'month' | 'custom',
    startDate: subDays(new Date(), 7),
    endDate: new Date()
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [stats, setStats] = useState({
    totalAssignments: 0,
    averageDuration: 0,
    totalRevenue: 0,
    topWaiter: null as { name: string; count: number } | null
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Calculate date range
      let startDate = filters.startDate;
      let endDate = filters.endDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = startOfDay(new Date());
          endDate = endOfDay(new Date());
          break;
        case 'week':
          startDate = subDays(new Date(), 7);
          endDate = new Date();
          break;
        case 'month':
          startDate = subDays(new Date(), 30);
          endDate = new Date();
          break;
      }

      // Load history and waiters
      const [historyData, waitersData] = await Promise.all([
        staffAssignmentAPI.getAssignmentHistory({
          waiterId: filters.waiterId || undefined,
          tableNumber: filters.tableNumber || undefined,
          dateRange: { start: startDate, end: endDate }
        }),
        userAPI.getUsers({ role: 'waiter' })
      ]);

      setHistory(historyData);
      setWaiters(waitersData.filter(u => u.isActive));

      // Calculate stats
      calculateStats(historyData);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load assignment history');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate statistics
  const calculateStats = (data: AssignmentHistoryType[]) => {
    if (data.length === 0) {
      setStats({
        totalAssignments: 0,
        averageDuration: 0,
        totalRevenue: 0,
        topWaiter: null
      });
      return;
    }

    // Total assignments
    const totalAssignments = data.length;

    // Average duration
    const durations = data.filter(h => h.duration).map(h => h.duration!);
    const averageDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Total revenue
    const totalRevenue = data.reduce((sum, h) => sum + (h.revenue || 0), 0);

    // Top waiter
    const waiterCounts = data.reduce((acc, h) => {
      acc[h.waiterName] = (acc[h.waiterName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWaiterEntry = Object.entries(waiterCounts)
      .sort(([, a], [, b]) => b - a)[0];

    const topWaiter = topWaiterEntry 
      ? { name: topWaiterEntry[0], count: topWaiterEntry[1] }
      : null;

    setStats({
      totalAssignments,
      averageDuration,
      totalRevenue,
      topWaiter
    });
  };

  // Export history
  const handleExport = async () => {
    try {
      const blob = await staffAssignmentAPI.exportHistory(exportFormat, {
        waiterId: filters.waiterId,
        tableNumber: filters.tableNumber,
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString()
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignment-history-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`History exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export history');
    }
  };

  // Filter history based on search
  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.tableNumber.toLowerCase().includes(query) ||
      item.waiterName.toLowerCase().includes(query) ||
      item.assignedByName.toLowerCase().includes(query)
    );
  });

  // Get reason badge color
  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'shift_start': return 'bg-green-100 text-green-800';
      case 'rotation': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'rule_based': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats.totalAssignments.toLocaleString()}
              </p>
            </div>
            <History className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatDuration(stats.averageDuration)}
              </p>
            </div>
            <Clock className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Top Waiter</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {stats.topWaiter?.name || '-'}
              </p>
              {stats.topWaiter && (
                <p className="text-sm text-gray-500">{stats.topWaiter.count} assignments</p>
              )}
            </div>
            <User className="h-12 w-12 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Quick Filters */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>

            <select
              value={filters.waiterId}
              onChange={(e) => setFilters({ ...filters, waiterId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Waiters</option>
              {waiters.map(waiter => (
                <option key={waiter._id} value={waiter._id}>
                  {waiter.name}
                </option>
              ))}
            </select>

            {/* Advanced Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`ml-2 h-4 w-4 transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Export */}
          <div className="flex items-center space-x-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  value={filters.tableNumber}
                  onChange={(e) => setFilters({ ...filters, tableNumber: e.target.value })}
                  placeholder="e.g., T1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {filters.dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={format(filters.startDate, 'yyyy-MM-dd')}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        startDate: new Date(e.target.value) 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={format(filters.endDate, 'yyyy-MM-dd')}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        endDate: new Date(e.target.value) 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredHistory.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waiter
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {format(new Date(item.assignedAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-gray-500">
                        {format(new Date(item.assignedAt), 'HH:mm')}
                        {item.endedAt && ` - ${format(new Date(item.endedAt), 'HH:mm')}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Table {item.tableNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-600">
                          {item.waiterName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {item.waiterName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.assignedByName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(item.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.ordersServed || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(item.revenue || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${getReasonBadgeColor(item.reason)}
                    `}>
                      {item.reason.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || filters.waiterId || filters.tableNumber
                ? 'Try adjusting your filters'
                : 'Assignment history will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentHistory;