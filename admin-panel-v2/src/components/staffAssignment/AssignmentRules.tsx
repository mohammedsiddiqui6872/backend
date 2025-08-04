import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  ToggleLeft,
  ToggleRight,
  Play,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Calendar,
  Users,
  Layers
} from 'lucide-react';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { AssignmentRule } from '../../types/staffAssignment';
import toast from 'react-hot-toast';

interface AssignmentRulesProps {
  canManage: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night', 'custom'];
const TABLE_TYPES = ['regular', 'vip', 'outdoor', 'private', 'bar'];
const ASSIGNMENT_STRATEGIES = [
  { value: 'round_robin', label: 'Round Robin', description: 'Distribute tables evenly' },
  { value: 'least_loaded', label: 'Least Loaded', description: 'Assign to waiter with fewest tables' },
  { value: 'performance_based', label: 'Performance Based', description: 'Prioritize high-performing waiters' },
  { value: 'random', label: 'Random', description: 'Random assignment' }
];

const AssignmentRules: React.FC<AssignmentRulesProps> = ({ canManage }) => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AssignmentRule>>({
    name: '',
    description: '',
    isActive: true,
    priority: 1,
    conditions: {
      shiftType: [],
      tableSection: [],
      tableFloor: [],
      tableType: [],
      waiterRole: [],
      dayOfWeek: [],
      timeRange: undefined,
      minExperience: undefined
    },
    actions: {
      autoAssign: true,
      preferredWaiters: [],
      maxTablesPerWaiter: 4,
      assignmentStrategy: 'round_robin',
      notifyOnAssignment: true
    }
  });

