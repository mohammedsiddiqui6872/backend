import { FC } from 'react';
import { Users, Clock, Calendar, QrCode, CreditCard } from 'lucide-react';

interface TableSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const TableSettings: FC<TableSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  return (
    <div className="space-y-6">
      {/* Reservation Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Reservation Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.tables?.enableReservations ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  tables: { ...settings.tables, enableReservations: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Table Reservations</span>
            </label>
          </div>

          {settings.tables?.enableReservations && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reservation Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.tables?.reservationDuration || 120}
                  onChange={(e) => onChange({
                    ...settings,
                    tables: { ...settings.tables, reservationDuration: parseInt(e.target.value) }
                  })}
                  min="30"
                  max="240"
                  step="15"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Default time slot for reservations</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Buffer Time (minutes)</label>
                <input
                  type="number"
                  value={settings.tables?.bufferTime || 15}
                  onChange={(e) => onChange({
                    ...settings,
                    tables: { ...settings.tables, bufferTime: parseInt(e.target.value) }
                  })}
                  min="0"
                  max="60"
                  step="5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Time between reservations for cleaning</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Party Size</label>
                <input
                  type="number"
                  value={settings.tables?.maxPartySize || 20}
                  onChange={(e) => onChange({
                    ...settings,
                    tables: { ...settings.tables, maxPartySize: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="50"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Auto-Release Time (minutes)</label>
                <input
                  type="number"
                  value={settings.tables?.autoReleaseTime || 15}
                  onChange={(e) => onChange({
                    ...settings,
                    tables: { ...settings.tables, autoReleaseTime: parseInt(e.target.value) }
                  })}
                  min="5"
                  max="60"
                  step="5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Release reservation after no-show</p>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.tables?.requireDeposit ?? false}
                    onChange={(e) => onChange({
                      ...settings,
                      tables: { ...settings.tables, requireDeposit: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Deposit for Reservations</span>
                </label>
                {settings.tables?.requireDeposit && (
                  <div className="mt-2 ml-6">
                    <label className="block text-sm font-medium text-gray-700">Deposit Amount</label>
                    <div className="mt-1 flex items-center space-x-2 max-w-xs">
                      <span className="text-gray-500">{settings.general?.currencySymbol || 'AED'}</span>
                      <input
                        type="number"
                        value={settings.tables?.depositAmount || 50}
                        onChange={(e) => onChange({
                          ...settings,
                          tables: { ...settings.tables, depositAmount: parseFloat(e.target.value) }
                        })}
                        min="0"
                        step="5"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table Management Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Table Management
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tables?.enableWaitlist ?? true}
              onChange={(e) => onChange({
                ...settings,
                tables: { ...settings.tables, enableWaitlist: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Waitlist</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tables?.enableTableCombining ?? true}
              onChange={(e) => onChange({
                ...settings,
                tables: { ...settings.tables, enableTableCombining: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Table Combining</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tables?.autoAssignTables ?? false}
              onChange={(e) => onChange({
                ...settings,
                tables: { ...settings.tables, autoAssignTables: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-Assign Tables to Walk-ins</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tables?.trackTableTurnover ?? true}
              onChange={(e) => onChange({
                ...settings,
                tables: { ...settings.tables, trackTableTurnover: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Track Table Turnover Time</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.tables?.enableTableStatus ?? true}
              onChange={(e) => onChange({
                ...settings,
                tables: { ...settings.tables, enableTableStatus: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show Real-time Table Status</span>
          </label>
        </div>
      </div>

      {/* QR Code Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          QR Code Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">QR Code Size (pixels)</label>
            <input
              type="number"
              value={settings.tables?.qrCodeStyle?.size || 200}
              onChange={(e) => onChange({
                ...settings,
                tables: {
                  ...settings.tables,
                  qrCodeStyle: {
                    ...settings.tables?.qrCodeStyle,
                    size: parseInt(e.target.value)
                  }
                }
              })}
              min="100"
              max="500"
              step="50"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">QR Code Margin</label>
            <input
              type="number"
              value={settings.tables?.qrCodeStyle?.margin || 4}
              onChange={(e) => onChange({
                ...settings,
                tables: {
                  ...settings.tables,
                  qrCodeStyle: {
                    ...settings.tables?.qrCodeStyle,
                    margin: parseInt(e.target.value)
                  }
                }
              })}
              min="0"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dark Color</label>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="color"
                value={settings.tables?.qrCodeStyle?.darkColor || '#000000'}
                onChange={(e) => onChange({
                  ...settings,
                  tables: {
                    ...settings.tables,
                    qrCodeStyle: {
                      ...settings.tables?.qrCodeStyle,
                      darkColor: e.target.value
                    }
                  }
                })}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.tables?.qrCodeStyle?.darkColor || '#000000'}
                onChange={(e) => onChange({
                  ...settings,
                  tables: {
                    ...settings.tables,
                    qrCodeStyle: {
                      ...settings.tables?.qrCodeStyle,
                      darkColor: e.target.value
                    }
                  }
                })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Light Color</label>
            <div className="mt-1 flex items-center space-x-2">
              <input
                type="color"
                value={settings.tables?.qrCodeStyle?.lightColor || '#FFFFFF'}
                onChange={(e) => onChange({
                  ...settings,
                  tables: {
                    ...settings.tables,
                    qrCodeStyle: {
                      ...settings.tables?.qrCodeStyle,
                      lightColor: e.target.value
                    }
                  }
                })}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.tables?.qrCodeStyle?.lightColor || '#FFFFFF'}
                onChange={(e) => onChange({
                  ...settings,
                  tables: {
                    ...settings.tables,
                    qrCodeStyle: {
                      ...settings.tables?.qrCodeStyle,
                      lightColor: e.target.value
                    }
                  }
                })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.tables?.qrCodeStyle?.includeLogo ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  tables: {
                    ...settings.tables,
                    qrCodeStyle: {
                      ...settings.tables?.qrCodeStyle,
                      includeLogo: e.target.checked
                    }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Include Logo in QR Code</span>
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
          {saving ? 'Saving...' : 'Save Table Settings'}
        </button>
      </div>
    </div>
  );
};

export default TableSettings;