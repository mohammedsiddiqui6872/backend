import { useState } from 'react';
import { Save, Store, Clock, CreditCard } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your restaurant settings and preferences
        </p>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Store className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Restaurant Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Restaurant configuration and settings coming soon.
        </p>
      </div>
    </div>
  );
};

export default Settings;