import { FC } from 'react';
import { Sparkles, ShoppingCart, Calendar, Users, BarChart, MessageSquare, Gift, Star } from 'lucide-react';

interface FeaturesSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const FeaturesSettings: FC<FeaturesSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  return (
    <div className="space-y-6">
      {/* Core Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2" />
          Core Features
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableOnlineOrdering ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableOnlineOrdering: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Online Ordering</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableTableReservations ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableTableReservations: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Table Reservations</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableQROrdering ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableQROrdering: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable QR Code Ordering</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableDigitalMenu ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableDigitalMenu: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Digital Menu</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableKitchenDisplay ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableKitchenDisplay: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Kitchen Display System</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableInventoryTracking ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableInventoryTracking: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Inventory Tracking</span>
          </label>
        </div>
      </div>

      {/* Customer Engagement */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Customer Engagement
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableLoyaltyProgram ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableLoyaltyProgram: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Loyalty Program</span>
          </label>

          {settings.features?.enableLoyaltyProgram && (
            <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Points per {settings.general?.currencySymbol || 'AED'}</label>
                <input
                  type="number"
                  value={settings.features?.loyaltyPointsPerCurrency || 1}
                  onChange={(e) => onChange({
                    ...settings,
                    features: { ...settings.features, loyaltyPointsPerCurrency: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="100"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Redemption Rate</label>
                <input
                  type="number"
                  value={settings.features?.loyaltyRedemptionRate || 100}
                  onChange={(e) => onChange({
                    ...settings,
                    features: { ...settings.features, loyaltyRedemptionRate: parseInt(e.target.value) }
                  })}
                  min="10"
                  max="1000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Points needed for 1 {settings.general?.currencySymbol || 'AED'}</p>
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableGiftCards ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableGiftCards: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Gift Cards</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableReferralProgram ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableReferralProgram: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Referral Program</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableCustomerReviews ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableCustomerReviews: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Customer Reviews</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enablePushNotifications ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enablePushNotifications: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Push Notifications</span>
          </label>
        </div>
      </div>

      {/* Marketing Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Gift className="h-5 w-5 mr-2" />
          Marketing & Promotions
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enablePromotions ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enablePromotions: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Promotions & Discounts</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableCoupons ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableCoupons: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Coupon Codes</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableHappyHours ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableHappyHours: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Happy Hours</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableEmailMarketing ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableEmailMarketing: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Email Marketing</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableSMSMarketing ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableSMSMarketing: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable SMS Marketing</span>
          </label>
        </div>
      </div>

      {/* Analytics & Reporting */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart className="h-5 w-5 mr-2" />
          Analytics & Reporting
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableAdvancedAnalytics ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableAdvancedAnalytics: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Advanced Analytics</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableRevenueTracking ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableRevenueTracking: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Revenue Tracking</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableCustomerInsights ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableCustomerInsights: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Customer Insights</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enablePredictiveAnalytics ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enablePredictiveAnalytics: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Predictive Analytics (AI)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableExportReports ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableExportReports: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Report Export (PDF/Excel)</span>
          </label>
        </div>
      </div>

      {/* Service Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Service Features
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableServiceRequests ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableServiceRequests: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Service Requests</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableFeedback ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableFeedback: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Customer Feedback</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableSplitBilling ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableSplitBilling: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Split Billing</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableWaitlistManagement ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableWaitlistManagement: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Waitlist Management</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableMultiLanguageSupport ?? true}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableMultiLanguageSupport: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Multi-Language Support</span>
          </label>
        </div>
      </div>

      {/* Advanced Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2" />
          Advanced Features
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableAIRecommendations ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableAIRecommendations: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable AI Menu Recommendations</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableVoiceOrdering ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableVoiceOrdering: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Voice Ordering</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableARMenuViewing ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableARMenuViewing: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable AR Menu Viewing</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableBlockchainPayments ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableBlockchainPayments: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Cryptocurrency Payments</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features?.enableIoTIntegration ?? false}
              onChange={(e) => onChange({
                ...settings,
                features: { ...settings.features, enableIoTIntegration: e.target.checked }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable IoT Device Integration</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Feature Settings'}
        </button>
      </div>
    </div>
  );
};

export default FeaturesSettings;