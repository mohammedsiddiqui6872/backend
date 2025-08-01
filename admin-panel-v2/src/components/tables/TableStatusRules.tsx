import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
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
    config: any;
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

      {/* TODO: Add create/edit modal */}
      {(showCreateModal || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingRule ? 'Edit Rule' : 'Create Rule'}
            </h3>
            <p className="text-gray-600">Rule editor coming soon...</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableStatusRules;