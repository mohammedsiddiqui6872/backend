import React from 'react';
import { MapPin, Home } from 'lucide-react';

interface AddressFormProps {
  formData: {
    profile?: {
      address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
      };
    };
  };
  onChange: (field: string, value: any) => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  formData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <MapPin className="h-5 w-5 mr-2" />
        Address Information
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.profile?.address?.street || ''}
              onChange={(e) => onChange('profile.address.street', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="123 Main Street, Apt 4B"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.profile?.address?.city || ''}
              onChange={(e) => onChange('profile.address.city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Dubai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Emirate
            </label>
            <input
              type="text"
              value={formData.profile?.address?.state || ''}
              onChange={(e) => onChange('profile.address.state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Dubai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.profile?.address?.country || ''}
              onChange={(e) => onChange('profile.address.country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="United Arab Emirates"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.profile?.address?.postalCode || ''}
              onChange={(e) => onChange('profile.address.postalCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="12345"
            />
          </div>
        </div>
      </div>
    </div>
  );
};