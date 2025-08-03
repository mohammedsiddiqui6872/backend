import { useState, useEffect } from 'react';
import {
  X, Users, DollarSign, Plus, Minus, Check, AlertCircle,
  Calculator, UserPlus, Trash2, Copy, Edit2
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  specialRequests?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  tip?: number;
  discount?: number;
}

interface SplitCustomer {
  id: string;
  name: string;
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'wallet';
  paid: boolean;
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSplitComplete: () => void;
}

const SplitBillModal: React.FC<Props> = ({ order, isOpen, onClose, onSplitComplete }) => {
  const [splitCustomers, setSplitCustomers] = useState<SplitCustomer[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [splitMethod, setSplitMethod] = useState<'equal' | 'item' | 'custom'>('item');
  const [loading, setLoading] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<string>('');
  const [customerCount, setCustomerCount] = useState(2);
  const [showTipPercentage, setShowTipPercentage] = useState(false);
  const [tipPercentage, setTipPercentage] = useState(15);

  useEffect(() => {
    if (isOpen) {
      initializeSplit();
    }
  }, [isOpen, order]);

  const initializeSplit = () => {
    if (splitMethod === 'equal') {
      // Equal split
      const customers: SplitCustomer[] = [];
      const perPersonSubtotal = order.subtotal / customerCount;
      const perPersonTax = order.tax / customerCount;
      const perPersonTip = (order.tip || 0) / customerCount;
      
      for (let i = 0; i < customerCount; i++) {
        customers.push({
          id: `customer-${i + 1}`,
          name: `Customer ${i + 1}`,
          items: [],
          subtotal: perPersonSubtotal,
          tax: perPersonTax,
          tip: perPersonTip,
          total: perPersonSubtotal + perPersonTax + perPersonTip,
          paid: false
        });
      }
      
      setSplitCustomers(customers);
    } else {
      // Item-based or custom split
      setSplitCustomers([
        {
          id: 'customer-1',
          name: 'Customer 1',
          items: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          total: 0,
          paid: false
        },
        {
          id: 'customer-2',
          name: 'Customer 2',
          items: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          total: 0,
          paid: false
        }
      ]);
    }
    
    // Initialize selected items tracker
    const itemsTracker: Record<string, number> = {};
    order.items.forEach(item => {
      itemsTracker[item._id] = 0;
    });
    setSelectedItems(itemsTracker);
    setActiveCustomer('customer-1');
  };

  const calculateItemPrice = (item: OrderItem) => {
    const modifierPrice = item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
    return item.price + modifierPrice;
  };

  const addCustomer = () => {
    const newCustomer: SplitCustomer = {
      id: `customer-${splitCustomers.length + 1}`,
      name: `Customer ${splitCustomers.length + 1}`,
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      paid: false
    };
    setSplitCustomers([...splitCustomers, newCustomer]);
  };

  const removeCustomer = (customerId: string) => {
    if (splitCustomers.length <= 2) {
      toast.error('Minimum 2 customers required for split bill');
      return;
    }
    
    const customer = splitCustomers.find(c => c.id === customerId);
    if (customer) {
      // Return items to pool
      customer.items.forEach(item => {
        setSelectedItems(prev => ({
          ...prev,
          [item.itemId]: prev[item.itemId] - item.quantity
        }));
      });
    }
    
    setSplitCustomers(splitCustomers.filter(c => c.id !== customerId));
    if (activeCustomer === customerId) {
      setActiveCustomer(splitCustomers[0].id);
    }
  };

  const updateCustomerName = (customerId: string, name: string) => {
    setSplitCustomers(customers =>
      customers.map(c => c.id === customerId ? { ...c, name } : c)
    );
  };

  const assignItemToCustomer = (itemId: string, customerId: string, quantity: number) => {
    const item = order.items.find(i => i._id === itemId);
    if (!item) return;
    
    const totalAssigned = selectedItems[itemId] + quantity;
    if (totalAssigned > item.quantity) {
      toast.error(`Only ${item.quantity - selectedItems[itemId]} items remaining`);
      return;
    }
    
    setSplitCustomers(customers =>
      customers.map(customer => {
        if (customer.id === customerId) {
          const existingItem = customer.items.find(i => i.itemId === itemId);
          let newItems;
          
          if (existingItem) {
            newItems = customer.items.map(i =>
              i.itemId === itemId
                ? { ...i, quantity: i.quantity + quantity }
                : i
            );
          } else {
            newItems = [...customer.items, { itemId, quantity }];
          }
          
          const subtotal = calculateCustomerSubtotal(newItems);
          const tax = subtotal * 0.05;
          const tip = showTipPercentage ? subtotal * (tipPercentage / 100) : customer.tip;
          
          return {
            ...customer,
            items: newItems,
            subtotal,
            tax,
            tip,
            total: subtotal + tax + tip
          };
        }
        return customer;
      })
    );
    
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: prev[itemId] + quantity
    }));
  };

  const removeItemFromCustomer = (itemId: string, customerId: string, quantity: number) => {
    setSplitCustomers(customers =>
      customers.map(customer => {
        if (customer.id === customerId) {
          const newItems = customer.items
            .map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - quantity } : i)
            .filter(i => i.quantity > 0);
          
          const subtotal = calculateCustomerSubtotal(newItems);
          const tax = subtotal * 0.05;
          const tip = showTipPercentage ? subtotal * (tipPercentage / 100) : customer.tip;
          
          return {
            ...customer,
            items: newItems,
            subtotal,
            tax,
            tip,
            total: subtotal + tax + tip
          };
        }
        return customer;
      })
    );
    
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: prev[itemId] - quantity
    }));
  };

  const calculateCustomerSubtotal = (customerItems: Array<{ itemId: string; quantity: number }>) => {
    return customerItems.reduce((sum, customerItem) => {
      const item = order.items.find(i => i._id === customerItem.itemId);
      if (item) {
        return sum + (calculateItemPrice(item) * customerItem.quantity);
      }
      return sum;
    }, 0);
  };

  const updateCustomerTip = (customerId: string, tip: number) => {
    setSplitCustomers(customers =>
      customers.map(customer => {
        if (customer.id === customerId) {
          return {
            ...customer,
            tip,
            total: customer.subtotal + customer.tax + tip
          };
        }
        return customer;
      })
    );
  };

  const applyTipPercentageToAll = () => {
    setSplitCustomers(customers =>
      customers.map(customer => {
        const tip = customer.subtotal * (tipPercentage / 100);
        return {
          ...customer,
          tip,
          total: customer.subtotal + customer.tax + tip
        };
      })
    );
  };

  const validateSplit = () => {
    // Check if all items are assigned
    const unassignedItems = order.items.filter(item => 
      selectedItems[item._id] < item.quantity
    );
    
    if (unassignedItems.length > 0) {
      toast.error('All items must be assigned to customers');
      return false;
    }
    
    // Check if all customers have items (for item-based split)
    if (splitMethod === 'item') {
      const emptyCustomers = splitCustomers.filter(c => c.items.length === 0);
      if (emptyCustomers.length > 0) {
        toast.error('All customers must have at least one item');
        return false;
      }
    }
    
    // Check if all customers have names
    const unnamedCustomers = splitCustomers.filter(c => !c.name.trim());
    if (unnamedCustomers.length > 0) {
      toast.error('All customers must have names');
      return false;
    }
    
    return true;
  };

  const handleSplitBill = async () => {
    if (!validateSplit()) return;
    
    setLoading(true);
    
    try {
      // Create split orders
      const splitOrders = await Promise.all(
        splitCustomers.map(async (customer) => {
          const splitOrderData = {
            originalOrderId: order._id,
            tableNumber: order.tableNumber,
            customerName: customer.name,
            items: customer.items.map(ci => {
              const originalItem = order.items.find(i => i._id === ci.itemId)!;
              return {
                ...originalItem,
                quantity: ci.quantity,
                _id: undefined // Remove _id for new order
              };
            }),
            subtotal: customer.subtotal,
            tax: customer.tax,
            tip: customer.tip,
            total: customer.total,
            status: 'served',
            paymentStatus: 'pending',
            splitFrom: order.orderNumber,
            createdBy: 'split-bill'
          };
          
          return await ordersAPI.createOrder(splitOrderData);
        })
      );
      
      // Cancel original order with reason
      await ordersAPI.cancelOrder(order._id, `Split into ${splitCustomers.length} bills`);
      
      toast.success(`Bill split into ${splitCustomers.length} orders successfully`);
      onSplitComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to split bill');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const remainingItems = order.items.filter(item => 
    selectedItems[item._id] < item.quantity
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Split Bill - Order #{order.orderNumber}</h2>
                <p className="text-sm text-primary-200 mt-1">
                  Table {order.tableNumber} • Total: AED {order.total.toFixed(2)}
                </p>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Split Method Selection */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Split Method:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSplitMethod('equal');
                    initializeSplit();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    splitMethod === 'equal'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Equal Split
                </button>
                <button
                  onClick={() => {
                    setSplitMethod('item');
                    initializeSplit();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    splitMethod === 'item'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  By Items
                </button>
                <button
                  onClick={() => {
                    setSplitMethod('custom');
                    initializeSplit();
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    splitMethod === 'custom'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {splitMethod === 'equal' && (
                <div className="flex items-center ml-4">
                  <span className="text-sm text-gray-600 mr-2">Number of people:</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={customerCount}
                    onChange={(e) => {
                      setCustomerCount(parseInt(e.target.value) || 2);
                      initializeSplit();
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              
              <div className="flex items-center ml-auto">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTipPercentage}
                    onChange={(e) => setShowTipPercentage(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Apply tip percentage</span>
                </label>
                {showTipPercentage && (
                  <>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tipPercentage}
                      onChange={(e) => setTipPercentage(parseInt(e.target.value) || 0)}
                      className="w-16 mx-2 px-2 py-1 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-sm text-gray-600 mr-2">%</span>
                    <button
                      onClick={applyTipPercentageToAll}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                    >
                      Apply
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-200px)]">
            {/* Left Panel - Items */}
            {splitMethod !== 'equal' && (
              <div className="w-1/3 p-6 border-r bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-4">
                  {remainingItems.length > 0 ? 'Unassigned Items' : 'All Items Assigned'}
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-[calc(100%-2rem)]">
                  {order.items.map(item => {
                    const remaining = item.quantity - selectedItems[item._id];
                    const itemPrice = calculateItemPrice(item);
                    
                    return (
                      <div
                        key={item._id}
                        className={`p-3 rounded-lg border ${
                          remaining > 0 ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <p className="text-xs text-gray-600">
                                {item.modifiers.map(m => m.name).join(', ')}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              AED {itemPrice.toFixed(2)} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {remaining} / {item.quantity}
                            </p>
                            <p className="text-xs text-gray-600">remaining</p>
                          </div>
                        </div>
                        
                        {remaining > 0 && activeCustomer && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Assign to active:</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => assignItemToCustomer(item._id, activeCustomer, 1)}
                                className="p-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => assignItemToCustomer(item._id, activeCustomer, remaining)}
                                className="px-2 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                              >
                                All
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right Panel - Customers */}
            <div className={`flex-1 p-6 ${splitMethod === 'equal' ? 'w-full' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Customer Bills</h3>
                {splitMethod !== 'equal' && (
                  <button
                    onClick={addCustomer}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Customer
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100%-3rem)]">
                {splitCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      activeCustomer === customer.id && splitMethod !== 'equal'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => splitMethod !== 'equal' && setActiveCustomer(customer.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e) => updateCustomerName(customer.id, e.target.value)}
                          className="font-medium bg-transparent border-b border-gray-300 focus:border-primary-500 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {activeCustomer === customer.id && splitMethod !== 'equal' && (
                          <span className="ml-2 text-xs text-primary-600 font-medium">Active</span>
                        )}
                      </div>
                      {splitCustomers.length > 2 && splitMethod !== 'equal' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomer(customer.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Customer Items */}
                    {splitMethod !== 'equal' && (
                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                        {customer.items.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No items assigned</p>
                        ) : (
                          customer.items.map(ci => {
                            const item = order.items.find(i => i._id === ci.itemId)!;
                            const itemPrice = calculateItemPrice(item);
                            
                            return (
                              <div key={ci.itemId} className="flex items-center justify-between text-sm">
                                <div className="flex-1">
                                  <span>{item.name}</span>
                                  <span className="text-gray-600 ml-1">x{ci.quantity}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600">
                                    AED {(itemPrice * ci.quantity).toFixed(2)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItemFromCustomer(ci.itemId, customer.id, 1);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                    
                    {/* Customer Totals */}
                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>AED {customer.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (5%):</span>
                        <span>AED {customer.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tip:</span>
                        <div className="flex items-center space-x-1">
                          <span>AED</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customer.tip}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateCustomerTip(customer.id, parseFloat(e.target.value) || 0);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between font-medium pt-1 border-t">
                        <span>Total:</span>
                        <span>AED {customer.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-gray-600">Original Total:</span>
                  <span className="font-medium ml-2">AED {order.total.toFixed(2)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Split Total:</span>
                  <span className="font-medium ml-2">
                    AED {splitCustomers.reduce((sum, c) => sum + c.total, 0).toFixed(2)}
                  </span>
                </div>
                {remainingItems.length > 0 && splitMethod !== 'equal' && (
                  <div className="flex items-center text-yellow-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {remainingItems.length} items unassigned
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitBill}
                  disabled={loading || (remainingItems.length > 0 && splitMethod !== 'equal')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Split Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitBillModal;