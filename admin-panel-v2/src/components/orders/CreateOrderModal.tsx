import { useState, useEffect } from 'react';
import {
  X, Plus, Minus, Search, User, MapPin, Phone, ShoppingCart,
  AlertCircle, Tag, Info, ChefHat, Flame, Salad, IceCream,
  Coffee, AlertTriangle, CheckCircle, Package, Clock
} from 'lucide-react';
import { menuAPI, tablesAPI, ordersAPI } from '../../services/api';
import ComboItemModal from './ComboItemModal';
import RecipeCustomization from './RecipeCustomization';
import PrepTimePrediction from './PrepTimePrediction';
import toast from 'react-hot-toast';

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

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: Modifier[];
  specialRequests?: string;
  totalPrice: number;
  isCombo?: boolean;
  comboDetails?: any;
  recipeCustomizations?: any[];
}

interface Table {
  _id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  section?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

const CreateOrderModal: React.FC<Props> = ({ isOpen, onClose, onOrderCreated }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [tempModifiers, setTempModifiers] = useState<Modifier[]>([]);
  const [tempSpecialRequest, setTempSpecialRequest] = useState('');
  const [showComboModal, setShowComboModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<MenuItem | null>(null);
  const [estimatedPrepTime, setEstimatedPrepTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [menuRes, tablesRes, categoriesRes] = await Promise.all([
        menuAPI.getItems(),
        tablesAPI.getTables(),
        menuAPI.getCategories()
      ]);
      
      setMenuItems(menuRes.data.filter((item: MenuItem) => item.isAvailable));
      setTables(tablesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
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

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category._id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.nameAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setSelectedItem(item);
      setTempModifiers([]);
      setTempSpecialRequest('');
      setShowModifierModal(true);
    } else {
      addItemToCart(item, [], '');
    }
  };

  const handlePrepTimePrediction = (predictions: any[]) => {
    if (predictions && predictions.length > 0) {
      const totalTime = predictions.reduce((sum, pred) => sum + pred.predictedTime, 0);
      setEstimatedPrepTime(totalTime);
    }
  };

  const handleRecipeCustomization = (customizations: any[]) => {
    if (!selectedItemForRecipe) return;
    
    // Find the cart item and update its customizations
    const updatedCart = cart.map(item => {
      if (item.menuItem._id === selectedItemForRecipe._id) {
        return {
          ...item,
          recipeCustomizations: customizations,
          specialRequests: item.specialRequests + 
            (customizations.find(c => c.customizationId === 'special-instructions')?.optionLabel || '')
        };
      }
      return item;
    });
    
    setCart(updatedCart);
    toast.success('Recipe customizations applied');
  };

  const handleComboSelected = (comboData: any) => {
    // Add combo as a special cart item
    const comboItem: CartItem = {
      menuItem: {
        _id: `combo-${Date.now()}`,
        name: comboData.combo.name,
        nameAr: comboData.combo.name,
        description: comboData.combo.description || '',
        price: comboData.combo.price,
        category: { _id: 'combo', name: 'Combo' },
        isAvailable: true
      },
      quantity: 1,
      selectedModifiers: [],
      specialRequests: `Combo Items: ${comboData.items.map((cat: any) => 
        `${cat.category}: ${cat.items.map((i: any) => i.name).join(', ')}`
      ).join(' | ')}`,
      totalPrice: comboData.combo.price,
      isCombo: true,
      comboDetails: comboData
    };
    
    setCart([...cart, comboItem]);
    toast.success(`${comboData.combo.name} added to cart`);
  };

  const addItemToCart = (item: MenuItem, modifiers: Modifier[], specialRequest: string) => {
    const existingItemIndex = cart.findIndex(
      cartItem => 
        cartItem.menuItem._id === item._id &&
        JSON.stringify(cartItem.selectedModifiers) === JSON.stringify(modifiers) &&
        cartItem.specialRequests === specialRequest
    );

    if (existingItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      newCart[existingItemIndex].totalPrice = calculateItemPrice(
        item,
        modifiers,
        newCart[existingItemIndex].quantity
      );
      setCart(newCart);
    } else {
      const newItem: CartItem = {
        menuItem: item,
        quantity: 1,
        selectedModifiers: modifiers,
        specialRequests: specialRequest,
        totalPrice: calculateItemPrice(item, modifiers, 1)
      };
      setCart([...cart, newItem]);
    }
    
    toast.success(`${item.name} added to cart`);
  };

  const calculateItemPrice = (item: MenuItem, modifiers: Modifier[], quantity: number) => {
    const basePrice = item.price;
    const modifierPrice = modifiers.reduce((sum, mod) => sum + mod.price, 0);
    return (basePrice + modifierPrice) * quantity;
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].totalPrice = calculateItemPrice(
        newCart[index].menuItem,
        newCart[index].selectedModifiers,
        newCart[index].quantity
      );
    }
    
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCreateOrder = async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }
    
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      const orderData = {
        tableNumber: selectedTable,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map(item => ({
          menuItem: item.menuItem._id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          modifiers: item.selectedModifiers.map(mod => ({
            name: mod.name,
            price: mod.price
          })),
          specialRequests: item.specialRequests,
          status: 'pending',
          station: item.menuItem.station || 'main',
          allergens: item.menuItem.allergens,
          dietary: item.menuItem.dietary
        })),
        subtotal,
        tax,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        createdBy: 'admin',
        createdAt: new Date()
      };

      await ordersAPI.createOrder(orderData);
      toast.success('Order created successfully');
      onOrderCreated();
      onClose();
      
      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedTable('');
      setActiveTab('menu');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleModifierConfirm = () => {
    if (selectedItem) {
      // Validate required modifiers
      const requiredGroups = selectedItem.modifierGroups?.filter(g => g.required) || [];
      
      for (const group of requiredGroups) {
        const selectedFromGroup = tempModifiers.filter(mod =>
          group.modifiers.some(gm => gm._id === mod._id)
        );
        
        if (selectedFromGroup.length < (group.minSelections || 1)) {
          toast.error(`Please select at least ${group.minSelections || 1} option(s) from ${group.name}`);
          return;
        }
      }
      
      addItemToCart(selectedItem, tempModifiers, tempSpecialRequest);
      setShowModifierModal(false);
    }
  };

  const toggleModifier = (modifier: Modifier, group: ModifierGroup) => {
    const isSelected = tempModifiers.some(m => m._id === modifier._id);
    
    if (isSelected) {
      setTempModifiers(tempModifiers.filter(m => m._id !== modifier._id));
    } else {
      // Check max selections for the group
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New Order</h2>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Customer Info Bar */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select Table</option>
                  {tables
                    .filter(table => table.status === 'available')
                    .map(table => (
                      <option key={table._id} value={table.number}>
                        Table {table.number} ({table.capacity} seats)
                        {table.section && ` - ${table.section}`}
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setActiveTab(activeTab === 'menu' ? 'cart' : 'menu')}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center justify-center"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart ({cart.length})
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-200px)]">
            {/* Menu Section */}
            {activeTab === 'menu' && (
              <div className="flex-1 flex">
                {/* Categories Sidebar */}
                <div className="w-48 bg-gray-50 p-4 overflow-y-auto">
                  <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-md mb-2 ${
                      selectedCategory === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    onClick={() => setShowComboModal(true)}
                    className="w-full text-left px-3 py-2 rounded-md mb-2 bg-green-600 text-white hover:bg-green-700 flex items-center"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Combos
                  </button>
                  {categories.map(category => (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategory(category._id)}
                      className={`w-full text-left px-3 py-2 rounded-md mb-2 ${
                        selectedCategory === category._id
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Menu Items */}
                <div className="flex-1 p-6">
                  {/* Search */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Search menu items..."
                      />
                    </div>
                  </div>

                  {/* Items Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100%-80px)]">
                    {filteredItems.map(item => (
                      <div
                        key={item._id}
                        className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleAddToCart(item)}
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {getStationIcon(item.station)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {item.description}
                        </p>
                        
                        {/* Allergen & Dietary Info */}
                        <div className="flex flex-wrap gap-1 mb-2">
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
                        
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-primary-600">
                            AED {item.price.toFixed(2)}
                          </span>
                          <button className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cart Section */}
            {activeTab === 'cart' && (
              <div className="flex-1 p-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                    <button
                      onClick={() => setActiveTab('menu')}
                      className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <h3 className="text-lg font-medium mb-4">Order Items</h3>
                    
                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div key={index} className="border-b pb-4 mb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.menuItem.name}</h4>
                              
                              {item.selectedModifiers.length > 0 && (
                                <p className="text-sm text-gray-600">
                                  {item.selectedModifiers.map(m => m.name).join(', ')}
                                </p>
                              )}
                              
                              {item.specialRequests && (
                                <p className="text-sm text-orange-600 italic">
                                  Note: {item.specialRequests}
                                </p>
                              )}

                              {item.recipeCustomizations && item.recipeCustomizations.length > 0 && (
                                <p className="text-sm text-blue-600">
                                  Customized: {item.recipeCustomizations.map(c => c.optionLabel).join(', ')}
                                </p>
                              )}
                              
                              <div className="flex items-center mt-2 space-x-2">
                                {!item.isCombo && (
                                  <button
                                    onClick={() => {
                                      setSelectedItemForRecipe(item.menuItem);
                                      setShowRecipeModal(true);
                                    }}
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                                  >
                                    <ChefHat className="h-4 w-4 mr-1" />
                                    Customize
                                  </button>
                                )}
                                <div className="flex items-center">
                                  <button
                                    onClick={() => updateQuantity(index, -1)}
                                    className="p-1 rounded-md hover:bg-gray-200"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="mx-3 font-medium">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(index, 1)}
                                    className="p-1 rounded-md hover:bg-gray-200"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="font-medium">
                                AED {item.totalPrice.toFixed(2)}
                              </p>
                              <button
                                onClick={() => removeFromCart(index)}
                                className="text-red-600 hover:text-red-800 text-sm mt-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>AED {calculateTotals().subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax (5%)</span>
                          <span>AED {calculateTotals().tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-medium">
                          <span>Total</span>
                          <span>AED {calculateTotals().total.toFixed(2)}</span>
                        </div>
                        {estimatedPrepTime > 0 && (
                          <div className="flex justify-between text-sm mt-2">
                            <span className="flex items-center text-gray-600">
                              <Clock className="h-4 w-4 mr-1" />
                              Estimated Prep Time
                            </span>
                            <span className="font-medium text-primary-600">
                              {estimatedPrepTime < 60 ? `${estimatedPrepTime}m` : `${Math.floor(estimatedPrepTime/60)}h ${estimatedPrepTime%60}m`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={handleCreateOrder}
                        disabled={loading || !selectedTable || !customerName.trim()}
                        className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating Order...' : 'Create Order'}
                      </button>
                    </div>

                    {/* Prep Time Predictions */}
                    {cart.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <PrepTimePrediction
                          orderItems={cart.map(item => ({
                            menuItemId: item.menuItem._id,
                            quantity: item.quantity,
                            customizations: item.recipeCustomizations
                          }))}
                          onPredictionComplete={handlePrepTimePrediction}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modifier Modal */}
        {showModifierModal && selectedItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModifierModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="bg-primary-600 text-white px-4 py-3">
                <h3 className="font-medium">Customize {selectedItem.name}</h3>
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
                              +AED {modifier.price.toFixed(2)}
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
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Combo Modal */}
        <ComboItemModal
          isOpen={showComboModal}
          onClose={() => setShowComboModal(false)}
          onComboSelected={handleComboSelected}
        />

        {/* Recipe Customization Modal */}
        {selectedItemForRecipe && (
          <RecipeCustomization
            menuItemId={selectedItemForRecipe._id}
            isOpen={showRecipeModal}
            onClose={() => {
              setShowRecipeModal(false);
              setSelectedItemForRecipe(null);
            }}
            onCustomizationSelected={handleRecipeCustomization}
            existingCustomizations={
              cart.find(item => item.menuItem._id === selectedItemForRecipe._id)?.recipeCustomizations || []
            }
          />
        )}
      </div>
    </div>
  );
};

export default CreateOrderModal;