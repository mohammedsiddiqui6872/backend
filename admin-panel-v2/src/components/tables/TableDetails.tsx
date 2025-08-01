import { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  DollarSign, 
  Activity,
  Info,
  MapPin,
  Layers,
  Package,
  Shield,
  Wrench
} from 'lucide-react';
import { Table } from '../../types/table';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { format } from 'date-fns';
import TableMaintenanceLog from './TableMaintenanceLog';

interface TableDetailsProps {
  table: Table;
  onClose: () => void;
}

const TableDetails: React.FC<TableDetailsProps> = ({ table, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'statistics' | 'maintenance'>('info');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchTableStats();
    }
  }, [activeTab]);

  const fetchTableStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/table-service-history/tables/${table._id}/analytics`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching table stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      window_view: 'Window View',
      wheelchair_accessible: 'Wheelchair Accessible',
      power_outlet: 'Power Outlet',
      privacy_screen: 'Privacy Screen',
      outdoor_heater: 'Outdoor Heater',
      shade_umbrella: 'Shade Umbrella'
    };
    return labels[feature] || feature;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {table.displayName || `Table ${table.number}`}
            </h2>
            <p className="text-gray-600 mt-1">
              Detailed information and analytics
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'info'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Info className="h-4 w-4 inline-block mr-2" />
              Information
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'statistics'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity className="h-4 w-4 inline-block mr-2" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'maintenance'
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wrench className="h-4 w-4 inline-block mr-2" />
              Maintenance
            </button>
          </nav>
        </div>

        {/* Content */}
        <div>
          {/* Information Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Table Number</p>
                    <p className="font-medium">{table.number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Display Name</p>
                    <p className="font-medium">{table.displayName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium capitalize">{table.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Shape</p>
                    <p className="font-medium capitalize">{table.shape}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Status</p>
                    <p className="font-medium capitalize">{table.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="font-medium">{table.isActive ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Capacity
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Standard</p>
                    <p className="text-2xl font-bold">{table.capacity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Minimum</p>
                    <p className="text-2xl font-bold">{table.minCapacity || table.capacity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maximum</p>
                    <p className="text-2xl font-bold">{table.maxCapacity || table.capacity}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Location
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Floor</p>
                    <p className="font-medium capitalize">{table.location.floor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Section</p>
                    <p className="font-medium capitalize">{table.location.section}</p>
                  </div>
                  {table.location.x !== undefined && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">X Position</p>
                        <p className="font-medium">{table.location.x}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Y Position</p>
                        <p className="font-medium">{table.location.y}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Features */}
              {table.features && table.features.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {table.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {getFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Combination Info */}
              {table.combination && (table.combination.isCombined || table.isCombinable) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    Combination
                  </h3>
                  {table.combination.isCombined ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-2 font-medium">
                          {table.combination.isMainTable ? 'Main Table' : 'Combined Table'}
                        </span>
                      </p>
                      {table.combination.combinedTables && table.combination.combinedTables.length > 0 && (
                        <p className="text-sm">
                          <span className="text-gray-500">Combined with:</span>
                          <span className="ml-2 font-medium">
                            Tables {table.combination.combinedTables.map(t => t.tableNumber).join(', ')}
                          </span>
                        </p>
                      )}
                      {table.combination.totalCapacity && (
                        <p className="text-sm">
                          <span className="text-gray-500">Total Capacity:</span>
                          <span className="ml-2 font-medium">{table.combination.totalCapacity}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">This table can be combined with other tables</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-blue-600">Total Services</p>
                        <Activity className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.summary.totalServices}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-green-600">Total Revenue</p>
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.summary.totalRevenue)}</p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-purple-600">Avg Duration</p>
                        <Clock className="h-5 w-5 text-purple-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.summary.avgDuration} min</p>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Guests</p>
                        <p className="font-medium text-lg">{stats.summary.totalGuests}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Order Value</p>
                        <p className="font-medium text-lg">{formatCurrency(stats.summary.avgOrderValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Rating</p>
                        <p className="font-medium text-lg">{stats.summary.avgRating.toFixed(1)} ⭐</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Tips</p>
                        <p className="font-medium text-lg">{stats.summary.avgTipPercentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Table Stats from model */}
                  {table.stats && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-4">Table Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Total Sessions</p>
                          <p className="font-medium text-lg">{table.stats.totalSessions || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Revenue</p>
                          <p className="font-medium text-lg">{formatCurrency(table.stats.totalRevenue || 0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg Occupancy Time</p>
                          <p className="font-medium text-lg">{table.stats.averageOccupancyTime || 0} min</p>
                        </div>
                        {table.stats.lastOccupied && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Last Occupied</p>
                            <p className="font-medium">{format(new Date(table.stats.lastOccupied), 'PPp')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No statistics available yet</p>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <TableMaintenanceLog tableId={table._id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TableDetails;