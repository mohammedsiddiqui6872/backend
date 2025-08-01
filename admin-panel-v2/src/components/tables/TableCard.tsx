import { Edit, Trash2, Users, QrCode, Info, MoreVertical } from 'lucide-react';
import { Table, TableStatus } from '../../types/table';
import { useState } from 'react';

interface TableCardProps {
  table: Table;
  onEdit: () => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onUpdateStatus,
  onDelete,
  onViewDetails
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cleaning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = () => {
    switch (table.type) {
      case 'vip':
        return '👑';
      case 'outdoor':
        return '🌳';
      case 'private':
        return '🔒';
      case 'bar':
        return '🍺';
      default:
        return '🪑';
    }
  };

  const getShapeClass = () => {
    switch (table.shape) {
      case 'round':
      case 'oval':
        return 'rounded-full';
      case 'square':
        return 'rounded-lg';
      default:
        return 'rounded-lg';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow relative">
      {/* Table Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-12 h-12 flex items-center justify-center text-2xl ${getShapeClass()} ${getStatusColor(table.status)} border`}>
            {getTypeIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {table.displayName || `Table ${table.number}`}
            </h3>
            <p className="text-sm text-gray-500">
              {table.location.floor} - {table.location.section}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <button
                onClick={() => {
                  onEdit();
                  setShowActions(false);
                }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Table
              </button>
              <button
                onClick={() => {
                  onViewDetails();
                  setShowActions(false);
                }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <Info className="h-4 w-4 mr-2" />
                View Details
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Capacity:</span>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1 text-gray-400" />
            <span className="font-medium">
              {table.minCapacity && table.maxCapacity 
                ? `${table.minCapacity}-${table.maxCapacity}` 
                : table.capacity}
            </span>
          </div>
        </div>

        {table.currentWaiter && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Waiter:</span>
            <span className="font-medium">{table.currentWaiter.name}</span>
          </div>
        )}

        {table.features && table.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {table.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
              >
                {feature.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status Selector */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select
          value={table.status}
          onChange={(e) => onUpdateStatus(table._id, e.target.value as TableStatus)}
          className={`w-full px-3 py-1 text-sm border rounded-md ${getStatusColor(table.status)}`}
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="cleaning">Cleaning</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* QR Code Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <QrCode className="h-4 w-4 mr-1" />
            <span>QR Code</span>
          </div>
          {table.isCombinable && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              Combinable
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableCard;