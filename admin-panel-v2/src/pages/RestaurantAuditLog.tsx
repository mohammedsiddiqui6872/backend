import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Users, 
  ShoppingCart, 
  Grid3X3,
  MenuSquare,
  Package,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

// Import restaurant-specific types
import { 
  RestaurantAuditLog, 
  RestaurantAuditLogFilters,
  RestaurantAuditStats,
  RestaurantAction,
  RestaurantCategory,
  DailyOperationsSummary
} from '../types/restaurantAuditLog';

// Tab Type
type TabType = 'all' | 'orders' | 'tables' | 'staff' | 'menu' | 'daily';

const RestaurantAuditLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<RestaurantAuditLog[]>([]);
  const [stats, setStats] = useState<RestaurantAuditStats | null>(null);
  const [dailySummary, setDailySummary] = useState<DailyOperationsSummary | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<RestaurantAuditLogFilters>({
    page: 1,
    limit: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc',
    startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfDay(new Date()), 'yyyy-MM-dd')
  });
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data generator for demonstration
  const generateMockLogs = (): RestaurantAuditLog[] => {
    const actions: RestaurantAction[] = [
      'order.created', 'order.completed', 'table.assigned', 'staff.clocked_in',
      'menu.price_changed', 'inventory.received', 'order.payment_received'
    ];
    
    const staff = [
      { id: '1', name: 'John Doe', role: 'Waiter' },
      { id: '2', name: 'Jane Smith', role: 'Manager' },
      { id: '3', name: 'Mike Johnson', role: 'Chef' }
    ];
    
    return Array.from({ length: 20 }, (_, i) => ({
      _id: `log_${i}`,
      tenantId: 'tenant1',
      eventId: `event_${i}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      category: getCategory(actions[i % actions.length]),
      resource: {
        type: getResourceType(actions[i % actions.length]),
        id: `res_${i}`,
        name: `Resource ${i}`
      },
      performedBy: staff[i % staff.length],
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      status: Math.random() > 0.1 ? 'success' : 'failed',
      changes: {
        summary: `Action performed on resource ${i}`
      }
    }));
  };
  
  // Get category from action
  const getCategory = (action: RestaurantAction): RestaurantCategory => {
    if (action.startsWith('order.')) return 'orders';
    if (action.startsWith('table.')) return 'tables';
    if (action.startsWith('staff.')) return 'staff';
    if (action.startsWith('menu.')) return 'menu';
    if (action.startsWith('inventory.')) return 'inventory';
    return 'orders';
  };
  
  // Get resource type from action
  const getResourceType = (action: RestaurantAction) => {
    if (action.startsWith('order.')) return 'order';
    if (action.startsWith('table.')) return 'table';
    if (action.startsWith('staff.')) return 'staff_member';
    if (action.startsWith('menu.')) return 'menu_item';
    if (action.startsWith('inventory.')) return 'inventory_item';
    return 'order';
  };
  
  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      // In production, this would be an API call
      const mockLogs = generateMockLogs();
      setLogs(mockLogs.filter(log => 
        activeTab === 'all' || log.category === activeTab
      ));
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);
  
  // Load stats
  const loadStats = useCallback(async () => {
    try {
      // Mock stats
      setStats({
        timeRange: {
          start: startOfDay(new Date()),
          end: endOfDay(new Date())
        },
        operations: {
          totalOrders: 156,
          completedOrders: 142,
          cancelledOrders: 14,
          totalRevenue: 12450.50,
          averageOrderValue: 79.81
        },
        tables: {
          totalAssignments: 89,
          averageTurnoverTime: 45,
          peakHours: [
            { hour: 12, count: 24 },
            { hour: 19, count: 31 },
            { hour: 20, count: 28 }
          ]
        },
        staff: {
          totalShifts: 12,
          totalHoursWorked: 96,
          mostActiveStaff: [
            { name: 'John Doe', actions: 45 },
            { name: 'Jane Smith', actions: 38 }
          ]
        },
        topActions: [
          { action: 'order.created', count: 156 },
          { action: 'order.completed', count: 142 },
          { action: 'table.assigned', count: 89 }
        ]
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);
  
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);
  
  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };
  
  // Handle date filter
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };
  
  // Handle export
  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      toast.success(`Exporting audit logs as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export audit logs');
    }
  };
  
  // Get action icon
  const getActionIcon = (action: RestaurantAction) => {
    if (action.startsWith('order.')) return ShoppingCart;
    if (action.startsWith('table.')) return Grid3X3;
    if (action.startsWith('staff.')) return Users;
    if (action.startsWith('menu.')) return MenuSquare;
    if (action.startsWith('inventory.')) return Package;
    return Activity;
  };
  
  // Get action color
  const getActionColor = (action: RestaurantAction) => {
    if (action.includes('created') || action.includes('completed')) return 'text-green-600';
    if (action.includes('cancelled') || action.includes('failed')) return 'text-red-600';
    if (action.includes('updated') || action.includes('changed')) return 'text-blue-600';
    return 'text-gray-600';
  };
  
  // Tab configuration
  const tabs = [
    { id: 'all', label: 'All Activities', icon: Activity },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'tables', label: 'Tables', icon: Grid3X3 },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'menu', label: 'Menu', icon: MenuSquare },
    { id: 'daily', label: 'Daily Summary', icon: BarChart3 }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Restaurant Activity Log</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Track all restaurant operations and staff activities
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => loadLogs()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                <div className="relative group">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('csv')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    relative py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab !== 'daily' ? (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search activities..."
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Member
                  </label>
                  <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                    <option value="">All Staff</option>
                    <option value="1">John Doe</option>
                    <option value="2">Jane Smith</option>
                    <option value="3">Mike Johnson</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.operations.totalOrders}</p>
                      <p className="text-sm text-green-600">
                        {stats.operations.completedOrders} completed
                      </p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-primary-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${stats.operations.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Avg: ${stats.operations.averageOrderValue.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Table Turnover</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.tables.totalAssignments}</p>
                      <p className="text-sm text-gray-500">
                        Avg: {stats.tables.averageTurnoverTime} min
                      </p>
                    </div>
                    <Grid3X3 className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Staff</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.staff.totalShifts}</p>
                      <p className="text-sm text-gray-500">
                        {stats.staff.totalHoursWorked} hours
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Activity List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          Loading activities...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No activities found
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const ActionIcon = getActionIcon(log.action);
                        return (
                          <tr key={log._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{format(log.timestamp, 'HH:mm:ss')}</p>
                                <p className="text-gray-500">
                                  {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <ActionIcon className={`h-5 w-5 mr-2 ${getActionColor(log.action)}`} />
                                <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                                  {log.action.replace('.', ' ').replace(/_/g, ' ')}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {log.performedBy.name}
                                  </p>
                                  <p className="text-xs text-gray-500">{log.performedBy.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {log.changes?.summary || `${log.resource.type} #${log.resource.id}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.status === 'success' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Success
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Daily Summary View */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Operations</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-semibold">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed Orders</span>
                  <span className="font-semibold text-green-600">142</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cancelled Orders</span>
                  <span className="font-semibold text-red-600">14</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-semibold text-green-600">$12,450.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Order Value</span>
                  <span className="font-semibold">$79.81</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Staff Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Staff</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Hours Worked</span>
                  <span className="font-semibold">96</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tables Served</span>
                  <span className="font-semibold">89</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Table Time</span>
                  <span className="font-semibold">45 min</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Hours</h3>
              <div className="space-y-2">
                {stats?.tables.peakHours.map((hour, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-gray-600 w-20">{hour.hour}:00</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 ml-4">
                      <div
                        className="bg-primary-500 h-4 rounded-full"
                        style={{ width: `${(hour.count / 35) * 100}%` }}
                      />
                    </div>
                    <span className="ml-4 text-sm font-medium">{hour.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Activities</h3>
              <div className="space-y-3">
                {stats?.topActions.map((action, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {action.action.replace('.', ' ').replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold">{action.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAuditLogPage;