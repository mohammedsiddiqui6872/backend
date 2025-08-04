import React from 'react';
import { AlertCircle, User, Phone, Mail } from 'lucide-react';

interface EmergencyContactFormProps {
  formData: {
    profile?: {
      emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
        email?: string;
      };
    };
  };
  onChange: (field: string, value: any) => void;
}

export const EmergencyContactForm: React.FC<EmergencyContactFormProps> = ({
  formData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
        Emergency Contact
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.profile?.emergencyContact?.name || ''}
              onChange={(e) => onChange('profile.emergencyContact.name', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship
          </label>
          <input
            type="text"
            value={formData.profile?.emergencyContact?.relationship || ''}
            onChange={(e) => onChange('profile.emergencyContact.relationship', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Spouse, Parent, Sibling"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={formData.profile?.emergencyContact?.phone || ''}
              onChange={(e) => onChange('profile.emergencyContact.phone', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="+971 XX XXX XXXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={formData.profile?.emergencyContact?.email || ''}
              onChange={(e) => onChange('profile.emergencyContact.email', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="emergency@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
};