import { useState } from 'react';
import {
  X, CreditCard, Banknote, Smartphone, Wallet,
  DollarSign, Calculator, CheckCircle, AlertCircle
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
}

const PaymentModal: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onPaymentComplete
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'wallet'>('cash');
  const [amountReceived, setAmountReceived] = useState(order.total.toString());
  const [tip, setTip] = useState('0');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const calculateChange = () => {
    const received = parseFloat(amountReceived) || 0;
    const total = order.total + parseFloat(tip);
    return received - total;
  };

  const calculateTotalWithTip = () => {
    return order.total + parseFloat(tip);
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);

      // Validate payment
      if (paymentMethod === 'cash') {
        const received = parseFloat(amountReceived) || 0;
        const totalAmount = calculateTotalWithTip();
        
        if (received < totalAmount) {
          toast.error('Insufficient amount received');
          return;
        }
      }

      // Process payment
      await ordersAPI.processPayment(order._id, {
        paymentMethod,
        amountPaid: parseFloat(amountReceived) || calculateTotalWithTip(),
        tip: parseFloat(tip) || 0
      });

      toast.success('Payment processed successfully');
      onPaymentComplete();
    } catch (error) {
      toast.error('Failed to process payment');
      console.error('Payment error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const quickTipOptions = [
    { label: '10%', value: (order.subtotal * 0.1).toFixed(2) },
    { label: '15%', value: (order.subtotal * 0.15).toFixed(2) },
    { label: '20%', value: (order.subtotal * 0.2).toFixed(2) },
  ];

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'upi', label: 'UPI', icon: Smartphone },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                Process Payment - Order #{order.orderNumber}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-green-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Table {order.tableNumber}</span>
                <span className="text-sm font-medium">{order.customerName}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>AED {order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span className="text-red-600">-AED {order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>AED {order.tax.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>AED {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id as any)}
                    className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-colors ${
                      paymentMethod === id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Add Tip (Optional)
              </label>
              <div className="flex items-center space-x-2 mb-2">
                {quickTipOptions.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setTip(value)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      tip === value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setTip('0')}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    tip === '0'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  No Tip
                </button>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter tip amount"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Amount Received (for cash) */}
            {paymentMethod === 'cash' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Enter amount received"
                    step="0.01"
                    min={calculateTotalWithTip().toString()}
                  />
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Order Total:</span>
                  <span>AED {order.total.toFixed(2)}</span>
                </div>
                {parseFloat(tip) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip:</span>
                    <span className="text-green-600">+AED {parseFloat(tip).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200">
                  <span>Total to Pay:</span>
                  <span>AED {calculateTotalWithTip().toFixed(2)}</span>
                </div>
                {paymentMethod === 'cash' && parseFloat(amountReceived) > 0 && (
                  <>
                    <div className="flex justify-between text-sm pt-2">
                      <span>Amount Received:</span>
                      <span>AED {parseFloat(amountReceived).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-base">
                      <span>Change:</span>
                      <span className={calculateChange() < 0 ? 'text-red-600' : 'text-green-600'}>
                        AED {Math.abs(calculateChange()).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Warning for insufficient payment */}
            {paymentMethod === 'cash' && calculateChange() < 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="ml-3 text-sm text-red-700">
                    Insufficient amount. Customer needs to pay AED {Math.abs(calculateChange()).toFixed(2)} more.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={processing || (paymentMethod === 'cash' && calculateChange() < 0)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;