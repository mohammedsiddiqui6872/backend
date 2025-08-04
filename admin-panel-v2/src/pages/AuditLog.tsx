import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Lock,
  Database,
  Settings,
  ShoppingCart,
  CreditCard,
  Grid3X3,
  MenuSquare,
  FileCheck,
  Code,
  BarChart3,
  ChevronRight,
  Calendar,
  User,
  Globe,
  Smartphone,
  Monitor,
  Tag,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { auditLogAPI } from '../services/auditLogAPI';
import { 
  AuditLog, 
  AuditLogFilters, 
  AuditLogStats as AuditLogStatsType,
  SecuritySeverity,
  AuditCategory,
  ResourceType,
  ActorType,
  ReviewDecision
} from '../types/auditLog';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import socketService from '../services/socketService';

// Tab components
import AuditLogList from '../components/auditLog/AuditLogList';
import AuditLogDetails from '../components/auditLog/AuditLogDetails';
import AuditLogStatsComponent from '../components/auditLog/AuditLogStats';
import SecurityDashboard from '../components/auditLog/SecurityDashboard';
import ComplianceReports from '../components/auditLog/ComplianceReports';
import RealTimeMonitor from '../components/auditLog/RealTimeMonitor';
import UserActivityView from '../components/auditLog/UserActivityView';

type TabType = 'all' | 'security' | 'compliance' | 'realtime' | 'analytics' | 'users';

const AuditLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStatsType | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Load audit logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await auditLogAPI.getLogs(filters);
      setLogs(result.logs);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const statsData = await auditLogAPI.getStats({ period: '24h' });
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  // Real-time updates
  useEffect(() => {
    // Connect to socket if not connected
    const token = localStorage.getItem('adminToken') || '';
    const tenantId = localStorage.getItem('tenantId') || '';
    
    if (token && tenantId) {
      socketService.connect(tenantId, token);
    }

    // Listen to raw socket events for audit logs
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAuditNew = (event: any) => {
      // Add new event to the list if on first page
      if (filters.page === 1) {
        setLogs(prev => [event, ...prev.slice(0, -1)]);
      }
      // Show notification for high severity events
      if (event.severity === 'critical' || event.severity === 'high') {
        toast.error(`Critical event: ${event.action}`, {
          duration: 5000,
          icon: '🚨'
        });
      }
    };

    const handleAuditAlert = (alert: any) => {
      toast.error(alert.message, {
        duration: 10000,
        icon: '⚠️'
      });
    };

    const handleAuditReviewed = (review: any) => {
      // Update log if it's in the current list
      setLogs(prev => prev.map(log => 
        log.eventId === review.eventId 
            ? { ...log, flags: { ...log.flags, reviewed: true } }
            : log
      ));
    };

    // Register event listeners
    socket.on('audit:new', handleAuditNew);
    socket.on('audit:alert', handleAuditAlert);
    socket.on('audit:reviewed', handleAuditReviewed);

    // Cleanup
    return () => {
      socket.off('audit:new', handleAuditNew);
      socket.off('audit:alert', handleAuditAlert);
      socket.off('audit:reviewed', handleAuditReviewed);
    };
  }, [filters.page]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AuditLogFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page on filter change
    }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle log selection
  const handleLogSelect = async (log: AuditLog) => {
    try {
      const fullLog = await auditLogAPI.getLog(log.eventId);
      setSelectedLog(fullLog);
      setShowDetails(true);
    } catch (error) {
      toast.error('Failed to load log details');
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json' | 'pdf' | 'excel') => {
    try {
      const blob = await auditLogAPI.exportLogs(format, filters);
      auditLogAPI.downloadExport(blob, format);
      toast.success(`Exported audit logs as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export audit logs');
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'all', label: 'All Events', icon: Activity, badge: pagination.total },
    { id: 'security', label: 'Security', icon: Shield, badge: stats?.stats.overview[0]?.suspiciousEvents },
    { id: 'compliance', label: 'Compliance', icon: FileCheck, badge: null },
    { id: 'realtime', label: 'Real-Time', icon: Activity, badge: null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'users', label: 'User Activity', icon: Users, badge: null }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor all system activities, security events, and compliance tracking
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
                <div className="relative">
                  <button
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('csv')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as JSON
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
                  {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'all' && (
          <AuditLogList
            logs={logs}
            loading={loading}
            filters={filters}
            pagination={pagination}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onLogSelect={handleLogSelect}
            onRefresh={loadLogs}
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityDashboard
            onLogSelect={handleLogSelect}
          />
        )}
        
        {activeTab === 'compliance' && (
          <ComplianceReports
            onLogSelect={handleLogSelect}
          />
        )}
        
        {activeTab === 'realtime' && (
          <RealTimeMonitor
            onLogSelect={handleLogSelect}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AuditLogStatsComponent
            stats={stats}
            loading={!stats}
            onRefresh={loadStats}
          />
        )}
        
        {activeTab === 'users' && (
          <UserActivityView
            onLogSelect={handleLogSelect}
          />
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <AuditLogDetails
          log={selectedLog}
          onClose={() => {
            setShowDetails(false);
            setSelectedLog(null);
          }}
          onReview={async (decision, notes) => {
            try {
              await auditLogAPI.reviewLog(selectedLog.eventId, { decision, notes });
              toast.success('Log reviewed successfully');
              loadLogs();
            } catch (error) {
              toast.error('Failed to review log');
            }
          }}
          onMarkFalsePositive={async () => {
            try {
              await auditLogAPI.markFalsePositive(selectedLog.eventId);
              toast.success('Marked as false positive');
              loadLogs();
            } catch (error) {
              toast.error('Failed to mark as false positive');
            }
          }}
          onAddTags={async (tags) => {
            try {
              await auditLogAPI.addTags(selectedLog.eventId, tags);
              toast.success('Tags added successfully');
              loadLogs();
            } catch (error) {
              toast.error('Failed to add tags');
            }
          }}
        />
      )}
    </div>
  );
};

export default AuditLogPage;