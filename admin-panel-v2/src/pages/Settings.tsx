import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Store, 
  Bell, 
  Mail, 
  MessageSquare, 
  CreditCard, 
  Shield, 
  Database, 
  Settings as SettingsIcon,
  Building,
  Clock,
  Users,
  Package,
  Globe,
  Save,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  TestTube,
  Smartphone,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// Lazy load settings components for better performance
const BusinessSettings = lazy(() => import('./Settings/BusinessSettings'));
const PaymentSettings = lazy(() => import('./Settings/PaymentSettings'));
const OrderSettings = lazy(() => import('./Settings/OrderSettings'));
const TableSettings = lazy(() => import('./Settings/TableSettings'));
const StaffSettings = lazy(() => import('./Settings/StaffSettings'));
const SecuritySettings = lazy(() => import('./Settings/SecuritySettings'));
const FeaturesSettings = lazy(() => import('./Settings/FeaturesSettings'));
const IntegrationsSettings = lazy(() => import('./Settings/IntegrationsSettings'));
const BackupSettings = lazy(() => import('./Settings/BackupSettings'));

interface SettingsData {
  general?: any;
  business?: any;
  email?: any;
  sms?: any;
  push?: any;
  payment?: any;
  orders?: any;
  tables?: any;
  staff?: any;
  integrations?: any;
  security?: any;
  features?: any;
  backup?: any;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'business', label: 'Business', icon: Building },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'push', label: 'Push Notifications', icon: Bell },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'tables', label: 'Tables', icon: Users },
    { id: 'staff', label: 'Staff', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'features', label: 'Features', icon: Sparkles },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'backup', label: 'Backup', icon: Database }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      setSettings(response.data.data || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (updates: any) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async (section?: string, data?: any) => {
    const sectionToSave = section || activeTab;
    const dataToSave = data || settings[sectionToSave as keyof SettingsData] || {};
    
    try {
      setSaving(true);
      const response = await api.put(`/admin/settings/${sectionToSave}`, dataToSave);
      
      setSettings(prev => ({
        ...prev,
        [sectionToSave]: response.data.data
      }));
      
      toast.success(`${sectionToSave.charAt(0).toUpperCase() + sectionToSave.slice(1)} settings saved successfully`);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = prompt('Enter email address to send test email:');
    if (!testEmail) return;

    try {
      setTestingEmail(true);
      const response = await api.post('/admin/settings/email/test', { testEmail });
      if (response.data.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(response.data.message || 'Failed to send test email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    const testPhone = prompt('Enter phone number to send test SMS:');
    if (!testPhone) return;

    try {
      setTestingSms(true);
      const response = await api.post('/admin/settings/sms/test', { testPhone });
      if (response.data.success) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(response.data.message || 'Failed to send test SMS');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test SMS');
    } finally {
      setTestingSms(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
          <input
            type="text"
            value={settings.general?.restaurantName || ''}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, restaurantName: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tagline</label>
          <input
            type="text"
            value={settings.general?.tagline || ''}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, tagline: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Primary Color</label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              value={settings.general?.primaryColor || '#7c3aed'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, primaryColor: e.target.value }
              }))}
              className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.general?.primaryColor || '#7c3aed'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, primaryColor: e.target.value }
              }))}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="color"
              value={settings.general?.secondaryColor || '#6d28d9'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, secondaryColor: e.target.value }
              }))}
              className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={settings.general?.secondaryColor || '#6d28d9'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, secondaryColor: e.target.value }
              }))}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={settings.general?.timezone || 'Asia/Dubai'}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, timezone: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Asia/Riyadh">Asia/Riyadh</option>
            <option value="Asia/Kuwait">Asia/Kuwait</option>
            <option value="Asia/Qatar">Asia/Qatar</option>
            <option value="Asia/Bahrain">Asia/Bahrain</option>
            <option value="Asia/Muscat">Asia/Muscat</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <div className="mt-1 flex space-x-2">
            <select
              value={settings.general?.currency || 'AED'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, currency: e.target.value }
              }))}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
              <option value="KWD">KWD - Kuwaiti Dinar</option>
              <option value="QAR">QAR - Qatari Riyal</option>
              <option value="BHD">BHD - Bahraini Dinar</option>
              <option value="OMR">OMR - Omani Rial</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
            <input
              type="text"
              value={settings.general?.currencySymbol || 'AED'}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                general: { ...prev.general, currencySymbol: e.target.value }
              }))}
              placeholder="Symbol"
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date Format</label>
          <select
            value={settings.general?.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, dateFormat: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Time Format</label>
          <select
            value={settings.general?.timeFormat || '24h'}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, timeFormat: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="24h">24-hour</option>
            <option value="12h">12-hour (AM/PM)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Language</label>
          <select
            value={settings.general?.language || 'en'}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              general: { ...prev.general, language: e.target.value }
            }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('general', settings.general)}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save General Settings'}</span>
        </button>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email Provider</label>
        <select
          value={settings.email?.provider || 'disabled'}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            email: { ...prev.email, provider: e.target.value }
          }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="disabled">Disabled</option>
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="mailgun">Mailgun</option>
          <option value="ses">Amazon SES</option>
        </select>
      </div>

      {settings.email?.provider === 'smtp' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">SMTP Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                value={settings.email?.smtp?.host || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    smtp: { ...prev.email?.smtp, host: e.target.value }
                  }
                }))}
                placeholder="smtp.gmail.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Port</label>
              <input
                type="number"
                value={settings.email?.smtp?.port || 587}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    smtp: { ...prev.email?.smtp, port: parseInt(e.target.value) }
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={settings.email?.smtp?.username || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    smtp: { ...prev.email?.smtp, username: e.target.value }
                  }
                }))}
                placeholder="your-email@gmail.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords['smtp-password'] ? 'text' : 'password'}
                  value={settings.email?.smtp?.password || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { 
                      ...prev.email, 
                      smtp: { ...prev.email?.smtp, password: e.target.value }
                    }
                  }))}
                  placeholder="••••••••"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('smtp-password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords['smtp-password'] ? 
                    <EyeOff className="h-4 w-4 text-gray-400" /> : 
                    <Eye className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Email</label>
              <input
                type="email"
                value={settings.email?.smtp?.fromEmail || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    smtp: { ...prev.email?.smtp, fromEmail: e.target.value }
                  }
                }))}
                placeholder="noreply@restaurant.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Name</label>
              <input
                type="text"
                value={settings.email?.smtp?.fromName || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    smtp: { ...prev.email?.smtp, fromName: e.target.value }
                  }
                }))}
                placeholder="Restaurant Name"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.email?.smtp?.secure || false}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { 
                      ...prev.email, 
                      smtp: { ...prev.email?.smtp, secure: e.target.checked }
                    }
                  }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Use SSL/TLS</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {settings.email?.provider === 'sendgrid' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">SendGrid Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords['sendgrid-api'] ? 'text' : 'password'}
                  value={settings.email?.sendgrid?.apiKey || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { 
                      ...prev.email, 
                      sendgrid: { ...prev.email?.sendgrid, apiKey: e.target.value }
                    }
                  }))}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('sendgrid-api')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords['sendgrid-api'] ? 
                    <EyeOff className="h-4 w-4 text-gray-400" /> : 
                    <Eye className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Email</label>
              <input
                type="email"
                value={settings.email?.sendgrid?.fromEmail || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    sendgrid: { ...prev.email?.sendgrid, fromEmail: e.target.value }
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Name</label>
              <input
                type="text"
                value={settings.email?.sendgrid?.fromName || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    sendgrid: { ...prev.email?.sendgrid, fromName: e.target.value }
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {settings.email?.provider !== 'disabled' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">Email Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.preferences?.enableOrderConfirmations ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    preferences: { 
                      ...prev.email?.preferences, 
                      enableOrderConfirmations: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable order confirmation emails</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.preferences?.enableShiftReminders ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    preferences: { 
                      ...prev.email?.preferences, 
                      enableShiftReminders: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable shift reminder emails</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.preferences?.enableDailyReports ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { 
                    ...prev.email, 
                    preferences: { 
                      ...prev.email?.preferences, 
                      enableDailyReports: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable daily report emails</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleTestEmail}
          disabled={testingEmail || settings.email?.provider === 'disabled'}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <TestTube className="h-4 w-4" />
          <span>{testingEmail ? 'Sending...' : 'Test Email'}</span>
        </button>
        
        <button
          onClick={() => handleSave('email', settings.email)}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Email Settings'}</span>
        </button>
      </div>
    </div>
  );

  const renderSmsSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">SMS Provider</label>
        <select
          value={settings.sms?.provider || 'disabled'}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            sms: { ...prev.sms, provider: e.target.value }
          }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="disabled">Disabled</option>
          <option value="twilio">Twilio</option>
          <option value="nexmo">Nexmo/Vonage</option>
          <option value="messagebird">MessageBird</option>
        </select>
      </div>

      {settings.sms?.provider === 'twilio' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">Twilio Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account SID</label>
              <input
                type="text"
                value={settings.sms?.twilio?.accountSid || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    twilio: { ...prev.sms?.twilio, accountSid: e.target.value }
                  }
                }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Auth Token</label>
              <div className="mt-1 relative">
                <input
                  type={showPasswords['twilio-auth'] ? 'text' : 'password'}
                  value={settings.sms?.twilio?.authToken || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sms: { 
                      ...prev.sms, 
                      twilio: { ...prev.sms?.twilio, authToken: e.target.value }
                    }
                  }))}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('twilio-auth')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords['twilio-auth'] ? 
                    <EyeOff className="h-4 w-4 text-gray-400" /> : 
                    <Eye className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                value={settings.sms?.twilio?.phoneNumber || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    twilio: { ...prev.sms?.twilio, phoneNumber: e.target.value }
                  }
                }))}
                placeholder="+1234567890"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Messaging Service SID (Optional)
              </label>
              <input
                type="text"
                value={settings.sms?.twilio?.messagingServiceSid || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    twilio: { ...prev.sms?.twilio, messagingServiceSid: e.target.value }
                  }
                }))}
                placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {settings.sms?.provider !== 'disabled' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">SMS Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.preferences?.enableOrderConfirmations ?? false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    preferences: { 
                      ...prev.sms?.preferences, 
                      enableOrderConfirmations: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable order confirmation SMS</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.preferences?.enableShiftReminders ?? false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    preferences: { 
                      ...prev.sms?.preferences, 
                      enableShiftReminders: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable shift reminder SMS</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.preferences?.enableOTP ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    preferences: { 
                      ...prev.sms?.preferences, 
                      enableOTP: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable OTP verification</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Country Code</label>
              <input
                type="text"
                value={settings.sms?.preferences?.defaultCountryCode || '+971'}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sms: { 
                    ...prev.sms, 
                    preferences: { 
                      ...prev.sms?.preferences, 
                      defaultCountryCode: e.target.value 
                    }
                  }
                }))}
                placeholder="+971"
                className="mt-1 block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleTestSms}
          disabled={testingSms || settings.sms?.provider === 'disabled'}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <TestTube className="h-4 w-4" />
          <span>{testingSms ? 'Sending...' : 'Test SMS'}</span>
        </button>
        
        <button
          onClick={() => handleSave('sms', settings.sms)}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save SMS Settings'}</span>
        </button>
      </div>
    </div>
  );

  const renderPushSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Push Notification Provider</label>
        <select
          value={settings.push?.provider || 'disabled'}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            push: { ...prev.push, provider: e.target.value }
          }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="disabled">Disabled</option>
          <option value="firebase">Firebase Cloud Messaging</option>
          <option value="onesignal">OneSignal</option>
        </select>
      </div>

      {settings.push?.provider === 'firebase' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">Firebase Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project ID</label>
              <input
                type="text"
                value={settings.push?.firebase?.projectId || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    firebase: { ...prev.push?.firebase, projectId: e.target.value }
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Client Email</label>
              <input
                type="email"
                value={settings.push?.firebase?.clientEmail || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    firebase: { ...prev.push?.firebase, clientEmail: e.target.value }
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Private Key</label>
              <textarea
                value={settings.push?.firebase?.privateKey || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    firebase: { ...prev.push?.firebase, privateKey: e.target.value }
                  }
                }))}
                rows={4}
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {settings.push?.provider !== 'disabled' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">Push Notification Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.preferences?.enableOrderUpdates ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    preferences: { 
                      ...prev.push?.preferences, 
                      enableOrderUpdates: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable order update notifications</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.preferences?.enableShiftReminders ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    preferences: { 
                      ...prev.push?.preferences, 
                      enableShiftReminders: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable shift reminder notifications</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.preferences?.enableTableReady ?? true}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  push: { 
                    ...prev.push, 
                    preferences: { 
                      ...prev.push?.preferences, 
                      enableTableReady: e.target.checked 
                    }
                  }
                }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable table ready notifications</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('push', settings.push)}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Push Settings'}</span>
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    // Wrap component rendering in Suspense for lazy loading
    const LoadingComponent = (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );

    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'email':
        return renderEmailSettings();
      case 'sms':
        return renderSmsSettings();
      case 'push':
        return renderPushSettings();
      case 'business':
        return (
          <Suspense fallback={LoadingComponent}>
            <BusinessSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('business', settings.business)}
              saving={saving}
            />
          </Suspense>
        );
      case 'payment':
        return (
          <Suspense fallback={LoadingComponent}>
            <PaymentSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('payment', settings.payment)}
              saving={saving}
            />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={LoadingComponent}>
            <OrderSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('orders', settings.orders)}
              saving={saving}
            />
          </Suspense>
        );
      case 'tables':
        return (
          <Suspense fallback={LoadingComponent}>
            <TableSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('tables', settings.tables)}
              saving={saving}
            />
          </Suspense>
        );
      case 'staff':
        return (
          <Suspense fallback={LoadingComponent}>
            <StaffSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('staff', settings.staff)}
              saving={saving}
            />
          </Suspense>
        );
      case 'security':
        return (
          <Suspense fallback={LoadingComponent}>
            <SecuritySettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('security', settings.security)}
              saving={saving}
            />
          </Suspense>
        );
      case 'features':
        return (
          <Suspense fallback={LoadingComponent}>
            <FeaturesSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('features', settings.features)}
              saving={saving}
            />
          </Suspense>
        );
      case 'integrations':
        return (
          <Suspense fallback={LoadingComponent}>
            <IntegrationsSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('integrations', settings.integrations)}
              saving={saving}
            />
          </Suspense>
        );
      case 'backup':
        return (
          <Suspense fallback={LoadingComponent}>
            <BackupSettings
              settings={settings}
              onChange={handleSettingsChange}
              onSave={() => handleSave('backup', settings.backup)}
              saving={saving}
            />
          </Suspense>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configuration for {activeTab} coming soon.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your restaurant settings and integrations
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Settings">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;