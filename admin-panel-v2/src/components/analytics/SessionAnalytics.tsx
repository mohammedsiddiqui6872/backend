import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import api from '../../services/api';
import Card from '../common/Card';
import DateRangePicker from '../common/DateRangePicker';
import { 
  Clock, Users, DollarSign, TrendingUp, 
  AlertTriangle, Activity, Award, Coffee 
} from 'lucide-react';

interface SessionMetrics {
  overview: {
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    totalRevenue: number;
    totalGuests: number;
    avgSessionDuration: number;
    avgOrderValue: number;
    avgWaitTime: number;
    totalTips: number;
    avgTipPercentage: number;
  };
  peakHours: Array<{
    hour: number;
    sessions: number;
    revenue: number;
  }>;
  tablePerformance: Array<{
    _id: string;
    sessions: number;
    revenue: number;
    avgDuration: number;
    avgOrderValue: number;
    turnoverRate: number;
  }>;
  waiterPerformance: Array<{
    waiterName: string;
    sessions: number;
    revenue: number;
    tips: number;
    avgTipPercentage: number;
    avgResponseTime: number;
    avgRating: number;
  }>;
  anomalies: Array<{
    tableNumber: string;
    time: string;
    anomalies: Array<{
      type: string;
      severity: string;
      message: string;
      value?: number;
    }>;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const SessionAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableMetrics, setTableMetrics] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date())
  });
  const [liveSessions, setLiveSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardMetrics();
    fetchLiveSessions();
    
    // Refresh live sessions every 30 seconds
    const interval = setInterval(fetchLiveSessions, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/session-analytics/dashboard', {
        params: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        }
      });
      setMetrics(response.data.data);
    } catch (error) {
      console.error('Error fetching session analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const response = await api.get('/admin/session-analytics/live');
      setLiveSessions(response.data.data.sessions || []);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  const fetchTableMetrics = async (tableNumber: string) => {
    try {
      const response = await api.get(`/admin/session-analytics/tables/${tableNumber}`, {
        params: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        }
      });
      setTableMetrics(response.data.data);
      setSelectedTable(tableNumber);
    } catch (error) {
      console.error('Error fetching table metrics:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Analytics</h2>
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
        />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Sessions</p>
              <p className="text-2xl font-bold">{metrics.overview.totalSessions}</p>
              <p className="text-sm text-green-600">
                {metrics.overview.activeSessions} active
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.overview.totalRevenue)}</p>
              <p className="text-sm text-gray-600">
                Avg: {formatCurrency(metrics.overview.avgOrderValue)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Guests</p>
              <p className="text-2xl font-bold">{metrics.overview.totalGuests}</p>
              <p className="text-sm text-gray-600">
                {(metrics.overview.totalGuests / metrics.overview.totalSessions).toFixed(1)} per table
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Session</p>
              <p className="text-2xl font-bold">{formatDuration(metrics.overview.avgSessionDuration)}</p>
              <p className="text-sm text-gray-600">
                Wait: {Math.round(metrics.overview.avgWaitTime)}s
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Live Sessions */}
      {liveSessions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-500" />
            Live Sessions ({liveSessions.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Table</th>
                  <th className="text-left p-2">Waiter</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Guests</th>
                  <th className="text-left p-2">Orders</th>
                  <th className="text-left p-2">Revenue</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map((session, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{session.tableNumber}</td>
                    <td className="p-2">{session.waiterName || '-'}</td>
                    <td className="p-2">{session.duration}m</td>
                    <td className="p-2">{session.guests}</td>
                    <td className="p-2">{session.orders}</td>
                    <td className="p-2">{formatCurrency(session.revenue)}</td>
                    <td className="p-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {session.lastEvent?.eventType || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Peak Hours Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Peak Hours Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={(hour) => `${hour}:00`}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Table Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Tables</h3>
          <div className="space-y-3">
            {metrics.tablePerformance.slice(0, 5).map((table) => (
              <div 
                key={table._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => fetchTableMetrics(table._id)}
              >
                <div>
                  <p className="font-medium">Table {table._id}</p>
                  <p className="text-sm text-gray-600">
                    {table.sessions} sessions • {formatDuration(table.avgDuration)} avg
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(table.revenue)}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(table.avgOrderValue)} avg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Waiter Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Waiter Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Waiter</th>
                <th className="text-left p-2">Sessions</th>
                <th className="text-left p-2">Revenue</th>
                <th className="text-left p-2">Tips</th>
                <th className="text-left p-2">Avg Tip %</th>
                <th className="text-left p-2">Response Time</th>
                <th className="text-left p-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {metrics.waiterPerformance.map((waiter, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{waiter.waiterName}</td>
                  <td className="p-2">{waiter.sessions}</td>
                  <td className="p-2">{formatCurrency(waiter.revenue)}</td>
                  <td className="p-2">{formatCurrency(waiter.tips)}</td>
                  <td className="p-2">{waiter.avgTipPercentage.toFixed(1)}%</td>
                  <td className="p-2">{waiter.avgResponseTime}s</td>
                  <td className="p-2">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 text-yellow-500 mr-1" />
                      {waiter.avgRating?.toFixed(1) || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Anomalies */}
      {metrics.anomalies.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Detected Anomalies
          </h3>
          <div className="space-y-3">
            {metrics.anomalies.map((anomaly, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Table {anomaly.tableNumber}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(anomaly.time), 'HH:mm:ss')}
                    </p>
                  </div>
                  <div className="text-right">
                    {anomaly.anomalies.map((a, i) => (
                      <p key={i} className="text-sm">
                        <span className={`font-medium ${
                          a.severity === 'high' ? 'text-red-600' : 
                          a.severity === 'medium' ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {a.type}:
                        </span> {a.message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Table Details Modal */}
      {selectedTable && tableMetrics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Table {selectedTable} Analytics</h3>
              <button
                onClick={() => {
                  setSelectedTable(null);
                  setTableMetrics(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Table Analytics Content */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                  <p className="text-xl font-bold">{tableMetrics.analytics.totalSessions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(tableMetrics.analytics.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-xl font-bold">{formatDuration(tableMetrics.analytics.avgDuration)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                  <p className="text-xl font-bold">{formatCurrency(tableMetrics.analytics.avgOrderValue)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recent Sessions</h4>
                <div className="space-y-2">
                  {tableMetrics.recentSessions.map((session: any) => (
                    <div key={session._id} className="p-2 bg-gray-50 rounded">
                      <div className="flex justify-between">
                        <span className="text-sm">
                          {format(new Date(session.startTime), 'MMM dd, HH:mm')}
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(session.totalOrderAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{session.numberOfGuests} guests</span>
                        <span>{formatDuration(session.duration)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionAnalytics;