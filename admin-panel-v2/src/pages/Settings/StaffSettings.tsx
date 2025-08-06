import { FC } from 'react';
import { Users, Clock, Calendar, AlertCircle, DollarSign, Shield } from 'lucide-react';

interface StaffSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const StaffSettings: FC<StaffSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  return (
    <div className="space-y-6">
      {/* Shift Management */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Shift Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Shift Duration (hours)</label>
            <input
              type="number"
              value={settings.staff?.defaultShiftDuration || 8}
              onChange={(e) => onChange({
                ...settings,
                staff: { ...settings.staff, defaultShiftDuration: parseInt(e.target.value) }
              })}
              min="1"
              max="12"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Shifts Per Week</label>
            <input
              type="number"
              value={settings.staff?.maxShiftsPerWeek || 5}
              onChange={(e) => onChange({
                ...settings,
                staff: { ...settings.staff, maxShiftsPerWeek: parseInt(e.target.value) }
              })}
              min="1"
              max="7"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Rest Between Shifts (hours)</label>
            <input
              type="number"
              value={settings.staff?.minRestBetweenShifts || 8}
              onChange={(e) => onChange({
                ...settings,
                staff: { ...settings.staff, minRestBetweenShifts: parseInt(e.target.value) }
              })}
              min="6"
              max="24"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Clock-in Grace Period (minutes)</label>
            <input
              type="number"
              value={settings.staff?.clockInGracePeriod || 5}
              onChange={(e) => onChange({
                ...settings,
                staff: { ...settings.staff, clockInGracePeriod: parseInt(e.target.value) }
              })}
              min="0"
              max="30"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Time before/after shift to allow clock-in</p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.requirePhotoOnClock ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  staff: { ...settings.staff, requirePhotoOnClock: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Photo on Clock-in/Clock-out</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.requireLocationOnClock ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  staff: { ...settings.staff, requireLocationOnClock: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Location Verification for Clock-in</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.allowShiftSwapping ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  staff: { ...settings.staff, allowShiftSwapping: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow Shift Swapping Between Employees</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.autoApproveShiftSwaps ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  staff: { ...settings.staff, autoApproveShiftSwaps: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-approve Shift Swaps</span>
            </label>
          </div>
        </div>
      </div>

      {/* Break Policies */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Break Policies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Short Break Duration (minutes)</label>
            <input
              type="number"
              value={settings.staff?.breaks?.shortBreakDuration || 15}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  breaks: { ...settings.staff?.breaks, shortBreakDuration: parseInt(e.target.value) }
                }
              })}
              min="5"
              max="30"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Long Break Duration (minutes)</label>
            <input
              type="number"
              value={settings.staff?.breaks?.longBreakDuration || 30}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  breaks: { ...settings.staff?.breaks, longBreakDuration: parseInt(e.target.value) }
                }
              })}
              min="15"
              max="60"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Break After Hours</label>
            <input
              type="number"
              value={settings.staff?.breaks?.breakAfterHours || 4}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  breaks: { ...settings.staff?.breaks, breakAfterHours: parseInt(e.target.value) }
                }
              })}
              min="2"
              max="6"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Hours of work before mandatory break</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Consecutive Work Days</label>
            <input
              type="number"
              value={settings.staff?.breaks?.maxConsecutiveDays || 6}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  breaks: { ...settings.staff?.breaks, maxConsecutiveDays: parseInt(e.target.value) }
                }
              })}
              min="1"
              max="7"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.breaks?.paidBreaks ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  staff: {
                    ...settings.staff,
                    breaks: { ...settings.staff?.breaks, paidBreaks: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Breaks are Paid</span>
            </label>
          </div>
        </div>
      </div>

      {/* Overtime & Compensation */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Overtime & Compensation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Regular Hours Per Week</label>
            <input
              type="number"
              value={settings.staff?.overtime?.regularHoursPerWeek || 40}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  overtime: { ...settings.staff?.overtime, regularHoursPerWeek: parseInt(e.target.value) }
                }
              })}
              min="20"
              max="60"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Overtime Rate Multiplier</label>
            <input
              type="number"
              value={settings.staff?.overtime?.overtimeMultiplier || 1.5}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  overtime: { ...settings.staff?.overtime, overtimeMultiplier: parseFloat(e.target.value) }
                }
              })}
              min="1"
              max="3"
              step="0.25"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">e.g., 1.5x for time and a half</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Weekend Rate Multiplier</label>
            <input
              type="number"
              value={settings.staff?.overtime?.weekendMultiplier || 1.25}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  overtime: { ...settings.staff?.overtime, weekendMultiplier: parseFloat(e.target.value) }
                }
              })}
              min="1"
              max="3"
              step="0.25"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Holiday Rate Multiplier</label>
            <input
              type="number"
              value={settings.staff?.overtime?.holidayMultiplier || 2}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  overtime: { ...settings.staff?.overtime, holidayMultiplier: parseFloat(e.target.value) }
                }
              })}
              min="1"
              max="3"
              step="0.25"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.overtime?.autoCalculateOvertime ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  staff: {
                    ...settings.staff,
                    overtime: { ...settings.staff?.overtime, autoCalculateOvertime: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Automatically Calculate Overtime</span>
            </label>
          </div>
        </div>
      </div>

      {/* Leave Management */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          Leave Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Annual Leave Days</label>
            <input
              type="number"
              value={settings.staff?.leave?.annualLeaveDays || 21}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  leave: { ...settings.staff?.leave, annualLeaveDays: parseInt(e.target.value) }
                }
              })}
              min="0"
              max="365"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sick Leave Days</label>
            <input
              type="number"
              value={settings.staff?.leave?.sickLeaveDays || 10}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  leave: { ...settings.staff?.leave, sickLeaveDays: parseInt(e.target.value) }
                }
              })}
              min="0"
              max="365"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Advance Notice Days</label>
            <input
              type="number"
              value={settings.staff?.leave?.advanceNoticeDays || 7}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  leave: { ...settings.staff?.leave, advanceNoticeDays: parseInt(e.target.value) }
                }
              })}
              min="1"
              max="90"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Days notice required for leave requests</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Leave Accrual Period</label>
            <select
              value={settings.staff?.leave?.accrualPeriod || 'monthly'}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  leave: { ...settings.staff?.leave, accrualPeriod: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.staff?.leave?.allowCarryOver ?? true}
                onChange={(e) => onChange({
                  ...settings,
                  staff: {
                    ...settings.staff,
                    leave: { ...settings.staff?.leave, allowCarryOver: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow Leave Carry Over to Next Year</span>
            </label>

            {settings.staff?.leave?.allowCarryOver && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700">Max Carry Over Days</label>
                <input
                  type="number"
                  value={settings.staff?.leave?.maxCarryOverDays || 10}
                  onChange={(e) => onChange({
                    ...settings,
                    staff: {
                      ...settings.staff,
                      leave: { ...settings.staff?.leave, maxCarryOverDays: parseInt(e.target.value) }
                    }
                  })}
                  min="0"
                  max="30"
                  className="mt-1 block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Management */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Performance Management
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.staff?.performance?.enableReviews ?? true}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  performance: { ...settings.staff?.performance, enableReviews: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Performance Reviews</span>
          </label>

          {settings.staff?.performance?.enableReviews && (
            <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Review Frequency</label>
                <select
                  value={settings.staff?.performance?.reviewFrequency || 'quarterly'}
                  onChange={(e) => onChange({
                    ...settings,
                    staff: {
                      ...settings.staff,
                      performance: { ...settings.staff?.performance, reviewFrequency: e.target.value }
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannual">Bi-annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Min Rating Score</label>
                <input
                  type="number"
                  value={settings.staff?.performance?.minRatingScore || 1}
                  onChange={(e) => onChange({
                    ...settings,
                    staff: {
                      ...settings.staff,
                      performance: { ...settings.staff?.performance, minRatingScore: parseInt(e.target.value) }
                    }
                  })}
                  min="1"
                  max="10"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Rating Score</label>
                <input
                  type="number"
                  value={settings.staff?.performance?.maxRatingScore || 5}
                  onChange={(e) => onChange({
                    ...settings,
                    staff: {
                      ...settings.staff,
                      performance: { ...settings.staff?.performance, maxRatingScore: parseInt(e.target.value) }
                    }
                  })}
                  min="1"
                  max="10"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.staff?.performance?.trackAttendance ?? true}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  performance: { ...settings.staff?.performance, trackAttendance: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Track Attendance Metrics</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.staff?.performance?.trackPunctuality ?? true}
              onChange={(e) => onChange({
                ...settings,
                staff: {
                  ...settings.staff,
                  performance: { ...settings.staff?.performance, trackPunctuality: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Track Punctuality</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Staff Settings'}
        </button>
      </div>
    </div>
  );
};

export default StaffSettings;