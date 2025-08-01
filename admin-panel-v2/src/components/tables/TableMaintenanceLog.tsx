import { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  X,
  Save,
  Loader2
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { format } from 'date-fns';

interface MaintenanceLog {
  _id: string;
  tableId: string;
  tableNumber: string;
  type: string;
  priority: string;
  status: string;
  scheduledDate: string;
  scheduledDuration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number;
  description: string;
  assignedTo?: {
    name: string;
    role: string;
  };
  performedBy?: Array<{
    name: string;
    role: string;
  }>;
  totalCost: number;
  conditionBefore?: {
    overall: number;
    cleanliness: number;
    functionality: number;
    appearance: number;
  };
  conditionAfter?: {
    overall: number;
    cleanliness: number;
    functionality: number;
    appearance: number;
  };
  completedAt?: string;
  createdAt: string;
}

interface TableMaintenanceLogProps {
  tableId: string;
}

const TableMaintenanceLog: React.FC<TableMaintenanceLogProps> = ({ tableId }) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchMaintenanceLogs();
  }, [tableId]);

  const fetchMaintenanceLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/tables/${tableId}/maintenance`);
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'scheduled': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'postponed': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cleaning: 'Regular Cleaning',
      deep_cleaning: 'Deep Cleaning',
      repair: 'Repair',
      inspection: 'Inspection',
      setup_change: 'Setup Change',
      furniture_replacement: 'Furniture Replacement',
      equipment_check: 'Equipment Check',
      sanitization: 'Sanitization',
      damage_assessment: 'Damage Assessment',
      routine_maintenance: 'Routine Maintenance',
      emergency_maintenance: 'Emergency Maintenance'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Maintenance History</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </button>
      </div>

      {/* Upcoming Maintenance Alert */}
      {logs.some(log => log.status === 'scheduled' && new Date(log.scheduledDate) > new Date()) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Upcoming Maintenance</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This table has scheduled maintenance. Please plan accordingly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Logs */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No maintenance history found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              Schedule first maintenance
            </button>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log._id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedLog(log);
                setShowDetailModal(true);
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {getMaintenanceTypeLabel(log.type)}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(log.status)}`}>
                      {log.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(log.priority)}`}>
                      {log.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(log.scheduledDate), 'MMM dd, yyyy')}
                    </div>
                    {log.scheduledDuration && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {log.scheduledDuration} min
                      </div>
                    )}
                    {log.totalCost > 0 && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatCurrency(log.totalCost)}
                      </div>
                    )}
                    {log.assignedTo && (
                      <div className="flex items-center">
                        <span className="mr-1">Assigned to:</span>
                        {log.assignedTo.name}
                      </div>
                    )}
                  </div>
                </div>
                
                {log.status === 'completed' && log.conditionAfter && (
                  <div className="ml-4 text-right">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 mr-2">Condition:</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full mr-1 ${
                              i < (log.conditionAfter?.overall || 0)
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Maintenance Modal */}
      {showCreateModal && (
        <MaintenanceModal
          tableId={tableId}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            fetchMaintenanceLogs();
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <MaintenanceDetailModal
          log={selectedLog}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLog(null);
          }}
          onUpdate={() => {
            fetchMaintenanceLogs();
          }}
        />
      )}
    </div>
  );
};

// Maintenance Creation Modal
const MaintenanceModal: React.FC<{
  tableId: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ tableId, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'cleaning',
    priority: 'medium',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledDuration: 30,
    isRecurring: false,
    recurringSchedule: {
      frequency: 'weekly',
      endDate: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`/admin/table-service-history/tables/${tableId}/maintenance`, formData);
      onSave();
    } catch (error) {
      console.error('Error creating maintenance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Maintenance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="cleaning">Regular Cleaning</option>
              <option value="deep_cleaning">Deep Cleaning</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="sanitization">Sanitization</option>
              <option value="routine_maintenance">Routine Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.scheduledDuration}
                onChange={(e) => setFormData({ ...formData, scheduledDuration: parseInt(e.target.value) })}
                min="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Recurring maintenance</span>
            </label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.recurringSchedule.frequency}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurringSchedule: { ...formData.recurringSchedule, frequency: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.recurringSchedule.endDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurringSchedule: { ...formData.recurringSchedule, endDate: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Maintenance Detail Modal
const MaintenanceDetailModal: React.FC<{
  log: MaintenanceLog;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ log, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const getMaintenanceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cleaning: 'Regular Cleaning',
      deep_cleaning: 'Deep Cleaning',
      repair: 'Repair',
      inspection: 'Inspection',
      setup_change: 'Setup Change',
      furniture_replacement: 'Furniture Replacement',
      equipment_check: 'Equipment Check',
      sanitization: 'Sanitization',
      damage_assessment: 'Damage Assessment',
      routine_maintenance: 'Routine Maintenance',
      emergency_maintenance: 'Emergency Maintenance'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'scheduled': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'postponed': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await api.post(`/admin/table-service-history/maintenance/${log._id}/complete`, {
        conditionAfter: 4,
        completionNotes: 'Maintenance completed successfully'
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error completing maintenance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Maintenance Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium">{getMaintenanceTypeLabel(log.type)}</span>
              </div>
              <div>
                <span className="text-gray-500">Priority:</span>
                <span className={`ml-2 font-medium ${getPriorityColor(log.priority)}`}>
                  {log.priority.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(log.status)}`}>
                  {log.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Table:</span>
                <span className="ml-2 font-medium">Table {log.tableNumber}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{log.description}</p>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Schedule</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Scheduled Date:</span>
                <span className="ml-2">{format(new Date(log.scheduledDate), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2">{log.scheduledDuration} minutes</span>
              </div>
              {log.actualStartTime && (
                <>
                  <div>
                    <span className="text-gray-500">Actual Start:</span>
                    <span className="ml-2">{format(new Date(log.actualStartTime), 'HH:mm')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Actual Duration:</span>
                    <span className="ml-2">{log.actualDuration} minutes</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cost */}
          {log.totalCost > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Cost</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(log.totalCost)}</p>
            </div>
          )}

          {/* Actions */}
          {log.status === 'scheduled' && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Maintenance
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableMaintenanceLog;