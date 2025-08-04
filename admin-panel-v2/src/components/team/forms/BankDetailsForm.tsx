import React from 'react';
import { CreditCard, Building2 } from 'lucide-react';

interface BankDetailsFormProps {
  formData: {
    profile?: {
      bankDetails?: {
        accountName?: string;
        accountNumber?: string;
        bankName?: string;
        iban?: string;
      };
    };
  };
  onChange: (field: string, value: any) => void;
}

export const BankDetailsForm: React.FC<BankDetailsFormProps> = ({
  formData,
  onChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <CreditCard className="h-5 w-5 mr-2" />
        Bank Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name
          </label>
          <input
            type="text"
            value={formData.profile?.bankDetails?.accountName || ''}
            onChange={(e) => onChange('profile.bankDetails.accountName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Account holder name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            value={formData.profile?.bankDetails?.accountNumber || ''}
            onChange={(e) => onChange('profile.bankDetails.accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="XXXX XXXX XXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.profile?.bankDetails?.bankName || ''}
              onChange={(e) => onChange('profile.bankDetails.bankName', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Emirates NBD"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IBAN
          </label>
          <input
            type="text"
            value={formData.profile?.bankDetails?.iban || ''}
            onChange={(e) => onChange('profile.bankDetails.iban', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="AE XX XXXX XXXX XXXX XXXX XXX"
          />
        </div>
      </div>
    </div>
  );
};