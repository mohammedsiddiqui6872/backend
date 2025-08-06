import { FC, useState } from 'react';
import { Plug, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface IntegrationsSettingsProps {
  settings: any;
  onChange: (updates: any) => void;
  onSave: () => void;
  saving: boolean;
}

const IntegrationsSettings: FC<IntegrationsSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const toggleSecretVisibility = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const testIntegration = async (integration: string) => {
    setTestingIntegration(integration);
    // Simulate API test
    setTimeout(() => {
      setTestResults(prev => ({
        ...prev,
        [integration]: {
          success: Math.random() > 0.3,
          message: Math.random() > 0.3 ? 'Connection successful' : 'Failed to connect'
        }
      }));
      setTestingIntegration(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* POS Integration */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <Plug className="h-5 w-5 mr-2" />
            POS System Integration
          </span>
          {settings.integrations?.pos?.enabled && (
            <span className="text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Connected
            </span>
          )}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">POS Provider</label>
            <select
              value={settings.integrations?.pos?.provider || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  pos: { ...settings.integrations?.pos, provider: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">Select Provider</option>
              <option value="square">Square POS</option>
              <option value="toast">Toast POS</option>
              <option value="clover">Clover</option>
              <option value="lightspeed">Lightspeed</option>
              <option value="revel">Revel Systems</option>
            </select>
          </div>

          {settings.integrations?.pos?.provider && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <div className="mt-1 relative">
                    <input
                      type={showSecrets['pos-api-key'] ? 'text' : 'password'}
                      value={settings.integrations?.pos?.apiKey || ''}
                      onChange={(e) => onChange({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          pos: { ...settings.integrations?.pos, apiKey: e.target.value }
                        }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility('pos-api-key')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showSecrets['pos-api-key'] ? 
                        <EyeOff className="h-4 w-4 text-gray-400" /> : 
                        <Eye className="h-4 w-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location ID</label>
                  <input
                    type="text"
                    value={settings.integrations?.pos?.locationId || ''}
                    onChange={(e) => onChange({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        pos: { ...settings.integrations?.pos, locationId: e.target.value }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.integrations?.pos?.enabled ?? false}
                    onChange={(e) => onChange({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        pos: { ...settings.integrations?.pos, enabled: e.target.checked }
                      }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable POS Integration</span>
                </label>

                <button
                  onClick={() => testIntegration('pos')}
                  disabled={testingIntegration === 'pos'}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {testingIntegration === 'pos' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testResults.pos && (
                <div className={`p-3 rounded-lg flex items-center ${
                  testResults.pos.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {testResults.pos.success ? 
                    <CheckCircle className="h-4 w-4 mr-2" /> : 
                    <XCircle className="h-4 w-4 mr-2" />
                  }
                  {testResults.pos.message}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Accounting Integration */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accounting Software</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Accounting Provider</label>
            <select
              value={settings.integrations?.accounting?.provider || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  accounting: { ...settings.integrations?.accounting, provider: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="">Select Provider</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="xero">Xero</option>
              <option value="sage">Sage</option>
              <option value="zoho">Zoho Books</option>
              <option value="freshbooks">FreshBooks</option>
            </select>
          </div>

          {settings.integrations?.accounting?.provider && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    value={settings.integrations?.accounting?.clientId || ''}
                    onChange={(e) => onChange({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        accounting: { ...settings.integrations?.accounting, clientId: e.target.value }
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <div className="mt-1 relative">
                    <input
                      type={showSecrets['accounting-secret'] ? 'text' : 'password'}
                      value={settings.integrations?.accounting?.clientSecret || ''}
                      onChange={(e) => onChange({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          accounting: { ...settings.integrations?.accounting, clientSecret: e.target.value }
                        }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility('accounting-secret')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showSecrets['accounting-secret'] ? 
                        <EyeOff className="h-4 w-4 text-gray-400" /> : 
                        <Eye className="h-4 w-4 text-gray-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.integrations?.accounting?.syncDaily ?? true}
                    onChange={(e) => onChange({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        accounting: { ...settings.integrations?.accounting, syncDaily: e.target.checked }
                      }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sync Daily Sales Data</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.integrations?.accounting?.syncInventory ?? false}
                    onChange={(e) => onChange({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        accounting: { ...settings.integrations?.accounting, syncInventory: e.target.checked }
                      }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sync Inventory Values</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delivery Platforms */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Platforms</h3>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.delivery?.uberEats ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  delivery: { ...settings.integrations?.delivery, uberEats: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Uber Eats</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.delivery?.deliveroo ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  delivery: { ...settings.integrations?.delivery, deliveroo: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Deliveroo</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.delivery?.talabat ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  delivery: { ...settings.integrations?.delivery, talabat: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Talabat</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.delivery?.zomato ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  delivery: { ...settings.integrations?.delivery, zomato: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Zomato</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.delivery?.careem ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  delivery: { ...settings.integrations?.delivery, careem: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Careem Now</span>
          </label>
        </div>
      </div>

      {/* Social Media */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Facebook Page ID</label>
            <input
              type="text"
              value={settings.integrations?.social?.facebookPageId || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, facebookPageId: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Instagram Handle</label>
            <input
              type="text"
              value={settings.integrations?.social?.instagramHandle || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, instagramHandle: e.target.value }
                }
              })}
              placeholder="@restaurant"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Google Business ID</label>
            <input
              type="text"
              value={settings.integrations?.social?.googleBusinessId || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, googleBusinessId: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">TripAdvisor URL</label>
            <input
              type="url"
              value={settings.integrations?.social?.tripAdvisorUrl || ''}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, tripAdvisorUrl: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.social?.autoPostUpdates ?? false}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, autoPostUpdates: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-post Menu Updates</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.integrations?.social?.syncReviews ?? true}
              onChange={(e) => onChange({
                ...settings,
                integrations: {
                  ...settings.integrations,
                  social: { ...settings.integrations?.social, syncReviews: e.target.checked }
                }
              })}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Sync Reviews</span>
          </label>
        </div>
      </div>

      {/* Other Integrations */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Other Integrations</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Google Analytics</span>
              <p className="text-sm text-gray-500">Track website and app usage</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.integrations?.analytics?.googleAnalytics ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    analytics: { ...settings.integrations?.analytics, googleAnalytics: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Mailchimp</span>
              <p className="text-sm text-gray-500">Email marketing automation</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.integrations?.marketing?.mailchimp ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    marketing: { ...settings.integrations?.marketing, mailchimp: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">Slack</span>
              <p className="text-sm text-gray-500">Team notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.integrations?.communication?.slack ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    communication: { ...settings.integrations?.communication, slack: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">WhatsApp Business</span>
              <p className="text-sm text-gray-500">Customer messaging</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.integrations?.communication?.whatsapp ?? false}
                onChange={(e) => onChange({
                  ...settings,
                  integrations: {
                    ...settings.integrations,
                    communication: { ...settings.integrations?.communication, whatsapp: e.target.checked }
                  }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Integration Settings'}
        </button>
      </div>
    </div>
  );
};

export default IntegrationsSettings;