import React from 'react';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { AuditLogStats as StatsType } from '../../types/auditLog';

interface AuditLogStatsProps {
  stats: StatsType | null;
  loading: boolean;
  onRefresh: () => void;
}

const AuditLogStats: React.FC<AuditLogStatsProps> = ({ stats, loading, onRefresh }) => {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const overview = stats.stats.overview[0];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.totalEvents || 0}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Failed Events</p>
              <p className="text-2xl font-bold text-red-600">{overview?.failedEvents || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Suspicious Events</p>
              <p className="text-2xl font-bold text-orange-600">{overview?.suspiciousEvents || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.avgResponseTime ? `${Math.round(overview.avgResponseTime)}ms` : '-'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Events by Category</h3>
          <div className="space-y-2">
            {stats.stats.byCategory.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item._id}</span>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Actors</h3>
          <div className="space-y-2">
            {stats.stats.byActor.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.name || 'Unknown'}</span>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogStats;