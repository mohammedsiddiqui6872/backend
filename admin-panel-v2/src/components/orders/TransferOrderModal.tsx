import { useState, useEffect } from 'react';
import {
  X, ArrowRight, MapPin, User, AlertCircle, CheckCircle,
  ShoppingBag, Clock, Info
} from 'lucide-react';
import { ordersAPI, tablesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  status: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  items: OrderItem[];
  status: string;
  paymentStatus: string;
  total: number;
  waiter?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Table {
  _id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  section?: string;
  currentOrder?: string;
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onTransferComplete: () => void;
}

const TransferOrderModal: React.FC<Props> = ({ order, isOpen, onClose, onTransferComplete }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [availableTablesOnly, setAvailableTablesOnly] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen]);

  const fetchTables = async () => {
    try {
      const response = await tablesAPI.getTables();
      setTables(response.data.filter((table: Table) => table.number !== order.tableNumber));
    } catch (error) {
      toast.error('Failed to fetch tables');
    }
  };

  const filteredTables = availableTablesOnly 
    ? tables.filter(table => table.status === 'available')
    : tables;

  const getTableStatusBadge = (status: string) => {
    const badges = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      reserved: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const handleTransferOrder = async () => {
    if (!selectedTable) {
      toast.error('Please select a destination table');
      return;
    }

    if (!transferReason.trim()) {
      toast.error('Please provide a reason for the transfer');
      return;
    }

    setLoading(true);

    try {
      // Update order with new table number
      await ordersAPI.updateOrder(order._id, {
        tableNumber: selectedTable,
        transferHistory: {
          fromTable: order.tableNumber,
          toTable: selectedTable,
          reason: transferReason.trim(),
          transferredAt: new Date(),
          transferredBy: 'admin' // In production, get from auth
        }
      });

      // Update table statuses
      // Free up the old table
      await tablesAPI.updateTableStatus(order.tableNumber, 'available');
      
      // Occupy the new table
      await tablesAPI.updateTableStatus(selectedTable, 'occupied');

      toast.success(`Order #${order.orderNumber} transferred from Table ${order.tableNumber} to Table ${selectedTable}`);
      onTransferComplete();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to transfer order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ArrowRight className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-semibold">Transfer Order</h2>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Order #{order.orderNumber}</h3>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Current: Table {order.tableNumber}
                  </span>
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {order.customerName}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(order.createdAt), 'h:mm a')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{order.items.length} items</p>
                <p className="font-medium">AED {order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Transfer Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Transfer <span className="text-red-500">*</span>
              </label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                rows={2}
                placeholder="E.g., Customer requested larger table, Table needed for reservation..."
              />
            </div>

            {/* Table Filter */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Select Destination Table</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={availableTablesOnly}
                  onChange={(e) => setAvailableTablesOnly(e.target.checked)}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Show available tables only</span>
              </label>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {filteredTables.map(table => (
                <button
                  key={table._id}
                  onClick={() => setSelectedTable(table.number)}
                  disabled={table.status === 'occupied' && !!table.currentOrder}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedTable === table.number
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    table.status === 'occupied' && table.currentOrder
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <div className="text-center">
                    <p className="font-medium text-lg">Table {table.number}</p>
                    {table.section && (
                      <p className="text-xs text-gray-500">{table.section}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {table.capacity} seats
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${getTableStatusBadge(table.status)}`}>
                      {table.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Warning for occupied tables */}
            {selectedTable && tables.find(t => t.number === selectedTable)?.status === 'occupied' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Table {selectedTable} is currently occupied.
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This will merge with any existing orders on that table.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Summary */}
            {selectedTable && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">Transfer Summary</h4>
                <div className="flex items-center text-sm text-blue-800">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Table {order.tableNumber}
                  </div>
                  <ArrowRight className="h-4 w-4 mx-3" />
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Table {selectedTable}
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Order #{order.orderNumber} with {order.items.length} items will be transferred
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <Info className="h-4 w-4 mr-1" />
                Table availability will be updated automatically
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOrder}
                  disabled={loading || !selectedTable || !transferReason.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Transfer Order
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

export default TransferOrderModal;