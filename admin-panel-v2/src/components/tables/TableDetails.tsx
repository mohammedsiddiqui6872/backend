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
  Wrench,
  QrCode
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
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Table Number</p>
                    <p className="font-medium text-lg">{table.number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Display Name</p>
                    <p className="font-medium text-lg">{table.displayName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      table.status === 'available' ? 'bg-green-100 text-green-800' :
                      table.status === 'occupied' ? 'bg-red-100 text-red-800' :
                      table.status === 'reserved' ? 'bg-orange-100 text-orange-800' :
                      table.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {table.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      table.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {table.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{format(new Date(table.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">{format(new Date(table.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Type and Shape */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Type & Shape</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Table Type</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">
                        {table.type === 'vip' ? '👑' : 
                         table.type === 'outdoor' ? '🌳' :
                         table.type === 'private' ? '🔒' :
                         table.type === 'bar' ? '🍺' : '🪑'}
                      </span>
                      <span className="font-medium capitalize text-lg">{table.type}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Table Shape</p>
                    <div className={`inline-flex items-center justify-center w-16 h-16 border-2 border-gray-300 ${
                      table.shape === 'round' || table.shape === 'oval' ? 'rounded-full' : 'rounded-lg'
                    }`}>
                      <span className="text-xs font-medium text-gray-600">
                        {table.shape.toUpperCase()}
                      </span>
                    </div>
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
                  Location Details
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Floor</p>
                    <p className="font-medium capitalize text-lg">{table.location.floor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Section</p>
                    <p className="font-medium capitalize text-lg">{table.location.section}</p>
                  </div>
                  {table.location.zone && (
                    <div>
                      <p className="text-sm text-gray-500">Zone</p>
                      <p className="font-medium capitalize">{table.location.zone}</p>
                    </div>
                  )}
                  {table.location.x !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">X Position</p>
                      <p className="font-medium">{table.location.x}px</p>
                    </div>
                  )}
                  {table.location.y !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Y Position</p>
                      <p className="font-medium">{table.location.y}px</p>
                    </div>
                  )}
                  {table.location.rotation !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Rotation</p>
                      <p className="font-medium">{table.location.rotation}°</p>
                    </div>
                  )}
                  {table.location.width && (
                    <div>
                      <p className="text-sm text-gray-500">Width</p>
                      <p className="font-medium">{table.location.width}px</p>
                    </div>
                  )}
                  {table.location.height && (
                    <div>
                      <p className="text-sm text-gray-500">Height</p>
                      <p className="font-medium">{table.location.height}px</p>
                    </div>
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
              {(table.combination && (table.combination.isCombined || table.isCombinable)) || table.isCombinable ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    Combination Settings
                  </h3>
                  {table.combination?.isCombined ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium">
                            {table.combination.isMainTable ? 'Main Table' : 'Combined Table'}
                          </p>
                        </div>
                        {table.combination.arrangement && (
                          <div>
                            <p className="text-sm text-gray-500">Arrangement</p>
                            <p className="font-medium capitalize">{table.combination.arrangement}</p>
                          </div>
                        )}
                        {table.combination.totalCapacity && (
                          <div>
                            <p className="text-sm text-gray-500">Total Capacity</p>
                            <p className="font-medium">{table.combination.totalCapacity} guests</p>
                          </div>
                        )}
                        {table.combination.combinedAt && (
                          <div>
                            <p className="text-sm text-gray-500">Combined At</p>
                            <p className="font-medium">{format(new Date(table.combination.combinedAt), 'MMM dd, HH:mm')}</p>
                          </div>
                        )}
                      </div>
                      {table.combination.combinedTables && table.combination.combinedTables.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Combined Tables</p>
                          <div className="flex flex-wrap gap-2">
                            {table.combination.combinedTables.map((t) => (
                              <span key={t.tableId} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                                Table {t.tableNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-500">Combinable:</span>
                        <span className="ml-2 font-medium">{table.isCombinable ? 'Yes' : 'No'}</span>
                      </p>
                      {table.combinesWith && table.combinesWith.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Can combine with:</p>
                          <p className="font-medium">Tables {table.combinesWith.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {/* QR Code Info */}
              {table.qrCode && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">QR Code</p>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">{table.qrCode.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">URL</p>
                      <a 
                        href={table.qrCode.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm break-all"
                      >
                        {table.qrCode.url}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Service Info */}
              {(table.currentWaiter || table.activeCustomerSession) && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Current Service
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {table.currentWaiter && (
                      <div>
                        <p className="text-sm text-gray-500">Assigned Waiter</p>
                        <p className="font-medium">{table.currentWaiter.name}</p>
                      </div>
                    )}
                    {table.assistingWaiters && table.assistingWaiters.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Assisting Waiters</p>
                        <p className="font-medium">{table.assistingWaiters.map(w => w.name).join(', ')}</p>
                      </div>
                    )}
                    {table.activeCustomerSession && (
                      <div>
                        <p className="text-sm text-gray-500">Active Session</p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          IN SERVICE
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {table.metadata && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Info className="h-5 w-5 mr-2" />
                    Additional Information
                  </h3>
                  <div className="space-y-2">
                    {table.metadata.lastCleaned && (
                      <div>
                        <p className="text-sm text-gray-500">Last Cleaned</p>
                        <p className="font-medium">{format(new Date(table.metadata.lastCleaned), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    )}
                    {table.metadata.maintenanceNotes && (
                      <div>
                        <p className="text-sm text-gray-500">Maintenance Notes</p>
                        <p className="font-medium">{table.metadata.maintenanceNotes}</p>
                      </div>
                    )}
                    {table.metadata.preferredWaiters && table.metadata.preferredWaiters.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Preferred Waiters</p>
                        <p className="font-medium">{table.metadata.preferredWaiters.join(', ')}</p>
                      </div>
                    )}
                  </div>
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