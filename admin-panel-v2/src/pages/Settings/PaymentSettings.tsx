import { FC, useState } from 'react';
import { CreditCard, DollarSign, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

interface PaymentSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const PaymentSettings: FC<PaymentSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [selectedProvider, setSelectedProvider] = useState('');

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const addPaymentProvider = () => {
    if (!selectedProvider) return;
    
    const currentProviders = settings.payment?.providers || [];
    const exists = currentProviders.find((p: any) => p.name === selectedProvider);
    
    if (!exists) {
      onChange({
        ...settings,
        payment: {
          ...settings.payment,
          providers: [
            ...currentProviders,
            {
              name: selectedProvider,
              enabled: false,
              testMode: true,
              [selectedProvider]: {}
            }
          ]
        }
      });
    }
    setSelectedProvider('');
  };

  const removePaymentProvider = (providerName: string) => {
    const currentProviders = settings.payment?.providers || [];
    onChange({
      ...settings,
      payment: {
        ...settings.payment,
        providers: currentProviders.filter((p: any) => p.name !== providerName)
      }
    });
  };

  const updateProvider = (providerName: string, field: string, value: any) => {
    const currentProviders = settings.payment?.providers || [];
    const updatedProviders = currentProviders.map((p: any) => {
      if (p.name === providerName) {
        if (field.includes('.')) {
          const [subField, key] = field.split('.');
          return {
            ...p,
            [subField]: { ...p[subField], [key]: value }
          };
        }
        return { ...p, [field]: value };
      }
      return p;
    });
    
    onChange({
      ...settings,
      payment: {
        ...settings.payment,
        providers: updatedProviders
      }
    });
  };

  const getProvider = (name: string) => {
    return settings.payment?.providers?.find((p: any) => p.name === name);
  };

  return (
    <div className="space-y-6">
      {/* Payment Acceptance */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Methods
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.payment?.preferences?.acceptCash ?? true}
              onChange={(e) => onChange({
                ...settings,
                payment: {
                  ...settings.payment,
                  preferences: {
                    ...settings.payment?.preferences,
                    acceptCash: e.target.checked
                  }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Accept Cash Payments</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.payment?.preferences?.acceptCard ?? true}
              onChange={(e) => onChange({
                ...settings,
                payment: {
                  ...settings.payment,
                  preferences: {
                    ...settings.payment?.preferences,
                    acceptCard: e.target.checked
                  }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Accept Card Payments</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.payment?.preferences?.acceptOnline ?? true}
              onChange={(e) => onChange({
                ...settings,
                payment: {
                  ...settings.payment,
                  preferences: {
                    ...settings.payment?.preferences,
                    acceptOnline: e.target.checked
                  }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Accept Online Payments</span>
          </label>
        </div>
      </div>

      {/* Payment Gateways */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Gateways</h3>
        
        <div className="mb-4 flex items-center space-x-2">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">Select a payment provider</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="square">Square</option>
            <option value="razorpay">Razorpay</option>
            <option value="paytabs">PayTabs</option>
          </select>
          <button
            onClick={addPaymentProvider}
            disabled={!selectedProvider}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Provider</span>
          </button>
        </div>

        <div className="space-y-4">
          {settings.payment?.providers?.map((provider: any) => (
            <div key={provider.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium capitalize">{provider.name}</h4>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(e) => updateProvider(provider.name, 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={provider.testMode}
                      onChange={(e) => updateProvider(provider.name, 'testMode', e.target.checked)}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="ml-2 text-sm">Test Mode</span>
                  </label>
                  <button
                    onClick={() => removePaymentProvider(provider.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stripe Configuration */}
              {provider.name === 'stripe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Publishable Key</label>
                    <input
                      type="text"
                      value={provider.stripe?.publishableKey || ''}
                      onChange={(e) => updateProvider(provider.name, 'stripe.publishableKey', e.target.value)}
                      placeholder="pk_test_..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                    <div className="mt-1 relative">
                      <input
                        type={showSecrets[`stripe-secret`] ? 'text' : 'password'}
                        value={provider.stripe?.secretKey || ''}
                        onChange={(e) => updateProvider(provider.name, 'stripe.secretKey', e.target.value)}
                        placeholder="sk_test_..."
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('stripe-secret')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets['stripe-secret'] ? 
                          <EyeOff className="h-4 w-4 text-gray-400" /> : 
                          <Eye className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Webhook Secret</label>
                    <input
                      type="text"
                      value={provider.stripe?.webhookSecret || ''}
                      onChange={(e) => updateProvider(provider.name, 'stripe.webhookSecret', e.target.value)}
                      placeholder="whsec_..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* PayPal Configuration */}
              {provider.name === 'paypal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client ID</label>
                    <input
                      type="text"
                      value={provider.paypal?.clientId || ''}
                      onChange={(e) => updateProvider(provider.name, 'paypal.clientId', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                    <div className="mt-1 relative">
                      <input
                        type={showSecrets[`paypal-secret`] ? 'text' : 'password'}
                        value={provider.paypal?.clientSecret || ''}
                        onChange={(e) => updateProvider(provider.name, 'paypal.clientSecret', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('paypal-secret')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets['paypal-secret'] ? 
                          <EyeOff className="h-4 w-4 text-gray-400" /> : 
                          <Eye className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add more payment provider configurations as needed */}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Preferences */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Payment Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={settings.payment?.preferences?.requireDeposit ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  payment: {
                    ...settings.payment,
                    preferences: {
                      ...settings.payment?.preferences,
                      requireDeposit: e.target.checked
                    }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require Deposit for Reservations</span>
            </label>
            {settings.payment?.preferences?.requireDeposit && (
              <input
                type="number"
                value={settings.payment?.preferences?.depositPercentage || 20}
                onChange={(e) => onChange({
                  ...settings,
                  payment: {
                    ...settings.payment,
                    preferences: {
                      ...settings.payment?.preferences,
                      depositPercentage: parseFloat(e.target.value)
                    }
                  }
                })}
                min="0"
                max="100"
                placeholder="Deposit %"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tip Options (%)</label>
            <div className="mt-1 flex space-x-2">
              {(settings.payment?.preferences?.tipOptions || [10, 15, 20]).map((tip: number, index: number) => (
                <input
                  key={index}
                  type="number"
                  value={tip}
                  onChange={(e) => {
                    const tips = [...(settings.payment?.preferences?.tipOptions || [10, 15, 20])];
                    tips[index] = parseFloat(e.target.value);
                    onChange({
                      ...settings,
                      payment: {
                        ...settings.payment,
                        preferences: {
                          ...settings.payment?.preferences,
                          tipOptions: tips
                        }
                      }
                    });
                  }}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Auto Gratuity (%)</label>
            <input
              type="number"
              value={settings.payment?.preferences?.autoGratuity || 0}
              onChange={(e) => onChange({
                ...settings,
                payment: {
                  ...settings.payment,
                  preferences: {
                    ...settings.payment?.preferences,
                    autoGratuity: parseFloat(e.target.value)
                  }
                }
              })}
              min="0"
              max="100"
              step="0.5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Auto Gratuity Party Size</label>
            <input
              type="number"
              value={settings.payment?.preferences?.autoGratuityPartySize || 6}
              onChange={(e) => onChange({
                ...settings,
                payment: {
                  ...settings.payment,
                  preferences: {
                    ...settings.payment?.preferences,
                    autoGratuityPartySize: parseInt(e.target.value)
                  }
                }
              })}
              min="1"
              placeholder="Minimum party size"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );
};

export default PaymentSettings;