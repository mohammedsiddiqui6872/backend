import React, { useEffect, useState, useRef } from 'react';
import { Activity, AlertCircle, CheckCircle, XCircle, Pause, Play, Filter } from 'lucide-react';
import { AuditLog } from '../../types/auditLog';
import { format } from 'date-fns';
import io from 'socket.io-client';

interface RealTimeMonitorProps {
  onLogSelect: (log: AuditLog) => void;
}

const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ onLogSelect }) => {
  const [realtimeLogs, setRealtimeLogs] = useState<AuditLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'suspicious'>('all');
  const socketRef = useRef<any>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Socket.io connection
    const token = localStorage.getItem('adminToken');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    socketRef.current = io(apiUrl, {
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to real-time audit log stream');
      socketRef.current.emit('subscribe', { type: 'audit-logs' });
    });

    socketRef.current.on('audit-log', (log: AuditLog) => {
      if (!isPaused) {
        setRealtimeLogs(prev => {
          const newLogs = [log, ...prev].slice(0, 100); // Keep last 100 logs
          return newLogs;
        });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isPaused]);

  useEffect(() => {
    // Auto-scroll to top when new logs arrive
    if (logsContainerRef.current && !isPaused) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [realtimeLogs, isPaused]);

  const filteredLogs = realtimeLogs.filter(log => {
    switch (filter) {
      case 'success':
        return log.result.success;
      case 'failed':
        return !log.result.success;
      case 'suspicious':
        return log.flags.suspicious;
      default:
        return true;
    }
  });

  const getActionColor = (log: AuditLog) => {
    if (!log.result.success) return 'text-red-600';
    if (log.flags.suspicious) return 'text-orange-600';
    if (log.security.severity === 'high' || log.security.severity === 'critical') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (log: AuditLog) => {
    if (!log.result.success) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (log.flags.suspicious) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isPaused 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Events</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
                <option value="suspicious">Suspicious Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Activity className={`h-5 w-5 ${isPaused ? 'text-gray-400' : 'text-green-500 animate-pulse'}`} />
            <span className="text-sm text-gray-500">
              {isPaused ? 'Stream Paused' : 'Live Stream Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Log Stream */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Real-time Activity Stream</h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredLogs.length} events (last 100 events retained)
          </p>
        </div>

        <div 
          ref={logsContainerRef}
          className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto"
        >
          {filteredLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">
                {isPaused ? 'Stream is paused' : 'Waiting for events...'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.eventId}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                onClick={() => onLogSelect(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(log)}
                    <div>
                      <p className={`text-sm font-medium ${getActionColor(log)}`}>
                        {log.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.actor.name || log.actor.email || 'Unknown'} • 
                        {log.resource.type} {log.resource.name && `(${log.resource.name})`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </p>
                    {log.request?.responseTime && (
                      <p className="text-xs text-gray-400 mt-1">
                        {log.request.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600">Total Events</p>
          <p className="text-2xl font-bold text-gray-900">{realtimeLogs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {realtimeLogs.length > 0 
              ? Math.round((realtimeLogs.filter(l => l.result.success).length / realtimeLogs.length) * 100)
              : 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600">Failed Events</p>
          <p className="text-2xl font-bold text-red-600">
            {realtimeLogs.filter(l => !l.result.success).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600">Suspicious</p>
          <p className="text-2xl font-bold text-orange-600">
            {realtimeLogs.filter(l => l.flags.suspicious).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitor;