import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, AlertCircle, X, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TableStatusRule {
  _id: string;
  name: string;
  description: string;
  triggerEvent: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    config: { [key: string]: any };
  }>;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const TableStatusRules: React.FC = () => {
  const [rules, setRules] = useState<TableStatusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TableStatusRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get('/admin/table-status-rules');

      if (response.data.success) {
        setRules(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string) => {
    try {
      const response = await api.patch(`/admin/table-status-rules/${ruleId}/toggle`, {});

      if (response.data.success) {
        toast.success(response.data.message);
        fetchRules();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await api.delete(`/admin/table-status-rules/${ruleId}`);

      if (response.data.success) {
        toast.success(response.data.message);
        fetchRules();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete rule');
    }
  };

  const moveRule = async (ruleId: string, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex(r => r._id === ruleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newRules = [...rules];
    const temp = newRules[currentIndex];
    newRules[currentIndex] = newRules[newIndex];
    newRules[newIndex] = temp;

    // Update order
    const ruleIds = newRules.map(r => r._id);

    try {
      const response = await api.post('/admin/table-status-rules/reorder', 
        { ruleIds }
      );

      if (response.data.success) {
        setRules(newRules);
        toast.success('Rule priority updated');
      }
    } catch (error: any) {
      toast.error('Failed to update rule priority');
    }
  };

  const getTriggerEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      'order_placed': 'Order Placed',
      'payment_completed': 'Payment Completed',
      'table_reserved': 'Table Reserved',
      'status_changed': 'Status Changed',
      'session_check': 'Session Check',
      'manual_trigger': 'Manual Trigger'
    };
    return labels[event] || event;
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'change_status': 'Change Status',
      'send_notification': 'Send Notification',
      'assign_waiter': 'Assign Waiter',
      'create_alert': 'Create Alert',
      'start_timer': 'Start Timer'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Table Status Rules</h2>
          <p className="text-gray-600 mt-1">Automate table status changes based on events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add Rule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            Rules are evaluated in priority order (highest first)
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No rules configured. Add a rule to automate table status management.
            </div>
          ) : (
            rules.map((rule, index) => (
              <div key={rule._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                      {rule.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Default
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">Trigger:</span>
                        <span className="ml-2 font-medium">{getTriggerEventLabel(rule.triggerEvent)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority:</span>
                        <span className="ml-2 font-medium">{rule.priority}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Conditions:</span>
                        <span className="ml-2 font-medium">{rule.conditions.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Actions:</span>
                        <span className="ml-2 font-medium">
                          {rule.actions.map(a => getActionTypeLabel(a.type)).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => moveRule(rule._id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Increase priority"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveRule(rule._id, 'down')}
                      disabled={index === rules.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Decrease priority"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleRule(rule._id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!rule.isDefault && (
                      <button
                        onClick={() => deleteRule(rule._id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rule Editor Modal */}
      {(showCreateModal || editingRule) && (
        <RuleEditorModal
          rule={editingRule}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingRule(null);
            fetchRules();
          }}
        />
      )}
    </div>
  );
};

// Rule Editor Modal Component
interface RuleEditorModalProps {
  rule: TableStatusRule | null;
  onClose: () => void;
  onSave: () => void;
}

const RuleEditorModal: React.FC<RuleEditorModalProps> = ({ rule, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: 'status_changed',
    conditions: [{ field: 'status', operator: 'equals', value: '' }],
    actions: [{ type: 'change_status', config: { status: 'available' } }],
    priority: 50,
    isActive: true
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        triggerEvent: rule.triggerEvent,
        conditions: rule.conditions.length > 0 ? rule.conditions : [{ field: 'status', operator: 'equals', value: '' }],
        actions: rule.actions.length > 0 ? rule.actions : [{ type: 'change_status', config: { status: 'available' } }],
        priority: rule.priority,
        isActive: rule.isActive
      });
    }
  }, [rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (rule) {
        // Update existing rule
        const response = await api.put(`/admin/table-status-rules/${rule._id}`, formData);
        if (response.data.success) {
          toast.success('Rule updated successfully');
          onSave();
        }
      } else {
        // Create new rule
        const response = await api.post('/admin/table-status-rules', formData);
        if (response.data.success) {
          toast.success('Rule created successfully');
          onSave();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field: 'status', operator: 'equals', value: '' }]
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index)
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: 'change_status', config: { status: 'available' } }]
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...formData.actions];
    if (field === 'type') {
      // Reset config when action type changes
      newActions[index] = { 
        type: value, 
        config: value === 'change_status' ? { status: 'available' } : 
                value === 'send_notification' ? { message: '' } :
                value === 'start_timer' ? { duration: 30 } : {} 
      };
    } else {
      // Update config fields
      newActions[index] = { 
        ...newActions[index], 
        config: { 
          ...newActions[index].config, 
          [field]: value 
        } 
      };
    }
    setFormData({ ...formData, actions: newActions });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {rule ? 'Edit Rule' : 'Create New Rule'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Trigger Event */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Event
              </label>
              <select
                value={formData.triggerEvent}
                onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="order_placed">Order Placed</option>
                <option value="payment_completed">Payment Completed</option>
                <option value="table_reserved">Table Reserved</option>
                <option value="status_changed">Status Changed</option>
                <option value="session_check">Session Check</option>
                <option value="manual_trigger">Manual Trigger</option>
              </select>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Conditions (All must be true)
                </label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + Add Condition
                </button>
              </div>
              <div className="space-y-2">
                {formData.conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="status">Table Status</option>
                      <option value="duration_minutes">Duration (minutes)</option>
                      <option value="has_active_order">Has Active Order</option>
                      <option value="table_type">Table Type</option>
                      <option value="capacity">Table Capacity</option>
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                      <option value="contains">Contains</option>
                    </select>
                    {condition.field === 'status' ? (
                      <select
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Status</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    ) : condition.field === 'table_type' ? (
                      <select
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Type</option>
                        <option value="regular">Regular</option>
                        <option value="vip">VIP</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="private">Private</option>
                        <option value="bar">Bar</option>
                      </select>
                    ) : (
                      <input
                        type={condition.field === 'duration_minutes' || condition.field === 'capacity' ? 'number' : 'text'}
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                    {formData.conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Actions
                </label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + Add Action
                </button>
              </div>
              <div className="space-y-2">
                {formData.actions.map((action, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="change_status">Change Status</option>
                        <option value="send_notification">Send Notification</option>
                        <option value="start_timer">Start Timer</option>
                      </select>
                      {formData.actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {action.type === 'change_status' && (
                      <select
                        value={(action.config as { status?: string }).status || ''}
                        onChange={(e) => updateAction(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Status</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="reserved">Reserved</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    )}
                    {action.type === 'send_notification' && (
                      <input
                        type="text"
                        value={(action.config as { message?: string }).message || ''}
                        onChange={(e) => updateAction(index, 'message', e.target.value)}
                        placeholder="Notification message"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                    {action.type === 'start_timer' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={(action.config as { duration?: number }).duration || 30}
                          onChange={(e) => updateAction(index, 'duration', parseInt(e.target.value))}
                          min="1"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Rule is active
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {rule ? 'Update Rule' : 'Create Rule'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableStatusRules;