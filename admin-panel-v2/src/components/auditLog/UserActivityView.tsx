import React, { useState, useEffect } from 'react';
import { User, Clock, Activity, Shield, TrendingUp, AlertCircle, Search } from 'lucide-react';
import { auditLogAPI } from '../../services/auditLogAPI';
import { AuditLog } from '../../types/auditLog';
import { format, formatDistanceToNow } from 'date-fns';

interface UserActivityViewProps {
  onLogSelect: (log: AuditLog) => void;
}

interface UserActivity {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalActions: number;
  failedActions: number;
  suspiciousActions: number;
  lastActivity: Date;
  riskScore: number;
  recentActions: AuditLog[];
}

const UserActivityView: React.FC<UserActivityViewProps> = ({ onLogSelect }) => {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadUserActivities();
  }, [timeRange]);

  const loadUserActivities = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would be a specific endpoint
      const { stats } = await auditLogAPI.getStats();
      
      // Transform the byActor stats into UserActivity format
      const userActivities: UserActivity[] = stats.byActor.map((actor: any) => ({
        userId: actor.id,
        name: actor.name || 'Unknown',
        email: actor.email || '',
        role: actor.role || 'user',
        totalActions: actor.count,
        failedActions: actor.failedCount || 0,
        suspiciousActions: actor.suspiciousCount || 0,
        lastActivity: new Date(actor.lastActivity || Date.now()),
        riskScore: actor.riskScore || 0,
        recentActions: []
      }));

      setUsers(userActivities);
    } catch (error) {
      console.error('Error loading user activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (user: UserActivity) => {
    try {
      const { logs } = await auditLogAPI.getLogs({
        actorId: user.userId,
        limit: 10
      });
      
      setSelectedUser({
        ...user,
        recentActions: logs
      });
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">High Risk</span>;
    } else if (score >= 50) {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Medium Risk</span>;
    } else if (score >= 20) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Low Risk</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Normal</span>;
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading user activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm w-64"
              />
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* User List */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Activities</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">No user activities found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.userId}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                    selectedUser?.userId === user.userId ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => loadUserDetails(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email} • {user.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-1">{getRiskBadge(user.riskScore)}</div>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(user.lastActivity, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-gray-500">Total Actions</p>
                      <p className="font-medium text-gray-900">{user.totalActions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Failed</p>
                      <p className="font-medium text-red-600">{user.failedActions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Suspicious</p>
                      <p className="font-medium text-orange-600">{user.suspiciousActions}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Details</h3>
          </div>
          {selectedUser ? (
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  {getRiskBadge(selectedUser.riskScore)}
                </div>

                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Role</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedUser.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Last Activity</dt>
                    <dd className="text-sm text-gray-900">
                      {format(selectedUser.lastActivity, 'PPpp')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Risk Score</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedUser.riskScore}/100</dd>
                  </div>
                </dl>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Actions</h4>
                  <div className="space-y-2">
                    {selectedUser.recentActions.length === 0 ? (
                      <p className="text-sm text-gray-500">No recent actions</p>
                    ) : (
                      selectedUser.recentActions.map((log) => (
                        <div
                          key={log.eventId}
                          className="p-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => onLogSelect(log)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-900">{log.action}</p>
                            <span className={`h-2 w-2 rounded-full ${
                              log.result.success ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.resource.type} • {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700">
                    View Full Activity History
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Select a user to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserActivityView;