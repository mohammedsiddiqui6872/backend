import { useState } from 'react';
import { Plus, QrCode, Grid3X3 } from 'lucide-react';

const Tables = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Table Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage restaurant tables and generate QR codes
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </button>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Table Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Table management and QR code generation coming soon.
        </p>
      </div>
    </div>
  );
};

export default Tables;