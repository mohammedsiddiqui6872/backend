import React from 'react';
import { Building, UserCheck, CreditCard } from 'lucide-react';

interface EmploymentInfoFormProps {
  formData: {
    role: string;
    profile?: {
      employeeId?: string;
      department?: string;
      position?: string;
      joiningDate?: string;
      salary?: {
        amount?: number;
        currency?: string;
        type?: string;
      };
    };
  };
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

const departments = [
  'Kitchen',
  'Service',
  'Management',
  'Bar',
  'Reception',
  'Housekeeping',
  'Maintenance'
];

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'line_cook', label: 'Line Cook' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'host', label: 'Host' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'cleaner', label: 'Cleaner' }
];

export const EmploymentInfoForm: React.FC<EmploymentInfoFormProps> = ({
  formData,
  onChange,
  errors = {}
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Building className="h-5 w-5 mr-2" />
        Employment Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID
          </label>
          <input
            type="text"
            value={formData.profile?.employeeId || ''}
            onChange={(e) => onChange('profile.employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., EMP001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <div className="relative">
            <UserCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={formData.role}
              onChange={(e) => onChange('role', e.target.value)}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                errors.role ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {errors.role && (
            <p className="text-red-500 text-xs mt-1">{errors.role}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            value={formData.profile?.department || ''}
            onChange={(e) => onChange('profile.department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Position
          </label>
          <input
            type="text"
            value={formData.profile?.position || ''}
            onChange={(e) => onChange('profile.position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Head Chef"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Joining Date
          </label>
          <input
            type="date"
            value={formData.profile?.joiningDate || ''}
            onChange={(e) => onChange('profile.joiningDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Salary Type
          </label>
          <select
            value={formData.profile?.salary?.type || ''}
            onChange={(e) => onChange('profile.salary.type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Type</option>
            <option value="monthly">Monthly</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Salary Amount
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="number"
              value={formData.profile?.salary?.amount || ''}
              onChange={(e) => onChange('profile.salary.amount', parseFloat(e.target.value))}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.profile?.salary?.currency || 'AED'}
            onChange={(e) => onChange('profile.salary.currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>
    </div>
  );
};