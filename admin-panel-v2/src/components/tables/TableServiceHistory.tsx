import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp,
  Calendar,
  AlertCircle,
  Activity,
  FileText,
  Download,
  ChevronLeft,
  Star,
  Package,
  User
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { format, formatDistanceToNow } from 'date-fns';

interface ServiceHistory {
  _id: string;
  tableNumber: string;
  serviceStart: string;
  serviceEnd?: string;
  duration?: number;
  customerName: string;
  customerPhone?: string;
  numberOfGuests: number;
  waiterName: string;
  totalOrderAmount: number;
  totalOrders: number;
  payment?: {
    method: string;
    amount: number;
    tipAmount: number;
    tipPercentage: number;
  };
  feedback?: {
    rating: number;
    comment?: string;
  };
  metrics: {
    seatingTime?: number;
    orderTime?: number;
    firstFoodDelivery?: number;
    totalServiceTime?: number;
  };
}

interface TableAnalytics {
  summary: {
    totalServices: number;
    totalRevenue: number;
    totalGuests: number;
    avgDuration: number;
    avgOrderValue: number;
    avgGuests: number;
    avgRating: number;
    avgTipPercentage: number;
    peakHourServices: number;
    repeatCustomers: number;
    occupancyRate: number;
  };
  popularTimes: Array<{
    dayOfWeek: number;
    hour: number;
    services: number;
    avgDuration: number;
    avgRevenue: number;
  }>;
  topWaiters: Array<{
    waiterId: string;
    waiterName: string;
    services: number;
    avgRating: number;
    avgTips: number;
    totalRevenue: number;
  }>;
}

const TableServiceHistory = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [analytics, setAnalytics] = useState<TableAnalytics | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedTab, setSelectedTab] = useState<'history' | 'analytics' | 'trends'>('history');

  useEffect(() => {
    fetchTableHistory();
  }, [tableId, dateRange]);

  const fetchTableHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/table-service-history/tables/${tableId}/history?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      
      setServiceHistory(response.data.data.serviceHistory || []);
      setAnalytics(response.data.data.analytics);
    } catch (error) {
      console.error('Error fetching table history:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = async (format: 'json' | 'csv') => {
    try {
      const response = await api.get(
        `/admin/table-service-history/export?tableId=${tableId}&startDate=${dateRange.start}&endDate=${dateRange.end}&format=${format}`,
        { responseType: format === 'csv' ? 'blob' : 'json' }
      );

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-history-${tableId}.csv`;
        a.click();
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-history-${tableId}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting history:', error);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back to Tables
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Service History</h1>
            <p className="text-gray-600 mt-1">View detailed service history and analytics</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => exportHistory('csv')}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportHistory('json')}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalServices}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.summary.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.summary.avgDuration} min</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.summary.avgRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedTab('history')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'history'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Service History
            </button>
            <button
              onClick={() => setSelectedTab('analytics')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'analytics'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setSelectedTab('trends')}
              className={`px-6 py-3 text-sm font-medium ${
                selectedTab === 'trends'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Trends
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Service History Tab */}
          {selectedTab === 'history' && (
            <div className="space-y-4">
              {serviceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No service history found for the selected period</p>
                </div>
              ) : (
                serviceHistory.map((service) => (
                  <div key={service._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-medium text-gray-900">{service.customerName}</h4>
                          <span className="text-sm text-gray-500">
                            {format(new Date(service.serviceStart), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {service.duration && (
                            <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {service.duration} min
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Guests:</span>
                            <span className="ml-1 font-medium">{service.numberOfGuests}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Orders:</span>
                            <span className="ml-1 font-medium">{service.totalOrders}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <span className="ml-1 font-medium">{formatCurrency(service.totalOrderAmount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Waiter:</span>
                            <span className="ml-1 font-medium">{service.waiterName}</span>
                          </div>
                        </div>

                        {service.payment && service.payment.tipAmount > 0 && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Tip:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {formatCurrency(service.payment.tipAmount)} ({service.payment.tipPercentage}%)
                            </span>
                          </div>
                        )}

                        {service.feedback && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="ml-1 text-sm font-medium">{service.feedback.rating}</span>
                            </div>
                            {service.feedback.comment && (
                              <span className="text-sm text-gray-600 italic">
                                "{service.feedback.comment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {selectedTab === 'analytics' && analytics && (
            <div className="space-y-6">
              {/* Popular Times */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Times</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.popularTimes.slice(0, 6).map((time, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getDayName(time.dayOfWeek)} at {formatHour(time.hour)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {time.services} services • {time.avgDuration} min avg
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(time.avgRevenue)}</p>
                          <p className="text-sm text-gray-600">avg revenue</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Waiters */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Waiters</h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waiter</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Services</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Rating</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Tips</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analytics.topWaiters.map((waiter) => (
                        <tr key={waiter.waiterId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{waiter.waiterName}</td>
                          <td className="px-4 py-3 text-sm text-center">{waiter.services}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex items-center justify-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                              {waiter.avgRating}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">{waiter.avgTips}%</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(waiter.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Occupancy Rate</p>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{analytics.summary.occupancyRate}%</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Repeat Customers</p>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{analytics.summary.repeatCustomers}</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <Package className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.summary.avgOrderValue)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {selectedTab === 'trends' && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Trends visualization coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableServiceHistory;