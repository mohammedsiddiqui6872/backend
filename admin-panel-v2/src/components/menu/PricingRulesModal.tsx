import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Clock, Calendar, Package2, Percent, DollarSign, AlertCircle } from 'lucide-react';
import { MenuItem } from '../../types/menu';
import { pricingRulesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface PricingRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem;
  onUpdate?: () => void;
}

interface PricingRule {
  _id?: string;
  menuItem: string;
  name: string;
  description?: string;
  type: 'time_based' | 'day_of_week' | 'quantity_based' | 'percentage_discount' | 'fixed_discount';
  priority: number;
  isActive: boolean;
  timeRules?: TimeRule[];
  dayOfWeekRules?: DayOfWeekRule[];
  quantityRules?: QuantityRule[];
  discountPercentage?: number;
  fixedDiscount?: number;
  validFrom?: string;
  validUntil?: string;
}

interface TimeRule {
  startTime: string;
  endTime: string;
  price?: number;
  discountPercentage?: number;
  days: string[];
}

interface DayOfWeekRule {
  day: string;
  price?: number;
  discountPercentage?: number;
}

interface QuantityRule {
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage?: number;
  fixedDiscount?: number;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PricingRulesModal: React.FC<PricingRulesModalProps> = ({ isOpen, onClose, menuItem, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [activeRuleIndex, setActiveRuleIndex] = useState<number | null>(null);
  const [ruleType, setRuleType] = useState<PricingRule['type']>('time_based');
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [priority, setPriority] = useState(0);
  
  // Time-based fields
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timePrice, setTimePrice] = useState('');
  const [timeDiscount, setTimeDiscount] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Simple discount fields
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [fixedDiscount, setFixedDiscount] = useState('');
  
  // Quantity fields
  const [minQuantity, setMinQuantity] = useState('1');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [quantityDiscount, setQuantityDiscount] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen, menuItem._id]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await pricingRulesAPI.getMenuItemRules(menuItem._id);
      setRules(response.data);
    } catch (error) {
      toast.error('Failed to fetch pricing rules');
      console.error('Error fetching pricing rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRuleName('');
    setRuleDescription('');
    setPriority(0);
    setStartTime('09:00');
    setEndTime('17:00');
    setTimePrice('');
    setTimeDiscount('');
    setSelectedDays([]);
    setDiscountPercentage('');
    setFixedDiscount('');
    setMinQuantity('1');
    setMaxQuantity('');
    setQuantityDiscount('');
    setActiveRuleIndex(null);
  };

  const addRule = async () => {
    if (!ruleName.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    const newRule: any = {
      menuItem: menuItem._id,
      name: ruleName,
      description: ruleDescription,
      type: ruleType,
      priority: priority,
      isActive: true
    };

    // Add type-specific data
    switch (ruleType) {
      case 'time_based':
        if (!timePrice && !timeDiscount) {
          toast.error('Please enter either a special price or discount percentage');
          return;
        }
        newRule.timeRules = [{
          startTime,
          endTime,
          price: timePrice ? parseFloat(timePrice) : undefined,
          discountPercentage: timeDiscount ? parseFloat(timeDiscount) : undefined,
          days: selectedDays.length > 0 ? selectedDays : DAYS_OF_WEEK
        }];
        break;

      case 'percentage_discount':
        if (!discountPercentage) {
          toast.error('Please enter a discount percentage');
          return;
        }
        newRule.discountPercentage = parseFloat(discountPercentage);
        break;

      case 'fixed_discount':
        if (!fixedDiscount) {
          toast.error('Please enter a discount amount');
          return;
        }
        newRule.fixedDiscount = parseFloat(fixedDiscount);
        break;

      case 'quantity_based':
        if (!quantityDiscount) {
          toast.error('Please enter a discount percentage');
          return;
        }
        newRule.quantityRules = [{
          minQuantity: parseInt(minQuantity),
          maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined,
          discountPercentage: parseFloat(quantityDiscount)
        }];
        break;

      case 'day_of_week':
        if (!timePrice && !timeDiscount) {
          toast.error('Please enter either a special price or discount percentage');
          return;
        }
        if (selectedDays.length === 0) {
          toast.error('Please select at least one day');
          return;
        }
        newRule.dayOfWeekRules = selectedDays.map(day => ({
          day,
          price: timePrice ? parseFloat(timePrice) : undefined,
          discountPercentage: timeDiscount ? parseFloat(timeDiscount) : undefined
        }));
        break;
    }

    try {
      setSaving(true);
      await pricingRulesAPI.createRule(newRule);
      toast.success('Pricing rule created successfully');
      fetchRules();
      resetForm();
    } catch (error) {
      toast.error('Failed to create pricing rule');
      console.error('Error creating pricing rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: PricingRule) => {
    try {
      await pricingRulesAPI.toggleActive(rule._id!);
      toast.success(`Rule ${rule.isActive ? 'deactivated' : 'activated'}`);
      fetchRules();
    } catch (error) {
      toast.error('Failed to toggle rule');
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (rule: PricingRule) => {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) return;

    try {
      await pricingRulesAPI.deleteRule(rule._id!);
      toast.success('Rule deleted successfully');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
      console.error('Error deleting rule:', error);
    }
  };

  const calculatePreview = () => {
    const basePrice = menuItem.price;
    let previewPrice = basePrice;
    let discount = 0;

    switch (ruleType) {
      case 'time_based':
      case 'day_of_week':
        if (timePrice) {
          previewPrice = parseFloat(timePrice);
          discount = basePrice - previewPrice;
        } else if (timeDiscount) {
          discount = basePrice * (parseFloat(timeDiscount) / 100);
          previewPrice = basePrice - discount;
        }
        break;

      case 'percentage_discount':
        if (discountPercentage) {
          discount = basePrice * (parseFloat(discountPercentage) / 100);
          previewPrice = basePrice - discount;
        }
        break;

      case 'fixed_discount':
        if (fixedDiscount) {
          discount = parseFloat(fixedDiscount);
          previewPrice = Math.max(0, basePrice - discount);
        }
        break;

      case 'quantity_based':
        if (quantityDiscount && minQuantity) {
          const qty = parseInt(minQuantity);
          const totalOriginal = basePrice * qty;
          discount = totalOriginal * (parseFloat(quantityDiscount) / 100);
          previewPrice = (totalOriginal - discount) / qty;
        }
        break;
    }

    return { previewPrice, discount };
  };

  const { previewPrice, discount } = calculatePreview();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Pricing Rules for {menuItem.name}</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Existing Rules */}
                  {rules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Active Rules</h3>
                      <div className="space-y-3">
                        {rules.map((rule, index) => (
                          <div
                            key={rule._id}
                            className={`border rounded-lg p-4 ${rule.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900">{rule.name}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {rule.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    {rule.type.replace('_', ' ')}
                                  </span>
                                </div>
                                {rule.description && (
                                  <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                                )}
                                <div className="mt-2 text-sm text-gray-500">
                                  Priority: {rule.priority}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => toggleRule(rule)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  {rule.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => deleteRule(rule)}
                                  className="text-sm text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Rule */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Rule</h3>
                    
                    {/* Rule Type Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rule Type
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <button
                          onClick={() => setRuleType('time_based')}
                          className={`p-2 text-sm rounded-md border ${
                            ruleType === 'time_based'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Clock className="h-4 w-4 mx-auto mb-1" />
                          Time Based
                        </button>
                        <button
                          onClick={() => setRuleType('day_of_week')}
                          className={`p-2 text-sm rounded-md border ${
                            ruleType === 'day_of_week'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Calendar className="h-4 w-4 mx-auto mb-1" />
                          Day of Week
                        </button>
                        <button
                          onClick={() => setRuleType('quantity_based')}
                          className={`p-2 text-sm rounded-md border ${
                            ruleType === 'quantity_based'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Package2 className="h-4 w-4 mx-auto mb-1" />
                          Quantity
                        </button>
                        <button
                          onClick={() => setRuleType('percentage_discount')}
                          className={`p-2 text-sm rounded-md border ${
                            ruleType === 'percentage_discount'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Percent className="h-4 w-4 mx-auto mb-1" />
                          % Discount
                        </button>
                        <button
                          onClick={() => setRuleType('fixed_discount')}
                          className={`p-2 text-sm rounded-md border ${
                            ruleType === 'fixed_discount'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <DollarSign className="h-4 w-4 mx-auto mb-1" />
                          Fixed Discount
                        </button>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rule Name
                        </label>
                        <input
                          type="text"
                          value={ruleName}
                          onChange={(e) => setRuleName(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="e.g., Happy Hour Discount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority (Higher = Applied First)
                        </label>
                        <input
                          type="number"
                          value={priority}
                          onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={ruleDescription}
                        onChange={(e) => setRuleDescription(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Brief description of this rule"
                      />
                    </div>

                    {/* Type-specific fields */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      {(ruleType === 'time_based' || ruleType === 'day_of_week') && (
                        <>
                          {ruleType === 'time_based' && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Time
                                </label>
                                <input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  End Time
                                </label>
                                <input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Apply on Days
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <button
                                  key={day}
                                  onClick={() => {
                                    setSelectedDays(prev =>
                                      prev.includes(day)
                                        ? prev.filter(d => d !== day)
                                        : [...prev, day]
                                    );
                                  }}
                                  className={`p-2 text-xs rounded capitalize ${
                                    selectedDays.includes(day)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {day.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                            {selectedDays.length === 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                No days selected = applies to all days
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Special Price (Optional)
                              </label>
                              <input
                                type="number"
                                value={timePrice}
                                onChange={(e) => setTimePrice(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder={`Regular: $${menuItem.price}`}
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OR Discount % (Optional)
                              </label>
                              <input
                                type="number"
                                value={timeDiscount}
                                onChange={(e) => setTimeDiscount(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g., 20"
                                min="0"
                                max="100"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {ruleType === 'percentage_discount' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Percentage
                          </label>
                          <input
                            type="number"
                            value={discountPercentage}
                            onChange={(e) => setDiscountPercentage(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 15"
                            min="0"
                            max="100"
                          />
                        </div>
                      )}

                      {ruleType === 'fixed_discount' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Amount
                          </label>
                          <input
                            type="number"
                            value={fixedDiscount}
                            onChange={(e) => setFixedDiscount(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 5.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      )}

                      {ruleType === 'quantity_based' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Quantity
                              </label>
                              <input
                                type="number"
                                value={minQuantity}
                                onChange={(e) => setMinQuantity(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Quantity (Optional)
                              </label>
                              <input
                                type="number"
                                value={maxQuantity}
                                onChange={(e) => setMaxQuantity(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                min="1"
                                placeholder="No limit"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Discount Percentage
                            </label>
                            <input
                              type="number"
                              value={quantityDiscount}
                              onChange={(e) => setQuantityDiscount(e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="e.g., 10"
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Preview */}
                    {(timePrice || timeDiscount || discountPercentage || fixedDiscount || quantityDiscount) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Price Preview</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Original Price</p>
                            <p className="font-semibold">${menuItem.price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Discount</p>
                            <p className="font-semibold text-red-600">-${discount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">New Price</p>
                            <p className="font-semibold text-green-600">${previewPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={addRule}
                        disabled={saving || !ruleName}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Rule
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingRulesModal;