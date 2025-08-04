import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  DollarSign,
  Activity,
  Award,
  Calendar,
  Loader2,
  Download,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { format } from 'date-fns';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { AssignmentMetrics } from '../../types/staffAssignment';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const AssignmentAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [metrics, setMetrics] = useState<AssignmentMetrics | null>(null);
  const [waiterPerformance, setWaiterPerformance] = useState<any[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);
  const [reasonDistribution, setReasonDistribution] = useState<any[]>([]);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load metrics
      const metricsData = await staffAssignmentAPI.getMetrics(period);
      setMetrics(metricsData);

      // Transform data for charts
      // Waiter performance data
      if (metricsData.topWaiters) {
        setWaiterPerformance(metricsData.topWaiters.slice(0, 10).map(w => ({
          name: w.waiterName,
          tables: w.tablesServed,
          revenue: w.revenue
        })));
      }

      // Hourly distribution
      if (metricsData.busiestHours) {
        const hourlyData = Array.from({ length: 24 }, (_, hour) => {
          const data = metricsData.busiestHours.find(h => h.hour === hour);
          return {
            hour: format(new Date().setHours(hour, 0), 'HH:mm'),
            assignments: data?.assignments || 0
          };
        });
        setHourlyDistribution(hourlyData);
      }

      // Reason distribution for pie chart
      if (metricsData.assignmentsByReason) {
        const reasonData = Object.entries(metricsData.assignmentsByReason)
          .filter(([_, count]) => count > 0)
          .map(([reason, count]) => ({
            name: reason.replace('_', ' ').charAt(0).toUpperCase() + reason.slice(1),
            value: count
          }));
        setReasonDistribution(reasonData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Export analytics
  const handleExport = async () => {
    try {
      const data = {
        period,
        metrics,
        waiterPerformance,
        hourlyDistribution,
        reasonDistribution,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignment-analytics-${period}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Analytics exported successfully');
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
        <p className="mt-1 text-sm text-gray-500">Analytics data will appear here once assignments are made</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Assignment Analytics</h3>
            
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics.totalAssignments}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {metrics.activeAssignments} active
              </p>
            </div>
            <Users className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Tables/Waiter</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics.averageTablesPerWaiter.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Per shift
              </p>
            </div>
            <Activity className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {Math.round(metrics.averageAssignmentDuration / 60)}h
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {metrics.averageAssignmentDuration % 60}m average
              </p>
            </div>
            <Clock className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Top Performer</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 truncate">
                {metrics.topWaiters[0]?.waiterName || '-'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {metrics.topWaiters[0]?.tablesServed || 0} tables
              </p>
            </div>
            <Award className="h-12 w-12 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter Performance Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Waiters Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waiterPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tables" fill="#6366f1" name="Tables Served" />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Assignment Distribution by Reason */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Assignment Reasons</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reasonDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reasonDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Assignments by Hour</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="assignments" 
                stroke="#6366f1" 
                strokeWidth={2}
                name="Assignments"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Waiter Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Detailed Waiter Performance</h4>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waiter
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tables Served
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue Generated
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg per Table
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.topWaiters.map((waiter, index) => (
              <tr key={waiter.waiterId} className={index === 0 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                  {index === 0 && <Award className="inline h-4 w-4 ml-2 text-yellow-600" />}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {waiter.waiterName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {waiter.tablesServed}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${waiter.revenue.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${waiter.tablesServed > 0 ? (waiter.revenue / waiter.tablesServed).toFixed(2) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentAnalytics;