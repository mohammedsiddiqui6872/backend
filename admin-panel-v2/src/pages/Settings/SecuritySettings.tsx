import { FC, useState } from 'react';
import { Shield, Lock, Key, AlertTriangle, UserCheck, Eye, EyeOff } from 'lucide-react';

interface SecuritySettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const SecuritySettings: FC<SecuritySettingsProps> = ({ settings, onChange, onSave, saving }) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-6">
      {/* Authentication Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Lock className="h-5 w-5 mr-2" />
          Authentication
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.security?.sessionTimeout || 30}
              onChange={(e) => onChange({
                ...settings,
                security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
              })}
              min="5"
              max="1440"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-logout after inactivity</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
            <input
              type="number"
              value={settings.security?.maxLoginAttempts || 5}
              onChange={(e) => onChange({
                ...settings,
                security: { ...settings.security, maxLoginAttempts: parseInt(e.target.value) }
              })}
              min="3"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Lock account after failed attempts</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Lockout Duration (minutes)</label>
            <input
              type="number"
              value={settings.security?.lockoutDuration || 15}
              onChange={(e) => onChange({
                ...settings,
                security: { ...settings.security, lockoutDuration: parseInt(e.target.value) }
              })}
              min="5"
              max="60"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Token Expiry (days)</label>
            <input
              type="number"
              value={settings.security?.tokenExpiry || 7}
              onChange={(e) => onChange({
                ...settings,
                security: { ...settings.security, tokenExpiry: parseInt(e.target.value) }
              })}
              min="1"
              max="90"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.enable2FA ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  security: { ...settings.security, enable2FA: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.requirePasswordChange ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  security: { ...settings.security, requirePasswordChange: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Password Change on First Login</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.rememberDevice ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: { ...settings.security, rememberDevice: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow Remember Device</span>
            </label>
          </div>
        </div>
      </div>

      {/* Password Policy */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2" />
          Password Policy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Length</label>
            <input
              type="number"
              value={settings.security?.passwordPolicy?.minLength || 8}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security?.passwordPolicy, minLength: parseInt(e.target.value) }
                }
              })}
              min="6"
              max="32"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password Expiry (days)</label>
            <input
              type="number"
              value={settings.security?.passwordPolicy?.expiryDays || 90}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security?.passwordPolicy, expiryDays: parseInt(e.target.value) }
                }
              })}
              min="0"
              max="365"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">0 = never expires</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password History</label>
            <input
              type="number"
              value={settings.security?.passwordPolicy?.historyCount || 3}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security?.passwordPolicy, historyCount: parseInt(e.target.value) }
                }
              })}
              min="0"
              max="24"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Prevent reuse of last N passwords</p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.passwordPolicy?.requireUppercase ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    passwordPolicy: { ...settings.security?.passwordPolicy, requireUppercase: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Uppercase Letters</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.passwordPolicy?.requireLowercase ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    passwordPolicy: { ...settings.security?.passwordPolicy, requireLowercase: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Lowercase Letters</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.passwordPolicy?.requireNumbers ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    passwordPolicy: { ...settings.security?.passwordPolicy, requireNumbers: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Numbers</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.passwordPolicy?.requireSpecialChars ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    passwordPolicy: { ...settings.security?.passwordPolicy, requireSpecialChars: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Special Characters</span>
            </label>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <UserCheck className="h-5 w-5 mr-2" />
          Access Control
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.accessControl?.enableIPWhitelisting ?? false}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  accessControl: { ...settings.security?.accessControl, enableIPWhitelisting: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable IP Whitelisting</span>
          </label>

          {settings.security?.accessControl?.enableIPWhitelisting && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700">Whitelisted IPs (one per line)</label>
              <textarea
                value={settings.security?.accessControl?.whitelistedIPs?.join('\n') || ''}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    accessControl: {
                      ...settings.security?.accessControl,
                      whitelistedIPs: e.target.value.split('\n').filter(ip => ip.trim())
                    }
                  }
                })}
                rows={4}
                placeholder="192.168.1.1\n10.0.0.0/24"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.accessControl?.enableGeofencing ?? false}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  accessControl: { ...settings.security?.accessControl, enableGeofencing: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Geofencing for Staff Clock-in</span>
          </label>

          {settings.security?.accessControl?.enableGeofencing && (
            <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="number"
                  value={settings.security?.accessControl?.geofence?.latitude || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    security: {
                      ...settings.security,
                      accessControl: {
                        ...settings.security?.accessControl,
                        geofence: {
                          ...settings.security?.accessControl?.geofence,
                          latitude: parseFloat(e.target.value)
                        }
                      }
                    }
                  })}
                  step="0.000001"
                  placeholder="25.2048"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="number"
                  value={settings.security?.accessControl?.geofence?.longitude || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    security: {
                      ...settings.security,
                      accessControl: {
                        ...settings.security?.accessControl,
                        geofence: {
                          ...settings.security?.accessControl?.geofence,
                          longitude: parseFloat(e.target.value)
                        }
                      }
                    }
                  })}
                  step="0.000001"
                  placeholder="55.2708"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Radius (meters)</label>
                <input
                  type="number"
                  value={settings.security?.accessControl?.geofence?.radius || 100}
                  onChange={(e) => onChange({
                    ...settings,
                    security: {
                      ...settings.security,
                      accessControl: {
                        ...settings.security?.accessControl,
                        geofence: {
                          ...settings.security?.accessControl?.geofence,
                          radius: parseInt(e.target.value)
                        }
                      }
                    }
                  })}
                  min="10"
                  max="1000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.accessControl?.restrictAdminAccess ?? false}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  accessControl: { ...settings.security?.accessControl, restrictAdminAccess: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Restrict Admin Access to Business Hours</span>
          </label>
        </div>
      </div>

      {/* API Security */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          API Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">API Rate Limit (per minute)</label>
            <input
              type="number"
              value={settings.security?.api?.rateLimit || 100}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  api: { ...settings.security?.api, rateLimit: parseInt(e.target.value) }
                }
              })}
              min="10"
              max="1000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">API Key</label>
            <div className="mt-1 relative">
              <input
                type={showSecrets['apiKey'] ? 'text' : 'password'}
                value={settings.security?.api?.apiKey || ''}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    api: { ...settings.security?.api, apiKey: e.target.value }
                  }
                })}
                placeholder="sk_live_..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('apiKey')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showSecrets['apiKey'] ? 
                  <EyeOff className="h-4 w-4 text-gray-400" /> : 
                  <Eye className="h-4 w-4 text-gray-400" />
                }
              </button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.api?.enableCORS ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    api: { ...settings.security?.api, enableCORS: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable CORS</span>
            </label>

            {settings.security?.api?.enableCORS && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700">Allowed Origins (one per line)</label>
                <textarea
                  value={settings.security?.api?.allowedOrigins?.join('\n') || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    security: {
                      ...settings.security,
                      api: {
                        ...settings.security?.api,
                        allowedOrigins: e.target.value.split('\n').filter(origin => origin.trim())
                      }
                    }
                  })}
                  rows={3}
                  placeholder="https://example.com\nhttps://app.example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            )}

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.api?.enableRequestSigning ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    api: { ...settings.security?.api, enableRequestSigning: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Request Signing (HMAC)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.security?.api?.logAPIRequests ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    api: { ...settings.security?.api, logAPIRequests: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Log API Requests</span>
            </label>
          </div>
        </div>
      </div>

      {/* Data Security */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Data Security
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.data?.encryptAtRest ?? true}
                onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  data: { ...settings.security?.data, encryptAtRest: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Encrypt Data at Rest</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.data?.encryptInTransit ?? true}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  data: { ...settings.security?.data, encryptInTransit: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Encrypt Data in Transit (TLS)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.data?.maskPII ?? true}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  data: { ...settings.security?.data, maskPII: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Mask PII in Logs</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.security?.data?.enableAuditLog ?? true}
              onChange={(e) => onChange({
                ...settings,
                security: {
                  ...settings.security,
                  data: { ...settings.security?.data, enableAuditLog: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Audit Logging</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Audit Log Retention (days)</label>
              <input
                type="number"
                value={settings.security?.data?.auditLogRetention || 90}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    data: { ...settings.security?.data, auditLogRetention: parseInt(e.target.value) }
                  }
                })}
                min="30"
                max="365"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data Retention Period (days)</label>
              <input
                type="number"
                value={settings.security?.data?.dataRetention || 365}
                onChange={(e) => onChange({
                  ...settings,
                  security: {
                    ...settings.security,
                    data: { ...settings.security?.data, dataRetention: parseInt(e.target.value) }
                  }
                })}
                min="30"
                max="2555"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  );
};

export default SecuritySettings;