import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { stockAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface StockManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: {
    _id: string;
    name: string;
    stockQuantity: number;
    lowStockThreshold: number;
    reorderPoint: number;
    reorderQuantity: number;
  };
  onUpdate: () => void;
}

const StockManagementModal: React.FC<StockManagementModalProps> = ({
  isOpen,
  onClose,
  menuItem,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState('adjust');
  const [adjustmentType, setAdjustmentType] = useState<'adjustment' | 'restock'>('adjustment');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState<number>(0);
  const [wasteReason, setWasteReason] = useState('');
  const [settings, setSettings] = useState({
    lowStockThreshold: menuItem.lowStockThreshold || 10,
    reorderPoint: menuItem.reorderPoint || 20,
    reorderQuantity: menuItem.reorderQuantity || 50
  });
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchTransactions();
    }
  }, [isOpen, activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const response = await stockAPI.getTransactions({
        menuItemId: menuItem._id,
        limit: 10
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleAdjustStock = async () => {
    if (quantity === 0) {
      toast.error('Please enter a quantity');
      return;
    }

    try {
      setLoading(true);
      await stockAPI.adjustStock({
        menuItemId: menuItem._id,
        quantity: adjustmentType === 'adjustment' ? quantity : Math.abs(quantity),
        reason,
        type: adjustmentType
      });
      
      toast.success('Stock adjusted successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordWaste = async () => {
    if (wasteQuantity <= 0) {
      toast.error('Please enter a valid waste quantity');
      return;
    }
    if (!wasteReason.trim()) {
      toast.error('Please provide a reason for waste');
      return;
    }

    try {
      setLoading(true);
      await stockAPI.recordWaste({
        menuItemId: menuItem._id,
        quantity: wasteQuantity,
        reason: wasteReason
      });
      
      toast.success('Waste recorded successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record waste');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      await stockAPI.updateSettings(menuItem._id, settings);
      toast.success('Stock settings updated successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, quantity: number) => {
    if (quantity > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-blue-600';
      case 'restock': return 'text-green-600';
      case 'waste': return 'text-red-600';
      case 'adjustment': return 'text-gray-600';
      case 'return': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Stock Management - {menuItem.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Current Stock: {menuItem.stockQuantity === -1 ? 'Unlimited' : menuItem.stockQuantity}
              {menuItem.stockQuantity !== -1 && menuItem.stockQuantity <= menuItem.lowStockThreshold && (
                <span className="ml-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Low Stock
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('adjust')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'adjust'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Adjust Stock
            </button>
            <button
              onClick={() => setActiveTab('waste')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'waste'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Record Waste
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as 'adjustment' | 'restock')}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="adjustment">Set Stock Level</option>
                <option value="restock">Add to Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {adjustmentType === 'adjustment' ? 'New Stock Level' : 'Quantity to Add'}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="0"
                placeholder={adjustmentType === 'adjustment' ? 'Enter new stock level' : 'Enter quantity to add'}
              />
              {adjustmentType === 'restock' && (
                <p className="mt-1 text-sm text-gray-500">
                  New stock level will be: {menuItem.stockQuantity + Math.abs(quantity)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter reason for adjustment"
              />
            </div>

            <button
              onClick={handleAdjustStock}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  {adjustmentType === 'adjustment' ? 'Adjust Stock' : 'Add Stock'}
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'waste' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waste Quantity
              </label>
              <input
                type="number"
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(parseInt(e.target.value) || 0)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="1"
                max={menuItem.stockQuantity}
                placeholder="Enter quantity wasted"
              />
              <p className="mt-1 text-sm text-gray-500">
                Available stock: {menuItem.stockQuantity}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <textarea
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                rows={3}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter reason for waste (e.g., expired, damaged, spillage)"
                required
              />
            </div>

            <button
              onClick={handleRecordWaste}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Record Waste
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Alert when stock falls below this level
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Point
              </label>
              <input
                type="number"
                value={settings.reorderPoint}
                onChange={(e) => setSettings({ ...settings, reorderPoint: parseInt(e.target.value) || 0 })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Suggest reordering when stock reaches this level
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Quantity
              </label>
              <input
                type="number"
                value={settings.reorderQuantity}
                onChange={(e) => setSettings({ ...settings, reorderQuantity: parseInt(e.target.value) || 1 })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                min="1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Suggested quantity to reorder
              </p>
            </div>

            <button
              onClick={handleUpdateSettings}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Settings'
              )}
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {loadingTransactions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div key={transaction._id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.transactionType, transaction.quantity)}
                        <span className={`font-medium ${getTransactionColor(transaction.transactionType)}`}>
                          {transaction.transactionType.charAt(0).toUpperCase() + transaction.transactionType.slice(1)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">
                        {transaction.previousStock} → {transaction.newStock}
                      </span>
                      <span className={`ml-2 font-medium ${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({transaction.quantity > 0 ? '+' : ''}{transaction.quantity})
                      </span>
                    </div>
                    {transaction.reason && (
                      <p className="mt-1 text-sm text-gray-500">{transaction.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManagementModal;