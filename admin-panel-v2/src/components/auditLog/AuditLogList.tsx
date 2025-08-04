import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  User,
  Database,
  Settings,
  ShoppingCart,
  CreditCard,
  Grid3X3,
  MenuSquare,
  FileCheck,
  Code,
  BarChart3,
  Activity,
  Lock,
  Eye,
  MoreVertical
} from 'lucide-react';
import { AuditLog, AuditLogFilters, SecuritySeverity, AuditCategory } from '../../types/auditLog';
import { format, formatDistanceToNow } from 'date-fns';
import { auditLogAPI } from '../../services/auditLogAPI';

interface AuditLogListProps {
  logs: AuditLog[];
  loading: boolean;
  filters: AuditLogFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onFilterChange: (filters: Partial<AuditLogFilters>) => void;
  onPageChange: (page: number) => void;
  onLogSelect: (log: AuditLog) => void;
  onRefresh: () => void;
}

const AuditLogList: React.FC<AuditLogListProps> = ({
  logs,
  loading,
  filters,
  pagination,
  onFilterChange,
  onPageChange,
  onLogSelect,
  onRefresh
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  // Get icon for action
  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      Shield, User, Database, Settings, ShoppingCart, 
      CreditCard, Grid3X3, MenuSquare, FileCheck, Code, 
      BarChart3, Activity, Lock
    };
    const iconName = auditLogAPI.getActionIcon(action);
    return iconMap[iconName] || Activity;
  };

  // Get severity badge
  const getSeverityBadge = (severity: SecuritySeverity) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity}
      </span>
    );
  };

  // Get success icon
  const getSuccessIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search: searchQuery });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by action, user, resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className={`ml-2 h-4 w-4 transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 grid grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <input
                type="datetime-local"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category as string || ''}
                onChange={(e) => onFilterChange({ category: e.target.value as AuditCategory || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Categories</option>
                <option value="authentication">Authentication</option>
                <option value="authorization">Authorization</option>
                <option value="user_management">User Management</option>
                <option value="data_access">Data Access</option>
                <option value="data_modification">Data Modification</option>
                <option value="security">Security</option>
                <option value="compliance">Compliance</option>
                <option value="business_operation">Business Operation</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity as string || ''}
                onChange={(e) => onFilterChange({ severity: e.target.value ? [e.target.value as SecuritySeverity] : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Special Filters */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.suspicious || false}
                  onChange={(e) => onFilterChange({ suspicious: e.target.checked || undefined })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Suspicious Only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.requiresReview || false}
                  onChange={(e) => onFilterChange({ requiresReview: e.target.checked || undefined })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Requires Review</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.gdprOnly || false}
                  onChange={(e) => onFilterChange({ gdprOnly: e.target.checked || undefined })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">GDPR Only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                Actor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flags
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading audit logs...</p>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Activity className="h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No audit logs found</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <tr 
                    key={log.eventId} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onLogSelect(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ActionIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.action}</div>
                          <div className="text-xs text-gray-500">{log.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{log.actor.name || 'Unknown'}</div>
                        <div className="text-gray-500">{log.actor.email || log.actor.ip}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{log.resource.type}</div>
                        <div className="text-gray-500">{log.resource.name || log.resource.id || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSuccessIcon(log.result.success)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSeverityBadge(log.security.severity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {log.flags.suspicious && (
                          <AlertCircle className="h-4 w-4 text-red-500" title="Suspicious" />
                        )}
                        {log.flags.requiresReview && (
                          <Eye className="h-4 w-4 text-orange-500" title="Requires Review" />
                        )}
                        {log.flags.reviewed && (
                          <CheckCircle className="h-4 w-4 text-green-500" title="Reviewed" />
                        )}
                        {log.compliance?.isGdprRelated && (
                          <Shield className="h-4 w-4 text-blue-500" title="GDPR Related" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLogSelect(log);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;