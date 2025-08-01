import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Clock, DollarSign, 
  Calendar, Activity, Award, ChevronDown 
} from 'lucide-react';
import { Table, TableSession, TableAnalytics as TableAnalyticsData } from '../../types/table';
import { tableAPI } from '../../services/tableAPI';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TableAnalyticsProps {
  tables: Table[];
  selectedTable: Table | null;
  onSelectTable: (table: Table | null) => void;
}

const TableAnalytics: React.FC<TableAnalyticsProps> = ({
  tables,
  selectedTable,
  onSelectTable
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [analytics, setAnalytics] = useState<TableAnalyticsData | null>(null);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      fetchAnalytics();
    }
  }, [selectedTable, period]);

  const fetchAnalytics = async () => {
    if (!selectedTable) return;

    try {
      setLoading(true);
      const [analyticsData, sessionsData] = await Promise.all([
        tableAPI.getTableAnalytics(selectedTable._id, period),
        tableAPI.getTableSessions(selectedTable._id, { limit: 10 })
      ]);
      
      setAnalytics(analyticsData.analytics);
      setSessions(sessionsData.sessions);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDistribution = () => {
    const statusCounts = {
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      maintenance: 0
    };

    tables.forEach(table => {
      statusCounts[table.status]++;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: getStatusColor(status as any)
    }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: '#10B981',
      occupied: '#EF4444',
      reserved: '#F59E0B',
      cleaning: '#3B82F6',
      maintenance: '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (!selectedTable && tables.length > 0) {
    // Overview for all tables
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Table Overview</h3>
          
          {/* Status Distribution */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Current Status Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStatusDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Grid */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Select a Table for Detailed Analytics</h4>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {tables.map(table => (
                <button
                  key={table._id}
                  onClick={() => onSelectTable(table)}
                  className="p-3 border rounded-lg text-center hover:shadow-md transition-all border-gray-200 hover:border-gray-300"
                  style={{
                    borderTopColor: getStatusColor(table.status),
                    borderTopWidth: '4px'
                  }}
                >
                  <div className="font-medium">{table.number}</div>
                  <div className="text-xs text-gray-500">{table.capacity} seats</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Analytics Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add tables to view analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Table {selectedTable.displayName || selectedTable.number} Analytics
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedTable.location.floor} - {selectedTable.location.section} | 
              {selectedTable.capacity} seats | {selectedTable.type}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
            
            <button
              onClick={() => onSelectTable(null)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : analytics && analytics.metrics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.metrics.totalSessions || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    {analytics.metrics.totalGuests || 0} guests
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(analytics.metrics.revenue || 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(analytics.metrics.averageOrderValue || 0)} avg
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatDuration(analytics.metrics.averageOccupancyTime || 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(analytics.metrics.turnoverRate || 0).toFixed(1)} turns/day
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Award className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(analytics.metrics.customerSatisfaction || 0).toFixed(1)}/5
                  </p>
                  <p className="text-sm text-gray-500">
                    Customer rating
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Times */}
          {analytics.metrics.popularTimes && analytics.metrics.popularTimes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Popular Times</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.metrics.popularTimes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Sessions</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(session.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.duration ? formatDuration(session.duration) : 'Active'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.numberOfGuests}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(session.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.waiterName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.feedback?.rating || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Analytics will appear once the table has session data
          </p>
        </div>
      )}
    </div>
  );
};

export default TableAnalytics;