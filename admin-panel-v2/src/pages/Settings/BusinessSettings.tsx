import { FC } from 'react';
import { Building, MapPin, Phone, Mail, Globe, Clock } from 'lucide-react';

interface BusinessSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const BusinessSettings: FC<BusinessSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const updateOperatingHours = (day: string, field: 'open' | 'close' | 'isClosed', value: any) => {
    const currentHours = settings.business?.operatingHours || [];
    const dayIndex = currentHours.findIndex((h: any) => h.day === day);
    
    if (dayIndex >= 0) {
      const updatedHours = [...currentHours];
      updatedHours[dayIndex] = { ...updatedHours[dayIndex], [field]: value };
      onChange({
        ...settings,
        business: { ...settings.business, operatingHours: updatedHours }
      });
    } else {
      onChange({
        ...settings,
        business: {
          ...settings.business,
          operatingHours: [...currentHours, { day, [field]: value, open: '09:00', close: '22:00' }]
        }
      });
    }
  };

  const getDayHours = (day: string) => {
    const hours = settings.business?.operatingHours?.find((h: any) => h.day === day);
    return hours || { open: '09:00', close: '22:00', isClosed: false };
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Business Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Phone</label>
            <input
              type="tel"
              value={settings.business?.phone || ''}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, phone: e.target.value }
              })}
              placeholder="+971 XX XXX XXXX"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Business Email</label>
            <input
              type="email"
              value={settings.business?.email || ''}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, email: e.target.value }
              })}
              placeholder="info@restaurant.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              type="url"
              value={settings.business?.website || ''}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, website: e.target.value }
              })}
              placeholder="https://www.restaurant.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Number</label>
            <input
              type="text"
              value={settings.business?.taxNumber || ''}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, taxNumber: e.target.value }
              })}
              placeholder="Tax/VAT Number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Number</label>
            <input
              type="text"
              value={settings.business?.registrationNumber || ''}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, registrationNumber: e.target.value }
              })}
              placeholder="Business Registration Number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">VAT Rate (%)</label>
            <input
              type="number"
              value={settings.business?.vatRate || 5}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, vatRate: parseFloat(e.target.value) }
              })}
              min="0"
              max="100"
              step="0.5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Service Charge (%)</label>
            <input
              type="number"
              value={settings.business?.serviceChargeRate || 0}
              onChange={(e) => onChange({
                ...settings,
                business: { ...settings.business, serviceChargeRate: parseFloat(e.target.value) }
              })}
              min="0"
              max="100"
              step="0.5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Business Address */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Business Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Street Address</label>
            <input
              type="text"
              value={settings.business?.address?.street || ''}
              onChange={(e) => onChange({
                ...settings,
                business: {
                  ...settings.business,
                  address: { ...settings.business?.address, street: e.target.value }
                }
              })}
              placeholder="123 Main Street"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              value={settings.business?.address?.city || ''}
              onChange={(e) => onChange({
                ...settings,
                business: {
                  ...settings.business,
                  address: { ...settings.business?.address, city: e.target.value }
                }
              })}
              placeholder="Dubai"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">State/Emirate</label>
            <input
              type="text"
              value={settings.business?.address?.state || ''}
              onChange={(e) => onChange({
                ...settings,
                business: {
                  ...settings.business,
                  address: { ...settings.business?.address, state: e.target.value }
                }
              })}
              placeholder="Dubai"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input
              type="text"
              value={settings.business?.address?.country || ''}
              onChange={(e) => onChange({
                ...settings,
                business: {
                  ...settings.business,
                  address: { ...settings.business?.address, country: e.target.value }
                }
              })}
              placeholder="United Arab Emirates"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Postal Code</label>
            <input
              type="text"
              value={settings.business?.address?.postalCode || ''}
              onChange={(e) => onChange({
                ...settings,
                business: {
                  ...settings.business,
                  address: { ...settings.business?.address, postalCode: e.target.value }
                }
              })}
              placeholder="12345"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Operating Hours
        </h3>
        <div className="space-y-2">
          {days.map(day => {
            const hours = getDayHours(day);
            return (
              <div key={day} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-32">
                  <span className="text-sm font-medium capitalize">{day}</span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!hours.isClosed}
                    onChange={(e) => updateOperatingHours(day, 'isClosed', !e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm">Open</span>
                </label>

                {!hours.isClosed && (
                  <>
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </>
                )}

                {hours.isClosed && (
                  <span className="text-gray-500 text-sm">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <span>{saving ? 'Saving...' : 'Save Business Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default BusinessSettings;