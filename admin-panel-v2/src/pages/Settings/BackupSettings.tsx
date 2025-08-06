import { FC, useState } from 'react';
import { Database, Download, Upload, Clock, Shield, AlertTriangle, CheckCircle, CloudOff } from 'lucide-react';

interface BackupSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const BackupSettings: FC<BackupSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  const [performingBackup, setPerformingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [lastBackupStatus, setLastBackupStatus] = useState<{ success: boolean; message: string } | null>(null);

  const performManualBackup = async () => {
    setPerformingBackup(true);
    setLastBackupStatus(null);
    
    // Simulate backup
    setTimeout(() => {
      setLastBackupStatus({
        success: true,
        message: `Backup completed successfully at ${new Date().toLocaleString()}`
      });
      setPerformingBackup(false);
    }, 3000);
  };

  const restoreFromBackup = async () => {
    if (!window.confirm('Are you sure you want to restore from backup? This will replace all current data.')) {
      return;
    }
    
    setRestoringBackup(true);
    // Simulate restore
    setTimeout(() => {
      setRestoringBackup(false);
      alert('Restore completed successfully');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Automatic Backups */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Automatic Backups
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
            <select
              value={settings.backup?.frequency || 'daily'}
              onChange={(e) => onChange({
                ...settings,
                backup: { ...settings.backup, frequency: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Backup Time</label>
            <input
              type="time"
              value={settings.backup?.time || '02:00'}
              onChange={(e) => onChange({
                ...settings,
                backup: { ...settings.backup, time: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Time when daily/weekly backups run</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Retention Period (days)</label>
            <input
              type="number"
              value={settings.backup?.retentionDays || 30}
              onChange={(e) => onChange({
                ...settings,
                backup: { ...settings.backup, retentionDays: parseInt(e.target.value) }
              })}
              min="7"
              max="365"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">How long to keep backup files</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Backup Size (GB)</label>
            <input
              type="number"
              value={settings.backup?.maxSizeGB || 10}
              onChange={(e) => onChange({
                ...settings,
                backup: { ...settings.backup, maxSizeGB: parseInt(e.target.value) }
              })}
              min="1"
              max="100"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.enabled ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  backup: { ...settings.backup, enabled: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Automatic Backups</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.encryptBackups ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  backup: { ...settings.backup, encryptBackups: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Encrypt Backup Files</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.compressBackups ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  backup: { ...settings.backup, compressBackups: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Compress Backup Files</span>
            </label>
          </div>
        </div>
      </div>

      {/* Backup Storage */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Backup Storage
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Storage Provider</label>
            <select
              value={settings.backup?.storage?.provider || 'local'}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  storage: { ...settings.backup?.storage, provider: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="local">Local Storage</option>
              <option value="aws">Amazon S3</option>
              <option value="google">Google Cloud Storage</option>
              <option value="azure">Azure Blob Storage</option>
              <option value="dropbox">Dropbox</option>
            </select>
          </div>

          {settings.backup?.storage?.provider === 'aws' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">S3 Bucket Name</label>
                <input
                  type="text"
                  value={settings.backup?.storage?.s3Bucket || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    backup: {
                      ...settings.backup,
                      storage: { ...settings.backup?.storage, s3Bucket: e.target.value }
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">AWS Region</label>
                <input
                  type="text"
                  value={settings.backup?.storage?.awsRegion || ''}
                  onChange={(e) => onChange({
                    ...settings,
                    backup: {
                      ...settings.backup,
                      storage: { ...settings.backup?.storage, awsRegion: e.target.value }
                    }
                  })}
                  placeholder="us-east-1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.storage?.redundantStorage ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  backup: {
                    ...settings.backup,
                    storage: { ...settings.backup?.storage, redundantStorage: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Redundant Storage (Multiple Locations)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.storage?.offsite ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  backup: {
                    ...settings.backup,
                    storage: { ...settings.backup?.storage, offsite: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Offsite Backup Copy</span>
            </label>
          </div>
        </div>
      </div>

      {/* Backup Content */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Backup Content
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup?.content?.database ?? true}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  content: { ...settings.backup?.content, database: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Database</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup?.content?.uploads ?? true}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  content: { ...settings.backup?.content, uploads: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Uploaded Files & Images</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup?.content?.logs ?? false}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  content: { ...settings.backup?.content, logs: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">System Logs</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup?.content?.configurations ?? true}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  content: { ...settings.backup?.content, configurations: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Settings & Configurations</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup?.content?.analytics ?? false}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  content: { ...settings.backup?.content, analytics: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Analytics Data</span>
          </label>
        </div>
      </div>

      {/* Manual Backup */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Manual Backup & Restore
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Create Manual Backup</h4>
              <p className="text-sm text-gray-500">Create an immediate backup of all data</p>
            </div>
            <button
              onClick={performManualBackup}
              disabled={performingBackup}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{performingBackup ? 'Creating Backup...' : 'Backup Now'}</span>
            </button>
          </div>

          {lastBackupStatus && (
            <div className={`p-3 rounded-lg flex items-center ${
              lastBackupStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {lastBackupStatus.message}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Restore from Backup</h4>
              <p className="text-sm text-gray-500">Restore data from a previous backup</p>
            </div>
            <button
              onClick={restoreFromBackup}
              disabled={restoringBackup}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>{restoringBackup ? 'Restoring...' : 'Restore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Backups</h3>
        <div className="space-y-2">
          {[
            { date: '2025-01-06 02:00', size: '2.3 GB', status: 'success' },
            { date: '2025-01-05 02:00', size: '2.2 GB', status: 'success' },
            { date: '2025-01-04 02:00', size: '2.3 GB', status: 'success' },
            { date: '2025-01-03 02:00', size: '2.1 GB', status: 'failed' },
            { date: '2025-01-02 02:00', size: '2.2 GB', status: 'success' },
          ].map((backup, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {backup.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-sm">{backup.date}</p>
                  <p className="text-xs text-gray-500">{backup.size}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-purple-600 hover:text-purple-700">
                  Download
                </button>
                <span className="text-gray-300">|</span>
                <button className="text-sm text-red-600 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disaster Recovery */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <CloudOff className="h-5 w-5 mr-2" />
          Disaster Recovery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Recovery Time Objective (hours)</label>
            <input
              type="number"
              value={settings.backup?.disaster?.rto || 4}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  disaster: { ...settings.backup?.disaster, rto: parseInt(e.target.value) }
                }
              })}
              min="1"
              max="72"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Max time to restore service</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Recovery Point Objective (hours)</label>
            <input
              type="number"
              value={settings.backup?.disaster?.rpo || 1}
              onChange={(e) => onChange({
                ...settings,
                backup: {
                  ...settings.backup,
                  disaster: { ...settings.backup?.disaster, rpo: parseInt(e.target.value) }
                }
              })}
              min="1"
              max="24"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Max acceptable data loss</p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backup?.disaster?.enableFailover ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  backup: {
                    ...settings.backup,
                    disaster: { ...settings.backup?.disaster, enableFailover: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Automatic Failover</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Backup Settings'}
        </button>
      </div>
    </div>
  );
};

export default BackupSettings;