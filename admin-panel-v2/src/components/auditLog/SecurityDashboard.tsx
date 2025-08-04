import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Lock, XCircle } from 'lucide-react';
import { auditLogAPI } from '../../services/auditLogAPI';
import { AuditLog } from '../../types/auditLog';

interface SecurityDashboardProps {
  onLogSelect: (log: AuditLog) => void;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ onLogSelect }) => {
  const [highRiskEvents, setHighRiskEvents] = useState<AuditLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<AuditLog[]>([]);
  const [suspiciousEvents, setSuspiciousEvents] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [highRisk, suspicious, logins] = await Promise.all([
        auditLogAPI.getHighRiskEvents(24),
        auditLogAPI.getSuspiciousEvents(7),
        auditLogAPI.getLogs({ 
          action: ['auth.login_failed'], 
          limit: 20 
        })
      ]);
      
      setHighRiskEvents(highRisk);
      setSuspiciousEvents(suspicious);
      setFailedLogins(logins.logs);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">High Risk Events</p>
              <p className="text-3xl font-bold text-red-900">{highRiskEvents.length}</p>
              <p className="text-xs text-red-600 mt-1">Last 24 hours</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Suspicious Activities</p>
              <p className="text-3xl font-bold text-orange-900">{suspiciousEvents.length}</p>
              <p className="text-xs text-orange-600 mt-1">Last 7 days</p>
            </div>
            <Shield className="h-10 w-10 text-orange-400" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Failed Logins</p>
              <p className="text-3xl font-bold text-yellow-900">{failedLogins.length}</p>
              <p className="text-xs text-yellow-600 mt-1">Recent attempts</p>
            </div>
            <Lock className="h-10 w-10 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* High Risk Events */}
      {highRiskEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">High Risk Events</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {highRiskEvents.slice(0, 5).map((event) => (
              <div
                key={event.eventId}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onLogSelect(event)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.action}</p>
                    <p className="text-xs text-gray-500">
                      {event.actor.name || event.actor.email} • {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-red-600">Risk: {event.security.riskScore}</span>
                    {!event.result.success && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;