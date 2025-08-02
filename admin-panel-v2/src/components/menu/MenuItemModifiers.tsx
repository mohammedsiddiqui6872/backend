import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, GripVertical } from 'lucide-react';
import { ModifierGroup } from '../../types/modifiers';
import { modifiersAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface MenuItemModifiersProps {
  menuItemId?: string;
  modifierGroups: Array<{ group: string; displayOrder: number }>;
  onChange: (modifiers: Array<{ group: string; displayOrder: number }>) => void;
}

const MenuItemModifiers: React.FC<MenuItemModifiersProps> = ({
  menuItemId,
  modifierGroups,
  onChange
}) => {
  const [availableModifiers, setAvailableModifiers] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<Array<{ 
    group: ModifierGroup; 
    displayOrder: number 
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModifierId, setSelectedModifierId] = useState('');

  useEffect(() => {
    fetchAvailableModifiers();
  }, []);

  useEffect(() => {
    // Load selected modifiers when component mounts or modifierGroups change
    if (modifierGroups.length > 0 && availableModifiers.length > 0) {
      const selected = modifierGroups
        .map(mg => {
          const modifier = availableModifiers.find(am => am._id === mg.group);
          return modifier ? { group: modifier, displayOrder: mg.displayOrder } : null;
        })
        .filter(Boolean) as Array<{ group: ModifierGroup; displayOrder: number }>;
      
      setSelectedModifiers(selected);
    }
  }, [modifierGroups, availableModifiers]);

  const fetchAvailableModifiers = async () => {
    try {
      setLoading(true);
      const response = await modifiersAPI.getModifierGroups({ active: true });
      setAvailableModifiers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      toast.error('Failed to load modifier groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModifier = () => {
    if (!selectedModifierId) {
      toast.error('Please select a modifier group');
      return;
    }

    const modifier = availableModifiers.find(m => m._id === selectedModifierId);
    if (!modifier) return;

    // Check if already added
    if (selectedModifiers.some(sm => sm.group._id === selectedModifierId)) {
      toast.error('This modifier group is already added');
      return;
    }

    const newModifier = {
      group: modifier,
      displayOrder: selectedModifiers.length
    };

    const updatedModifiers = [...selectedModifiers, newModifier];
    setSelectedModifiers(updatedModifiers);
    
    // Update parent component
    onChange(updatedModifiers.map(m => ({
      group: m.group._id,
      displayOrder: m.displayOrder
    })));

    setSelectedModifierId('');
    setShowAddModal(false);
  };

  const handleRemoveModifier = (index: number) => {
    const updatedModifiers = selectedModifiers.filter((_, i) => i !== index);
    
    // Reorder display orders
    updatedModifiers.forEach((mod, i) => {
      mod.displayOrder = i;
    });
    
    setSelectedModifiers(updatedModifiers);
    
    // Update parent component
    onChange(updatedModifiers.map(m => ({
      group: m.group._id,
      displayOrder: m.displayOrder
    })));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const items = [...selectedModifiers];
    const [removed] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, removed);
    
    // Update display orders
    items.forEach((item, index) => {
      item.displayOrder = index;
    });
    
    setSelectedModifiers(items);
    
    // Update parent component
    onChange(items.map(m => ({
      group: m.group._id,
      displayOrder: m.displayOrder
    })));
  };

  const getAvailableModifiersForSelect = () => {
    const selectedIds = selectedModifiers.map(sm => sm.group._id);
    return availableModifiers.filter(m => !selectedIds.includes(m._id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Modifier Groups</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Modifier Group
        </button>
      </div>

      {/* Selected Modifiers */}
      <div className="space-y-2">
        {selectedModifiers.map((modifier, index) => (
          <div
            key={modifier.group._id}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
          >
            <div className="flex items-center space-x-3">
              <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
              <div>
                <h4 className="font-medium text-gray-900">{modifier.group.name}</h4>
                <p className="text-sm text-gray-500">
                  {modifier.group.type === 'single' ? 'Single Selection' : 'Multiple Selection'}
                  {modifier.group.required && ' • Required'}
                  {' • '}{modifier.group.options.length} options
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Order: {modifier.displayOrder + 1}</span>
              <button
                onClick={() => handleRemoveModifier(index)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        
        {selectedModifiers.length === 0 && (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            No modifier groups added
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Modifier Group</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Modifier Group
                      </label>
                      <select
                        value={selectedModifierId}
                        onChange={(e) => setSelectedModifierId(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Choose a modifier group</option>
                        {getAvailableModifiersForSelect().map(modifier => (
                          <option key={modifier._id} value={modifier._id}>
                            {modifier.name} ({modifier.type} - {modifier.options.length} options)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedModifierId && (() => {
                      const modifier = availableModifiers.find(m => m._id === selectedModifierId);
                      return modifier ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium text-gray-900">{modifier.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{modifier.description}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-500">
                              Type: {modifier.type === 'single' ? 'Single Selection' : 'Multiple Selection'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Required: {modifier.required ? 'Yes' : 'No'}
                            </p>
                            {modifier.type === 'multiple' && (
                              <p className="text-sm text-gray-500">
                                Selections: {modifier.minSelections} - {modifier.maxSelections}
                              </p>
                            )}
                          </div>
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Options:</p>
                            <div className="space-y-1">
                              {modifier.options.slice(0, 5).map((option, i) => (
                                <div key={i} className="text-sm text-gray-600">
                                  • {option.name} 
                                  {option.price > 0 && <span className="text-green-600"> (+${option.price})</span>}
                                </div>
                              ))}
                              {modifier.options.length > 5 && (
                                <p className="text-sm text-gray-500">
                                  ...and {modifier.options.length - 5} more
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddModifier}
                      disabled={!selectedModifierId}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add Modifier Group
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MenuItemModifiers;