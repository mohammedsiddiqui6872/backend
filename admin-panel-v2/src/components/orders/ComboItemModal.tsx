import { useState, useEffect } from 'react';
import {
  X, Package, AlertCircle, CheckCircle, Plus, Minus,
  ChevronRight, Info, DollarSign, ArrowRight, ShoppingBag
} from 'lucide-react';
import { menuAPI, combosAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ComboItem {
  categoryId: string;
  categoryName: string;
  quantity: number;
  allowedItems: Array<{
    _id: string;
    name: string;
    price: number;
    image?: string;
    isDefault: boolean;
  }>;
  selectedItems: string[];
  minSelection: number;
  maxSelection: number;
}

interface ComboGroup {
  _id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  items: ComboItem[];
  isActive: boolean;
  savings: number;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category: {
    _id: string;
    name: string;
  };
  isAvailable: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComboSelected: (combo: any) => void;
  existingCombo?: any;
}

const ComboItemModal: React.FC<Props> = ({ isOpen, onClose, onComboSelected, existingCombo }) => {
  const [combos, setCombos] = useState<ComboGroup[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<ComboGroup | null>(null);
  const [comboSelections, setComboSelections] = useState<Record<string, string[]>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'customize'>('select');

  useEffect(() => {
    if (isOpen) {
      fetchCombosAndMenu();
    }
  }, [isOpen]);

  const fetchCombosAndMenu = async () => {
    try {
      const [combosRes, menuRes] = await Promise.all([
        combosAPI.getCombos({ isActive: true }),
        menuAPI.getItems()
      ]);

      setCombos(combosRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (error) {
      toast.error('Failed to load combos');
    } finally {
      setLoading(false);
    }
  };

  const handleComboSelect = (combo: ComboGroup) => {
    setSelectedCombo(combo);
    
    // Initialize selections with default items
    const initialSelections: Record<string, string[]> = {};
    combo.items.forEach((item, index) => {
      const defaults = item.allowedItems
        .filter(i => i.isDefault)
        .slice(0, item.maxSelection)
        .map(i => i._id);
      
      initialSelections[index.toString()] = defaults;
    });
    
    setComboSelections(initialSelections);
    setStep('customize');
  };

  const handleItemToggle = (categoryIndex: string, itemId: string) => {
    const currentSelections = comboSelections[categoryIndex] || [];
    const comboItem = selectedCombo?.items[parseInt(categoryIndex)];
    
    if (!comboItem) return;

    let newSelections: string[];
    
    if (currentSelections.includes(itemId)) {
      // Remove item
      newSelections = currentSelections.filter(id => id !== itemId);
    } else {
      // Add item
      if (currentSelections.length >= comboItem.maxSelection) {
        toast.error(`Maximum ${comboItem.maxSelection} items allowed for ${comboItem.categoryName}`);
        return;
      }
      newSelections = [...currentSelections, itemId];
    }

    setComboSelections({
      ...comboSelections,
      [categoryIndex]: newSelections
    });
  };

  const isSelectionValid = () => {
    if (!selectedCombo) return false;

    return selectedCombo.items.every((item, index) => {
      const selections = comboSelections[index.toString()] || [];
      return selections.length >= item.minSelection && selections.length <= item.maxSelection;
    });
  };

  const calculateComboPrice = () => {
    if (!selectedCombo) return { regular: 0, combo: 0, savings: 0 };

    let regularPrice = 0;
    selectedCombo.items.forEach((item, index) => {
      const selections = comboSelections[index.toString()] || [];
      selections.forEach(itemId => {
        const menuItem = item.allowedItems.find(i => i._id === itemId);
        if (menuItem) {
          regularPrice += menuItem.price;
        }
      });
    });

    return {
      regular: regularPrice,
      combo: selectedCombo.price,
      savings: regularPrice - selectedCombo.price
    };
  };

  const handleConfirmCombo = () => {
    if (!selectedCombo || !isSelectionValid()) {
      toast.error('Please complete all selections');
      return;
    }

    const comboData = {
      combo: selectedCombo,
      selections: comboSelections,
      items: selectedCombo.items.map((item, index) => {
        const selections = comboSelections[index.toString()] || [];
        return {
          category: item.categoryName,
          items: selections.map(itemId => {
            const menuItem = item.allowedItems.find(i => i._id === itemId);
            return {
              _id: itemId,
              name: menuItem?.name || '',
              price: menuItem?.price || 0
            };
          })
        };
      }),
      pricing: calculateComboPrice()
    };

    onComboSelected(comboData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-semibold">
                  {step === 'select' ? 'Select Combo' : 'Customize Combo'}
                </h2>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : step === 'select' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map(combo => {
                  const pricing = {
                    regular: combo.items.reduce((sum, item) => {
                      const defaultPrice = item.allowedItems
                        .filter(i => i.isDefault)
                        .slice(0, item.quantity)
                        .reduce((s, i) => s + i.price, 0);
                      return sum + defaultPrice;
                    }, 0)
                  };

                  return (
                    <div
                      key={combo._id}
                      className="border rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleComboSelect(combo)}
                    >
                      <div className="p-4">
                        <div className="flex items-start">
                          {combo.image ? (
                            <img
                              src={combo.image}
                              alt={combo.name}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4 flex-1">
                            <h3 className="font-medium text-lg">{combo.name}</h3>
                            {combo.description && (
                              <p className="text-sm text-gray-600 mt-1">{combo.description}</p>
                            )}
                            <div className="mt-2">
                              {combo.items.map((item, idx) => (
                                <p key={idx} className="text-sm text-gray-600">
                                  • {item.quantity}x {item.categoryName}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500 line-through">
                              AED {pricing.regular.toFixed(2)}
                            </p>
                            <p className="text-xl font-bold text-primary-600">
                              AED {combo.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Save AED {combo.savings.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Combo Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{selectedCombo?.name}</h3>
                      <p className="text-sm text-gray-600">{selectedCombo?.description}</p>
                    </div>
                    <button
                      onClick={() => setStep('select')}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Change Combo
                    </button>
                  </div>
                </div>

                {/* Category Selections */}
                {selectedCombo?.items.map((item, categoryIndex) => {
                  const selections = comboSelections[categoryIndex.toString()] || [];
                  const isValid = selections.length >= item.minSelection && selections.length <= item.maxSelection;

                  return (
                    <div key={categoryIndex} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium flex items-center">
                            {item.categoryName}
                            {!isValid && (
                              <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Select {item.minSelection === item.maxSelection 
                              ? item.minSelection 
                              : `${item.minSelection}-${item.maxSelection}`} items
                            {selections.length > 0 && ` (${selections.length} selected)`}
                          </p>
                        </div>
                        {isValid && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {item.allowedItems.map(menuItem => {
                          const isSelected = selections.includes(menuItem._id);
                          const canSelect = !isSelected && selections.length < item.maxSelection;

                          return (
                            <button
                              key={menuItem._id}
                              onClick={() => handleItemToggle(categoryIndex.toString(), menuItem._id)}
                              disabled={!isSelected && !canSelect}
                              className={`p-3 border rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-50'
                                  : canSelect
                                  ? 'border-gray-200 hover:border-gray-300'
                                  : 'border-gray-200 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{menuItem.name}</p>
                                  <p className="text-xs text-gray-600">AED {menuItem.price.toFixed(2)}</p>
                                  {menuItem.isDefault && (
                                    <span className="text-xs text-primary-600">Default</span>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-primary-600" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Pricing Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-900">Combo Price</p>
                      <p className="text-2xl font-bold text-blue-900">
                        AED {selectedCombo?.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-700">You Save</p>
                      <p className="text-lg font-medium text-green-600">
                        AED {calculateComboPrice().savings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'customize' && (
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmCombo}
                  disabled={!isSelectionValid()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add Combo to Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComboItemModal;