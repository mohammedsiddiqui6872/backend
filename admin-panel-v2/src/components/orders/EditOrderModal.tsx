import { useState, useEffect } from 'react';
import {
  X, Plus, Minus, Search, Save, Trash2, Edit2,
  AlertCircle, ShoppingCart, User, MapPin, Phone,
  ChefHat, Flame, Salad, IceCream, Coffee, AlertTriangle,
  CheckCircle, Clock, Package
} from 'lucide-react';
import { menuAPI, ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface OrderItem {
  _id: string;
  menuItem?: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  station?: string;
  allergens?: string[];
  dietary?: string[];
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  tip?: number;
  discount?: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  waiter?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface MenuItem {
  _id: string;
  name: string;
  nameAr: string;
  description: string;
  price: number;
  category: {
    _id: string;
    name: string;
  };
  image?: string;
  isAvailable: boolean;
  allergens?: string[];
  dietary?: string[];
  modifierGroups?: ModifierGroup[];
  prepTime?: number;
  station?: string;
}

interface ModifierGroup {
  _id: string;
  name: string;
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  modifiers: Modifier[];
}

interface Modifier {
  _id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

const EditOrderModal: React.FC<Props> = ({ order, isOpen, onClose, onOrderUpdated }) => {
  const [editedOrder, setEditedOrder] = useState<Order>(order);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItems, setShowAddItems] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [tempModifiers, setTempModifiers] = useState<Modifier[]>([]);
  const [tempSpecialRequest, setTempSpecialRequest] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditedOrder(order);
      fetchMenuItems();
    }
  }, [isOpen, order]);

  const fetchMenuItems = async () => {
    try {
      const response = await menuAPI.getItems();
      setMenuItems(response.data.filter((item: MenuItem) => item.isAvailable));
    } catch (error) {
      toast.error('Failed to load menu items');
    }
  };

  const getStationIcon = (station?: string) => {
    switch (station) {
      case 'grill': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'salad': return <Salad className="h-4 w-4 text-green-500" />;
      case 'dessert': return <IceCream className="h-4 w-4 text-pink-500" />;
      case 'beverage': return <Coffee className="h-4 w-4 text-yellow-600" />;
      default: return <ChefHat className="h-4 w-4 text-blue-500" />;
    }
  };

  const getItemStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      served: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nameAr.includes(searchQuery)
  );

  const handleQuantityChange = (index: number, delta: number) => {
    const newItems = [...editedOrder.items];
    newItems[index].quantity += delta;
    
    if (newItems[index].quantity <= 0) {
      handleRemoveItem(index);
    } else {
      setEditedOrder({ ...editedOrder, items: newItems });
      recalculateTotals(newItems);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editedOrder.items.filter((_, i) => i !== index);
    setEditedOrder({ ...editedOrder, items: newItems });
    recalculateTotals(newItems);
  };

  const handleSpecialRequestChange = (index: number, value: string) => {
    const newItems = [...editedOrder.items];
    newItems[index].specialRequests = value;
    setEditedOrder({ ...editedOrder, items: newItems });
  };

  const handleAddNewItem = (menuItem: MenuItem) => {
    if (menuItem.modifierGroups && menuItem.modifierGroups.length > 0) {
      setSelectedItem(menuItem);
      setTempModifiers([]);
      setTempSpecialRequest('');
      setEditingItemIndex(null);
      setShowModifierModal(true);
    } else {
      addItemToOrder(menuItem, [], '');
    }
  };

  const addItemToOrder = (menuItem: MenuItem, modifiers: Modifier[], specialRequest: string) => {
    const newItem: OrderItem = {
      _id: `new-${Date.now()}`,
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      modifiers: modifiers.map(m => ({ name: m.name, price: m.price })),
      specialRequests: specialRequest,
      status: 'pending',
      station: menuItem.station,
      allergens: menuItem.allergens,
      dietary: menuItem.dietary
    };

    const newItems = [...editedOrder.items, newItem];
    setEditedOrder({ ...editedOrder, items: newItems });
    recalculateTotals(newItems);
    setShowAddItems(false);
    toast.success(`${menuItem.name} added to order`);
  };

  const handleEditItem = (index: number) => {
    const item = editedOrder.items[index];
    const menuItem = menuItems.find(m => m._id === item.menuItem || m.name === item.name);
    
    if (menuItem && menuItem.modifierGroups && menuItem.modifierGroups.length > 0) {
      setSelectedItem(menuItem);
      setTempModifiers([]); // In a real app, you'd parse existing modifiers
      setTempSpecialRequest(item.specialRequests || '');
      setEditingItemIndex(index);
      setShowModifierModal(true);
    }
  };

  const handleModifierConfirm = () => {
    if (selectedItem) {
      if (editingItemIndex !== null) {
        // Update existing item
        const newItems = [...editedOrder.items];
        const totalModifierPrice = tempModifiers.reduce((sum, mod) => sum + mod.price, 0);
        newItems[editingItemIndex] = {
          ...newItems[editingItemIndex],
          modifiers: tempModifiers.map(m => ({ name: m.name, price: m.price })),
          specialRequests: tempSpecialRequest,
          price: selectedItem.price + totalModifierPrice
        };
        setEditedOrder({ ...editedOrder, items: newItems });
        recalculateTotals(newItems);
      } else {
        // Add new item
        addItemToOrder(selectedItem, tempModifiers, tempSpecialRequest);
      }
      setShowModifierModal(false);
    }
  };

  const toggleModifier = (modifier: Modifier, group: ModifierGroup) => {
    const isSelected = tempModifiers.some(m => m._id === modifier._id);
    
    if (isSelected) {
      setTempModifiers(tempModifiers.filter(m => m._id !== modifier._id));
    } else {
      const selectedFromGroup = tempModifiers.filter(mod =>
        group.modifiers.some(gm => gm._id === mod._id)
      );
      
      if (selectedFromGroup.length >= (group.maxSelections || 999)) {
        toast.error(`You can only select ${group.maxSelections} option(s) from ${group.name}`);
        return;
      }
      
      setTempModifiers([...tempModifiers, modifier]);
    }
  };

  const recalculateTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const modifierTotal = (item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0) * item.quantity;
      return sum + itemTotal + modifierTotal;
    }, 0);
    
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax + (editedOrder.tip || 0) - (editedOrder.discount || 0);
    
    setEditedOrder(prev => ({ ...prev, subtotal, tax, total }));
  };

  const handleUpdateOrder = async () => {
    if (editedOrder.items.length === 0) {
      toast.error('Order must have at least one item');
      return;
    }

    // Check if order can be edited based on status
    if (['paid', 'cancelled'].includes(editedOrder.status)) {
      toast.error(`Cannot edit ${editedOrder.status} orders`);
      return;
    }

    setLoading(true);
    
    try {
      // Update order items
      for (const item of editedOrder.items) {
        if (item._id.startsWith('new-')) {
          // Add new item
          await ordersAPI.addItem(editedOrder._id, {
            menuItem: item.menuItem,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers,
            specialRequests: item.specialRequests,
            status: item.status,
            station: item.station,
            allergens: item.allergens,
            dietary: item.dietary
          });
        } else {
          // Update existing item
          const originalItem = order.items.find(i => i._id === item._id);
          if (originalItem) {
            if (originalItem.quantity !== item.quantity || 
                originalItem.specialRequests !== item.specialRequests) {
              await ordersAPI.updateItem(editedOrder._id, item._id, {
                quantity: item.quantity,
                specialRequests: item.specialRequests
              });
            }
          }
        }
      }

      // Remove deleted items
      for (const originalItem of order.items) {
        if (!editedOrder.items.find(item => item._id === originalItem._id)) {
          await ordersAPI.removeItem(editedOrder._id, originalItem._id);
        }
      }

      toast.success('Order updated successfully');
      onOrderUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update order');
    } finally {
      setLoading(false);
    }
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
              <div>
                <h2 className="text-xl font-semibold">Edit Order #{editedOrder.orderNumber}</h2>
                <p className="text-sm text-primary-200 mt-1">
                  Table {editedOrder.tableNumber} • {editedOrder.customerName}
                  {editedOrder.waiter && ` • Waiter: ${editedOrder.waiter.name}`}
                </p>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-gray-50 px-6 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm">
                <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${
                  editedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  editedOrder.status === 'paid' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {editedOrder.status.charAt(0).toUpperCase() + editedOrder.status.slice(1)}
                </span>
                <span className="text-gray-600">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Created: {format(new Date(editedOrder.createdAt), 'MMM dd, h:mm a')}
                </span>
              </div>
              {['paid', 'cancelled'].includes(editedOrder.status) && (
                <div className="bg-yellow-100 border-l-4 border-yellow-400 p-2">
                  <p className="text-sm text-yellow-700">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    This order is {editedOrder.status} and cannot be edited
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Current Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                {!['paid', 'cancelled'].includes(editedOrder.status) && (
                  <button
                    onClick={() => setShowAddItems(!showAddItems)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Items
                  </button>
                )}
              </div>

              {/* Add Items Section */}
              {showAddItems && (
                <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search menu items..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                    {filteredMenuItems.map(item => (
                      <button
                        key={item._id}
                        onClick={() => handleAddNewItem(item)}
                        className="text-left p-3 border border-gray-200 rounded-md hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          {getStationIcon(item.station)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">AED {(item.price || 0).toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {editedOrder.items.map((item, index) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{item.name}</h4>
                          {getStationIcon(item.station)}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.modifiers.map(m => m.name).join(', ')}
                          </p>
                        )}
                        
                        {/* Allergen & Dietary Info */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.allergens?.map(allergen => (
                            <span
                              key={allergen}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {allergen}
                            </span>
                          ))}
                          {item.dietary?.map(diet => (
                            <span
                              key={diet}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {diet}
                            </span>
                          ))}
                        </div>
                        
                        {/* Special Requests */}
                        {!['paid', 'cancelled'].includes(editedOrder.status) && item.status === 'pending' ? (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={item.specialRequests || ''}
                              onChange={(e) => handleSpecialRequestChange(index, e.target.value)}
                              className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Special requests..."
                            />
                          </div>
                        ) : item.specialRequests ? (
                          <p className="text-sm text-orange-600 italic mt-2">
                            Note: {item.specialRequests}
                          </p>
                        ) : null}
                      </div>
                      
                      <div className="ml-4 text-right">
                        <p className="font-medium">
                          AED {((item.price + (item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0)) * item.quantity).toFixed(2)}
                        </p>
                        
                        {!['paid', 'cancelled'].includes(editedOrder.status) && item.status === 'pending' && (
                          <div className="flex items-center justify-end mt-2 space-x-2">
                            <button
                              onClick={() => handleQuantityChange(index, -1)}
                              className="p-1 rounded-md hover:bg-gray-200"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="mx-2 font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(index, 1)}
                              className="p-1 rounded-md hover:bg-gray-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <button
                                onClick={() => handleEditItem(index)}
                                className="p-1 rounded-md hover:bg-gray-200 ml-2"
                                title="Edit modifiers"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 rounded-md hover:bg-red-100 text-red-600 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>AED {(editedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {editedOrder.discount && editedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount</span>
                    <span className="text-red-600">-AED {(editedOrder.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax (5%)</span>
                  <span>AED {(editedOrder.tax || 0).toFixed(2)}</span>
                </div>
                {editedOrder.tip && editedOrder.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip</span>
                    <span className="text-green-600">+AED {(editedOrder.tip || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>AED {(editedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              {!['paid', 'cancelled'].includes(editedOrder.status) && (
                <button
                  onClick={handleUpdateOrder}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Order
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modifier Modal */}
        {showModifierModal && selectedItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModifierModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="bg-primary-600 text-white px-4 py-3">
                <h3 className="font-medium">
                  {editingItemIndex !== null ? 'Edit' : 'Customize'} {selectedItem.name}
                </h3>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {selectedItem.modifierGroups?.map(group => (
                  <div key={group._id} className="mb-6">
                    <h4 className="font-medium mb-2">
                      {group.name}
                      {group.required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    {group.minSelections && (
                      <p className="text-sm text-gray-600 mb-2">
                        Select {group.minSelections} to {group.maxSelections || 'any'}
                      </p>
                    )}
                    <div className="space-y-2">
                      {group.modifiers.map(modifier => (
                        <label
                          key={modifier._id}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center">
                            <input
                              type={group.maxSelections === 1 ? 'radio' : 'checkbox'}
                              name={group._id}
                              checked={tempModifiers.some(m => m._id === modifier._id)}
                              onChange={() => toggleModifier(modifier, group)}
                              className="mr-3"
                            />
                            <span>{modifier.name}</span>
                          </div>
                          {modifier.price > 0 && (
                            <span className="text-sm text-gray-600">
                              +AED {(modifier.price || 0).toFixed(2)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={tempSpecialRequest}
                    onChange={(e) => setTempSpecialRequest(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="E.g., No onions, extra spicy..."
                  />
                </div>
              </div>
              
              <div className="p-4 border-t flex space-x-3">
                <button
                  onClick={() => setShowModifierModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModifierConfirm}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingItemIndex !== null ? 'Update' : 'Add'} Item
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditOrderModal;