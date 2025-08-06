import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Activity,
  Database,
  Mail,
  MessageSquare,
  Wifi,
  HardDrive,
  Cpu,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Shield,
  Server
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database?: ServiceStatus;
    redis?: ServiceStatus;
    email?: ServiceStatus;
    sms?: ServiceStatus;
    websocket?: ServiceStatus;
  };
  system: SystemInfo;
  issues: Issue[];
}

interface ServiceStatus {
  status: string;
  type?: string;
  provider?: string;
  error?: string;
  [key: string]: any;
}

interface SystemInfo {
  platform: string;
  nodeVersion: string;
  memory: {
    total: string;
    free: string;
    used: string;
    usagePercent: number;
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
  };
  process: {
    pid: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    };
  };
}

interface Issue {
  service: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value?: string;
}

interface ErrorLog {
  _id: string;
  type: string;
  severity: string;
  status: string;
  error: {
    message: string;
    code?: string;
    name?: string;
    stack?: string;
  };
  context: {
    url?: string;
    method?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    responseStatus?: number;
  };
  occurrences: number;
  firstOccurred: string;
  lastOccurred: string;
  createdAt: string;
}

interface ErrorStats {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
    new: number;
  };
  byType: { _id: string; count: number }[];
  trend: { _id: string; count: number; critical: number }[];
}

const SystemDiagnostics = () => {
  const [activeTab, setActiveTab] = useState<'health' | 'errors' | 'performance'>('health');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [errorFilters, setErrorFilters] = useState({
    type: '',
    severity: '',
    status: 'new',
    days: 7
  });

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, autoRefresh, errorFilters]);

  const fetchData = async () => {
    switch (activeTab) {
      case 'health':
        await fetchHealth();
        break;
      case 'errors':
        await Promise.all([fetchErrors(), fetchErrorStats()]);
        break;
    }
  };

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/system/health');
      setHealth(response.data.data);
    } catch (error) {
      console.error('Error fetching health:', error);
      toast.error('Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (errorFilters.type) params.append('type', errorFilters.type);
      if (errorFilters.severity) params.append('severity', errorFilters.severity);
      if (errorFilters.status) params.append('status', errorFilters.status);
      
      const response = await api.get(`/admin/system/errors?${params}`);
      setErrors(response.data.data);
    } catch (error) {
      console.error('Error fetching errors:', error);
      toast.error('Failed to fetch error logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorStats = async () => {
    try {
      const response = await api.get(`/admin/system/errors/stats?days=${errorFilters.days}`);
      setErrorStats(response.data.data);
    } catch (error) {
      console.error('Error fetching error stats:', error);
    }
  };

  const updateErrorStatus = async (errorId: string, status: string, notes?: string) => {
    try {
      await api.put(`/admin/system/errors/${errorId}/status`, { status, notes });
      toast.success(`Error marked as ${status}`);
      fetchErrors();
      fetchErrorStats();
      setSelectedError(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update error status');
    }
  };

  const checkService = async (service: string) => {
    try {
      const response = await api.get(`/admin/system/check/${service}`);
      toast.success(`${service} check completed`);
      if (activeTab === 'health') {
        fetchHealth();
      }
    } catch (error) {
      console.error('Error checking service:', error);
      toast.error(`Failed to check ${service}`);
    }
  };

  const createTestError = async () => {
    try {
      await api.post('/admin/system/test-error', {
        type: 'api',
        severity: 'low',
        message: 'This is a test error for diagnostics'
      });
      toast.success('Test error created');
      fetchErrors();
      fetchErrorStats();
    } catch (error) {
      console.error('Error creating test error:', error);
      toast.error('Failed to create test error');
    }
  };

  const cleanupErrors = async () => {
    if (!confirm('This will delete all resolved errors older than 30 days. Continue?')) return;
    
    try {
      const response = await api.delete('/admin/system/errors/cleanup?days=30');
      toast.success(response.data.message);
      fetchErrors();
      fetchErrorStats();
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Failed to cleanup errors');
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'configured':
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'not configured':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
      case 'disconnected':
      case 'error':
      case 'not running':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'system': return <Cpu className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const renderHealthTab = () => {
    if (!health) return null;

    return (
      <div className="space-y-6">
        {/* Overall Status */}
        <div className={`p-6 rounded-lg border-2 ${
          health.status === 'healthy' ? 'bg-green-50 border-green-200' :
          health.status === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {health.status === 'healthy' ? 
                <CheckCircle className="h-8 w-8 text-green-500" /> :
                health.status === 'degraded' ?
                <AlertCircle className="h-8 w-8 text-yellow-500" /> :
                <XCircle className="h-8 w-8 text-red-500" />
              }
              <div>
                <h3 className="text-lg font-semibold">System Status: {health.status.toUpperCase()}</h3>
                <p className="text-sm text-gray-600">
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Uptime: {formatUptime(health.uptime)}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchHealth()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Issues */}
        {health.issues.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Active Issues ({health.issues.length})</span>
            </h3>
            <div className="space-y-3">
              {health.issues.map((issue, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{issue.service.toUpperCase()}</p>
                      <p className="text-sm mt-1">{issue.message}</p>
                      {issue.value && (
                        <p className="text-sm mt-1 font-mono">{issue.value}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(health.services).map(([name, service]) => (
              <div key={name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {name === 'database' && <Database className="h-5 w-5 text-gray-600" />}
                    {name === 'redis' && <Server className="h-5 w-5 text-gray-600" />}
                    {name === 'email' && <Mail className="h-5 w-5 text-gray-600" />}
                    {name === 'sms' && <MessageSquare className="h-5 w-5 text-gray-600" />}
                    {name === 'websocket' && <Wifi className="h-5 w-5 text-gray-600" />}
                    <span className="font-medium capitalize">{name}</span>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Status: {service.status}</p>
                  {service.type && <p>Type: {service.type}</p>}
                  {service.provider && <p>Provider: {service.provider}</p>}
                  {service.error && <p className="text-red-600">Error: {service.error}</p>}
                </div>
                {['database', 'email', 'sms'].includes(name) && (
                  <button
                    onClick={() => checkService(name)}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Run Check →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Resources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">System Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Memory */}
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span>Memory</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span className="font-mono">{health.system.memory.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span className="font-mono">{health.system.memory.used}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Free</span>
                  <span className="font-mono">{health.system.memory.free}</span>
                </div>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        health.system.memory.usagePercent > 90 ? 'bg-red-500' :
                        health.system.memory.usagePercent > 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${health.system.memory.usagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {health.system.memory.usagePercent}% used
                  </p>
                </div>
              </div>
            </div>

            {/* CPU */}
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <span>CPU</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cores</span>
                  <span className="font-mono">{health.system.cpu.cores}</span>
                </div>
                <div className="text-sm">
                  <span>Model</span>
                  <p className="font-mono text-xs mt-1">{health.system.cpu.model}</p>
                </div>
                <div className="text-sm">
                  <span>Load Average</span>
                  <p className="font-mono text-xs mt-1">
                    {health.system.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Process */}
            <div>
              <h4 className="font-medium mb-3">Process</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>PID</span>
                  <span className="font-mono">{health.system.process.pid}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>RSS Memory</span>
                  <span className="font-mono">{health.system.process.memory.rss}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Heap Used</span>
                  <span className="font-mono">{health.system.process.memory.heapUsed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Heap Total</span>
                  <span className="font-mono">{health.system.process.memory.heapTotal}</span>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div>
              <h4 className="font-medium mb-3">System Info</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Platform</span>
                  <span className="font-mono">{health.system.platform}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Node Version</span>
                  <span className="font-mono">{health.system.nodeVersion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderErrorsTab = () => {
    return (
      <div className="space-y-6">
        {/* Error Statistics */}
        {errorStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Errors</p>
                  <p className="text-2xl font-bold">{errorStats.summary.total}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Critical</p>
                  <p className="text-2xl font-bold text-red-700">{errorStats.summary.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">High</p>
                  <p className="text-2xl font-bold text-yellow-700">{errorStats.summary.high}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-700">{errorStats.summary.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={errorFilters.type}
              onChange={(e) => setErrorFilters(prev => ({ ...prev, type: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">All Types</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="auth">Authentication</option>
              <option value="validation">Validation</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="system">System</option>
            </select>

            <select
              value={errorFilters.severity}
              onChange={(e) => setErrorFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={errorFilters.status}
              onChange={(e) => setErrorFilters(prev => ({ ...prev, status: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>

            <select
              value={errorFilters.days}
              onChange={(e) => setErrorFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>

            <button
              onClick={createTestError}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Create Test Error
            </button>

            <button
              onClick={cleanupErrors}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Cleanup Old</span>
            </button>
          </div>
        </div>

        {/* Error List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Error Logs</h3>
          </div>
          <div className="divide-y">
            {errors.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No errors found
              </div>
            ) : (
              errors.map((error) => (
                <div key={error._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTypeIcon(error.type)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(error.severity)}`}>
                          {error.severity}
                        </span>
                        <span className="text-sm text-gray-500">
                          {error.type}
                        </span>
                        {error.occurrences > 1 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                            {error.occurrences} occurrences
                          </span>
                        )}
                      </div>
                      
                      <p className="font-medium text-gray-900 mb-1">
                        {error.error.message}
                      </p>
                      
                      {error.context.url && (
                        <p className="text-sm text-gray-600">
                          {error.context.method} {error.context.url}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>First: {new Date(error.firstOccurred).toLocaleString()}</span>
                        <span>Last: {new Date(error.lastOccurred).toLocaleString()}</span>
                        {error.context.userName && (
                          <span>User: {error.context.userName}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedError(error)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {error.status !== 'resolved' && (
                        <select
                          value={error.status}
                          onChange={(e) => updateErrorStatus(error._id, e.target.value)}
                          className="text-sm rounded border-gray-300"
                        >
                          <option value="new">New</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="ignored">Ignored</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Details Modal */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Error Details</h3>
                  <button
                    onClick={() => setSelectedError(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Error Information</h4>
                  <div className="bg-gray-50 p-4 rounded space-y-2">
                    <p><strong>Message:</strong> {selectedError.error.message}</p>
                    {selectedError.error.code && (
                      <p><strong>Code:</strong> {selectedError.error.code}</p>
                    )}
                    {selectedError.error.name && (
                      <p><strong>Name:</strong> {selectedError.error.name}</p>
                    )}
                  </div>
                </div>
                
                {selectedError.error.stack && (
                  <div>
                    <h4 className="font-medium mb-2">Stack Trace</h4>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                      {selectedError.error.stack}
                    </pre>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Context</h4>
                  <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                    {selectedError.context.url && (
                      <p><strong>URL:</strong> {selectedError.context.method} {selectedError.context.url}</p>
                    )}
                    {selectedError.context.responseStatus && (
                      <p><strong>Response Status:</strong> {selectedError.context.responseStatus}</p>
                    )}
                    {selectedError.context.userName && (
                      <p><strong>User:</strong> {selectedError.context.userName} ({selectedError.context.userRole})</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  {selectedError.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Resolution notes:');
                        if (notes !== null) {
                          updateErrorStatus(selectedError._id, 'resolved', notes);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedError(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && !health && errors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Diagnostics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor system health, errors, and performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('health')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'health'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>System Health</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('errors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'errors'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Error Logs</span>
                {errorStats && errorStats.summary.new > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                    {errorStats.summary.new}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'health' && renderHealthTab()}
          {activeTab === 'errors' && renderErrorsTab()}
        </div>
      </div>
    </div>
  );
};

export default SystemDiagnostics;