  // Load rules
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rulesData = await staffAssignmentAPI.getRules();
      setRules(rulesData.sort((a, b) => a.priority - b.priority));
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load assignment rules');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      if (editingRule) {
        await staffAssignmentAPI.updateRule(editingRule.id, formData);
        toast.success('Rule updated successfully');
      } else {
        await staffAssignmentAPI.createRule(formData as any);
        toast.success('Rule created successfully');
      }
      
      setShowRuleForm(false);
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        isActive: true,
        priority: 1,
        conditions: {
          shiftType: [],
          tableSection: [],
          tableFloor: [],
          tableType: [],
          waiterRole: [],
          dayOfWeek: [],
          timeRange: undefined,
          minExperience: undefined
        },
        actions: {
          autoAssign: true,
          preferredWaiters: [],
          maxTablesPerWaiter: 4,
          assignmentStrategy: 'round_robin',
          notifyOnAssignment: true
        }
      });
      
      await loadRules();
    } catch (error) {
      toast.error('Failed to save rule');
    }
  };

  // Toggle rule active state
  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await staffAssignmentAPI.toggleRule(ruleId, isActive);
      toast.success(`Rule ${isActive ? 'activated' : 'deactivated'}`);
      await loadRules();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await staffAssignmentAPI.deleteRule(ruleId);
      toast.success('Rule deleted successfully');
      await loadRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  // Test rule
  const handleTestRule = async (ruleId: string) => {
    try {
      setTestingRule(ruleId);
      const result = await staffAssignmentAPI.testRule(ruleId);
      
      toast.success(
        `Rule would assign ${result.wouldAssign} tables. ${result.matches.length} tables match the conditions.`,
        { duration: 5000 }
      );
    } catch (error) {
      toast.error('Failed to test rule');
    } finally {
      setTestingRule(null);
    }
  };

  // Edit rule
  const handleEditRule = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions
    });
    setShowRuleForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Assignment Rules</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create automated rules for table assignments based on conditions
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowRuleForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </button>
          )}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length > 0 ? (
          rules.map((rule, index) => (
            <div
              key={rule.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">{rule.name}</h4>
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Priority {rule.priority}
                    </span>
                    {rule.isActive ? (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                  )}

                  {/* Conditions */}
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Conditions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {rule.conditions.shiftType?.length > 0 && (
                        <div className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          Shift: {rule.conditions.shiftType.join(', ')}
                        </div>
                      )}
                      {rule.conditions.tableType?.length > 0 && (
                        <div className="inline-flex items-center px-3 py-1 rounded-md bg-purple-50 text-purple-700 text-sm">
                          <Layers className="h-3 w-3 mr-1" />
                          Tables: {rule.conditions.tableType.join(', ')}
                        </div>
                      )}
                      {rule.conditions.dayOfWeek?.length > 0 && (
                        <div className="inline-flex items-center px-3 py-1 rounded-md bg-green-50 text-green-700 text-sm">
                          Days: {rule.conditions.dayOfWeek.map(d => 
                            DAYS_OF_WEEK.find(day => day.value === d)?.label || d
                          ).join(', ')}
                        </div>
                      )}
                      {rule.conditions.minExperience && (
                        <div className="inline-flex items-center px-3 py-1 rounded-md bg-orange-50 text-orange-700 text-sm">
                          <Users className="h-3 w-3 mr-1" />
                          Min {rule.conditions.minExperience} months exp
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Actions:</h5>
                    <div className="text-sm text-gray-600">
                      <p>• Strategy: {ASSIGNMENT_STRATEGIES.find(s => s.value === rule.actions.assignmentStrategy)?.label}</p>
                      <p>• Max tables per waiter: {rule.actions.maxTablesPerWaiter}</p>
                      {rule.actions.notifyOnAssignment && <p>• Notifications enabled</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleTestRule(rule.id)}
                      disabled={testingRule === rule.id}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title="Test rule"
                    >
                      {testingRule === rule.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title="Edit rule"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      title="Delete rule"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rules configured</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first assignment rule to automate table assignments
            </p>
            {canManage && (
              <button
                onClick={() => setShowRuleForm(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rule Form Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h3>
              <button
                onClick={() => {
                  setShowRuleForm(false);
                  setEditingRule(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Weekend VIP Assignment"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe what this rule does..."
                  />
                </div>
              </div>

              {/* Conditions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Conditions</h4>
                <div className="space-y-4">
                  {/* Days of Week */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <label key={day.value} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.conditions?.dayOfWeek?.includes(day.value)}
                            onChange={(e) => {
                              const days = formData.conditions?.dayOfWeek || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    dayOfWeek: [...days, day.value]
                                  }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    dayOfWeek: days.filter(d => d !== day.value)
                                  }
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shift Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SHIFT_TYPES.map(shift => (
                        <label key={shift} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.conditions?.shiftType?.includes(shift)}
                            onChange={(e) => {
                              const shifts = formData.conditions?.shiftType || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    shiftType: [...shifts, shift]
                                  }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    shiftType: shifts.filter(s => s !== shift)
                                  }
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{shift}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Table Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Table Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TABLE_TYPES.map(type => (
                        <label key={type} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.conditions?.tableType?.includes(type)}
                            onChange={(e) => {
                              const types = formData.conditions?.tableType || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    tableType: [...types, type]
                                  }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  conditions: {
                                    ...formData.conditions!,
                                    tableType: types.filter(t => t !== type)
                                  }
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Minimum Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Experience (months)
                    </label>
                    <input
                      type="number"
                      value={formData.conditions?.minExperience || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions!,
                          minExperience: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      min="0"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 6"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Actions</h4>
                <div className="space-y-4">
                  {/* Assignment Strategy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment Strategy
                    </label>
                    <select
                      value={formData.actions?.assignmentStrategy}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions!,
                          assignmentStrategy: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      {ASSIGNMENT_STRATEGIES.map(strategy => (
                        <option key={strategy.value} value={strategy.value}>
                          {strategy.label} - {strategy.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Tables */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tables Per Waiter
                    </label>
                    <input
                      type="number"
                      value={formData.actions?.maxTablesPerWaiter}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions!,
                          maxTablesPerWaiter: parseInt(e.target.value)
                        }
                      })}
                      min="1"
                      max="20"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Notifications */}
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.actions?.notifyOnAssignment}
                        onChange={(e) => setFormData({
                          ...formData,
                          actions: {
                            ...formData.actions!,
                            notifyOnAssignment: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Send notifications when assignments are made
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRuleForm(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Save className="h-4 w-4 mr-2 inline" />
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentRules;