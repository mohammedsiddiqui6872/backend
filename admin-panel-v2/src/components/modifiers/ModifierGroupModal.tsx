import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings, DollarSign } from 'lucide-react';
import { ModifierGroup, ModifierOption } from '../../types/modifiers';
import toast from 'react-hot-toast';

interface ModifierGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: ModifierGroup | null;
  onSave: (data: Partial<ModifierGroup>) => Promise<void>;
}

const ModifierGroupModal: React.FC<ModifierGroupModalProps> = ({
  isOpen,
  onClose,
  modifierGroup,
  onSave
}) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ModifierGroup>>({
    name: '',
    nameAr: '',
    description: '',
    type: 'single',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    options: [],
    displayOrder: 0,
    isActive: true
  });

  // Option form state
  const [optionName, setOptionName] = useState('');
  const [optionNameAr, setOptionNameAr] = useState('');
  const [optionPrice, setOptionPrice] = useState('');
  const [optionCalories, setOptionCalories] = useState('');
  const [optionMaxQty, setOptionMaxQty] = useState('1');
  const [optionDefault, setOptionDefault] = useState(false);

  useEffect(() => {
    if (modifierGroup) {
      setFormData({
        ...modifierGroup,
        options: [...modifierGroup.options]
      });
    } else {
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        type: 'single',
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [],
        displayOrder: 0,
        isActive: true
      });
    }
  }, [modifierGroup]);

  const addOption = () => {
    if (!optionName.trim()) {
      toast.error('Please enter option name');
      return;
    }

    const newOption: ModifierOption = {
      name: optionName.trim(),
      nameAr: optionNameAr.trim(),
      price: parseFloat(optionPrice) || 0,
      calories: optionCalories ? parseInt(optionCalories) : undefined,
      isDefault: optionDefault,
      available: true,
      maxQuantity: parseInt(optionMaxQty) || 1,
      displayOrder: formData.options?.length || 0
    };

    // If single type and this is default, unset other defaults
    if (formData.type === 'single' && optionDefault && formData.options) {
      formData.options.forEach(opt => opt.isDefault = false);
    }

    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));

    // Reset form
    setOptionName('');
    setOptionNameAr('');
    setOptionPrice('');
    setOptionCalories('');
    setOptionMaxQty('1');
    setOptionDefault(false);
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const updateOption = (index: number, updates: Partial<ModifierOption>) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => 
        i === index ? { ...opt, ...updates } : opt
      ) || []
    }));
  };

  const handleTypeChange = (newType: 'single' | 'multiple') => {
    setFormData(prev => {
      const updates: Partial<ModifierGroup> = { ...prev, type: newType };
      
      if (newType === 'single') {
        updates.minSelections = prev.required ? 1 : 0;
        updates.maxSelections = 1;
        
        // Ensure only one default option
        if (updates.options && updates.options.length > 0) {
          const hasDefault = updates.options.some(opt => opt.isDefault);
          if (!hasDefault) {
            updates.options[0].isDefault = true;
          }
        }
      }
      
      return updates;
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Please enter modifier group name');
      return;
    }

    if (!formData.options || formData.options.length === 0) {
      toast.error('Please add at least one option');
      return;
    }

    if (formData.type === 'multiple') {
      if (formData.minSelections! > formData.maxSelections!) {
        toast.error('Minimum selections cannot be greater than maximum selections');
        return;
      }
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving modifier group:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {modifierGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
                </h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., Size, Add-ons, Toppings"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arabic Name
                      </label>
                      <input
                        type="text"
                        value={formData.nameAr}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={2}
                      placeholder="Brief description of this modifier group"
                    />
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selection Type
                        </label>
                        <select
                          value={formData.type}
                          onChange={(e) => handleTypeChange(e.target.value as 'single' | 'multiple')}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="single">Single Selection (Radio)</option>
                          <option value="multiple">Multiple Selection (Checkbox)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.required}
                          onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Required Selection</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>

                    {formData.type === 'multiple' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Selections
                          </label>
                          <input
                            type="number"
                            value={formData.minSelections}
                            onChange={(e) => setFormData({ ...formData, minSelections: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Selections
                          </label>
                          <input
                            type="number"
                            value={formData.maxSelections}
                            onChange={(e) => setFormData({ ...formData, maxSelections: parseInt(e.target.value) || 1 })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Options</h3>
                  
                  {/* Add Option Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={optionName}
                        onChange={(e) => setOptionName(e.target.value)}
                        placeholder="Option name *"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={optionNameAr}
                        onChange={(e) => setOptionNameAr(e.target.value)}
                        placeholder="Arabic name"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        type="number"
                        value={optionPrice}
                        onChange={(e) => setOptionPrice(e.target.value)}
                        placeholder="Price"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="number"
                        value={optionCalories}
                        onChange={(e) => setOptionCalories(e.target.value)}
                        placeholder="Calories"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                      />
                      <input
                        type="number"
                        value={optionMaxQty}
                        onChange={(e) => setOptionMaxQty(e.target.value)}
                        placeholder="Max Qty"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="1"
                      />
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={optionDefault}
                            onChange={(e) => setOptionDefault(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">Default</span>
                        </label>
                        <button
                          onClick={addOption}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    {formData.options?.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{option.name}</span>
                            {option.nameAr && (
                              <span className="text-gray-500 text-sm" dir="rtl">({option.nameAr})</span>
                            )}
                            {option.price > 0 && (
                              <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
                            )}
                            {option.calories && (
                              <span className="text-gray-500 text-sm">{option.calories} cal</span>
                            )}
                            {option.isDefault && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mt-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={option.available}
                                onChange={(e) => updateOption(index, { available: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-gray-600">Available</span>
                            </label>
                            <span className="text-sm text-gray-500">Max Qty: {option.maxQuantity}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {(!formData.options || formData.options.length === 0) && (
                      <div className="text-center py-4 text-gray-500">
                        No options added yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Modifier Group
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModifierGroupModal;