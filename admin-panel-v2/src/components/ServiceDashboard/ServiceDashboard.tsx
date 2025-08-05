import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Bell,
  Filter,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import ServiceRequestCard from './ServiceRequestCard';
import api from '../../services/api';
import socketService from '../../services/socketService';

interface ServiceMetrics {
  responseTime: {
    avgAcknowledgement: number;
    avgCompletion: number;
    count: number;
  };
  pendingRequests: number;
  waiterPerformance: Array<{
    waiterId: string;
    name: string;
    tablesServed: number;
    serviceRequests: {
      acknowledged: number;
      completed: number;
      averageResponseTime: number;
    };
  }>;
}

const ServiceDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [selectedWaiter, setSelectedWaiter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch active requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['service-requests', filter, selectedWaiter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWaiter !== 'all') params.append('assignedToMe', 'true');
      
      const response = await api.get(`/service-requests/active?${params}`);
      let filteredData = response.data;

      // Apply client-side filtering
      if (filter !== 'all') {
        if (filter === 'pending') {
          filteredData = filteredData.filter((r: any) => r.status === 'pending');
        } else if (filter === 'active') {
          filteredData = filteredData.filter((r: any) => 
            ['acknowledged', 'in_progress'].includes(r.status)
          );
        } else if (filter === 'completed') {
          filteredData = filteredData.filter((r: any) => 
            ['completed', 'cancelled'].includes(r.status)
          );
        }
      }

      return filteredData;
    },
    refetchInterval: autoRefresh ? 5000 : false
  });

  // Fetch metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['service-metrics'],
    queryFn: async () => {
      const response = await api.get('/service-requests/metrics?period=day');
      return response.data as ServiceMetrics;
    },
    refetchInterval: 30000
  });

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`/service-requests/${requestId}/acknowledge`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-metrics'] });
      toast.success('Request acknowledged');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to acknowledge request');
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`/service-requests/${requestId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-metrics'] });
      toast.success('Request completed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete request');
    }
  });

  // Socket listeners
  useEffect(() => {
    const unsubscribers = [
      socketService.on('service:requested', () => {
        queryClient.invalidateQueries({ queryKey: ['service-requests'] });
        queryClient.invalidateQueries({ queryKey: ['service-metrics'] });
        
        // Play notification sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
        
        toast('New service request!', {
          icon: '🔔',
          duration: 5000
        });
      }),
      socketService.on('service:update', () => {
        queryClient.invalidateQueries({ queryKey: ['service-requests'] });
        queryClient.invalidateQueries({ queryKey: ['service-metrics'] });
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [queryClient]);

  const getFilteredRequests = () => {
    if (!requests) return [];
    return requests;
  };

  const pendingRequests = getFilteredRequests().filter((r: any) => r.status === 'pending');
  const activeRequests = getFilteredRequests().filter((r: any) => 
    ['acknowledged', 'in_progress'].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Dashboard</h1>
              <p className="text-sm text-gray-500">Real-time service request management</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${autoRefresh 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
              <button
                onClick={() => queryClient.invalidateQueries()}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <Bell className="h-8 w-8 text-yellow-600" />
              <span className="text-3xl font-bold text-gray-900">
                {metrics?.pendingRequests || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Pending Requests</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">
                {metrics?.responseTime.avgAcknowledgement 
                  ? `${Math.round(metrics.responseTime.avgAcknowledgement)}s`
                  : '-'
                }
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg. Response Time</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">
                {metrics?.responseTime.count || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Completed Today</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <span className="text-3xl font-bold text-gray-900">
                {metrics?.responseTime.avgCompletion 
                  ? `${Math.round(metrics.responseTime.avgCompletion / 60)}m`
                  : '-'
                }
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg. Completion Time</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center border-b">
            <button
              onClick={() => setFilter('all')}
              className={`
                px-6 py-3 text-sm font-medium transition-colors relative
                ${filter === 'all' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              All Requests
              {requests && (
                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`
                px-6 py-3 text-sm font-medium transition-colors relative
                ${filter === 'pending' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`
                px-6 py-3 text-sm font-medium transition-colors relative
                ${filter === 'active' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Active
              {activeRequests.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {activeRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`
                px-6 py-3 text-sm font-medium transition-colors relative
                ${filter === 'completed' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Request Cards */}
        {requestsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : getFilteredRequests().length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No service requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {getFilteredRequests().map((request: any) => (
              <ServiceRequestCard
                key={request._id}
                request={request}
                onAcknowledge={
                  request.status === 'pending' 
                    ? () => acknowledgeMutation.mutate(request._id)
                    : undefined
                }
                onComplete={
                  ['acknowledged', 'in_progress'].includes(request.status)
                    ? () => completeMutation.mutate(request._id)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Waiter Performance */}
        {metrics?.waiterPerformance && metrics.waiterPerformance.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Waiter Performance Today</h2>
            <div className="bg-white rounded-lg shadow-sm border">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Waiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tables Served
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requests Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg. Response Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metrics.waiterPerformance.map((waiter) => (
                    <tr key={waiter.waiterId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {waiter.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {waiter.tablesServed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {waiter.serviceRequests.completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {waiter.serviceRequests.averageResponseTime > 0
                          ? `${waiter.serviceRequests.averageResponseTime}s`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDashboard;