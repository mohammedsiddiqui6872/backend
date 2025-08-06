import { FC } from 'react';
import { Package, Clock, Hash, Phone, MessageSquare } from 'lucide-react';

interface OrderSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const OrderSettings: FC<OrderSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  return (
    <div className="space-y-6">
      {/* Order Configuration */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Order Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Order Number Prefix</label>
            <input
              type="text"
              value={settings.orders?.orderNumberPrefix || 'ORD'}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, orderNumberPrefix: e.target.value }
              })}
              placeholder="ORD"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Example: ORD-000001</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Order Number Length</label>
            <input
              type="number"
              value={settings.orders?.orderNumberLength || 6}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, orderNumberLength: parseInt(e.target.value) }
              })}
              min="4"
              max="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Number of digits in order number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Order Amount</label>
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-gray-500">{settings.general?.currencySymbol || 'AED'}</span>
              <input
                type="number"
                value={settings.orders?.minimumOrderAmount || 0}
                onChange={(e) => onChange({
                  ...settings,
                  orders: { ...settings.orders, minimumOrderAmount: parseFloat(e.target.value) }
                })}
                min="0"
                step="0.5"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Set to 0 for no minimum</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Prep Time (minutes)</label>
            <input
              type="number"
              value={settings.orders?.estimatedPrepTime || 30}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, estimatedPrepTime: parseInt(e.target.value) }
              })}
              min="5"
              max="120"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">Default preparation time for orders</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Advance Order Days</label>
            <input
              type="number"
              value={settings.orders?.maxAdvanceOrderDays || 7}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, maxAdvanceOrderDays: parseInt(e.target.value) }
              })}
              min="1"
              max="90"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500">How far in advance customers can place orders</p>
          </div>
        </div>
      </div>

      {/* Order Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Order Features
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.allowGuestOrders ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, allowGuestOrders: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Allow Guest Orders (without login)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.requirePhoneVerification ?? false}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, requirePhoneVerification: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Require Phone Verification</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.autoAcceptOrders ?? false}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, autoAcceptOrders: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-Accept Orders</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.autoAssignWaiter ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, autoAssignWaiter: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-Assign Waiter to Tables</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.enableOrderComments ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enableOrderComments: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Order Comments</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.enableSpecialRequests ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enableSpecialRequests: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Special Requests</span>
          </label>
        </div>
      </div>

      {/* Order Types */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center p-4 border rounded-lg">
            <input
              type="checkbox"
              checked={settings.orders?.enableDineIn ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enableDineIn: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">Dine In</span>
              <p className="text-xs text-gray-500">Accept dine-in orders</p>
            </div>
          </label>

          <label className="flex items-center p-4 border rounded-lg">
            <input
              type="checkbox"
              checked={settings.orders?.enableTakeaway ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enableTakeaway: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">Takeaway</span>
              <p className="text-xs text-gray-500">Accept takeaway orders</p>
            </div>
          </label>

          <label className="flex items-center p-4 border rounded-lg">
            <input
              type="checkbox"
              checked={settings.orders?.enableDelivery ?? false}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enableDelivery: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">Delivery</span>
              <p className="text-xs text-gray-500">Accept delivery orders</p>
            </div>
          </label>

          <label className="flex items-center p-4 border rounded-lg">
            <input
              type="checkbox"
              checked={settings.orders?.enablePreorder ?? false}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, enablePreorder: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">Pre-order</span>
              <p className="text-xs text-gray-500">Accept advance orders</p>
            </div>
          </label>
        </div>
      </div>

      {/* Order Notifications */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Phone className="h-5 w-5 mr-2" />
          Order Notifications
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.sendOrderConfirmation ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, sendOrderConfirmation: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Send Order Confirmation to Customers</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.sendReadyNotification ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, sendReadyNotification: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Send Ready for Pickup Notifications</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.notifyKitchenNewOrder ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, notifyKitchenNewOrder: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Notify Kitchen of New Orders</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.orders?.notifyWaiterNewOrder ?? true}
              onChange={(e) => onChange({
                ...settings,
                orders: { ...settings.orders, notifyWaiterNewOrder: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Notify Waiter of New Table Orders</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Order Settings'}
        </button>
      </div>
    </div>
  );
};

export default OrderSettings;