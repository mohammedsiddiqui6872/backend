import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { MenuChannel, ChannelInput } from '../../types/channel';
import toast from 'react-hot-toast';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (channel: ChannelInput) => Promise<void>;
  channel?: MenuChannel | null;
}

const ChannelModal: React.FC<ChannelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  channel
}) => {
  const [formData, setFormData] = useState<ChannelInput>({
    name: 'dine-in',
    displayName: '',
    description: '',
    isActive: true,
    settings: {
      requiresTable: false,
      requiresCustomerInfo: false,
      minOrderAmount: 0,
      deliveryFee: 0,
      packagingFee: 0,
      estimatedTime: {
        min: 15,
        max: 30
      }
    },
    operatingHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
      sunday: { isOpen: true, openTime: '09:00', closeTime: '22:00' }
    }
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'hours' | 'settings'>('general');

  const channelTypes = [
    { value: 'dine-in', label: 'Dine In', description: 'For customers dining in the restaurant' },
    { value: 'takeaway', label: 'Takeaway', description: 'For customers picking up their orders' },
    { value: 'delivery', label: 'Delivery', description: 'For home delivery orders' },
    { value: 'drive-thru', label: 'Drive Thru', description: 'For drive-thru orders' },
    { value: 'catering', label: 'Catering', description: 'For catering and large orders' },
    { value: 'online', label: 'Online Ordering', description: 'Orders placed through website' },
    { value: 'mobile-app', label: 'Mobile App', description: 'Orders from mobile application' },
    { value: 'third-party', label: 'Third Party', description: 'Orders from delivery platforms' }
  ];

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name,
        displayName: channel.displayName,
        description: channel.description || '',
        isActive: channel.isActive,
        settings: channel.settings,
        operatingHours: channel.operatingHours,
        menuCustomization: channel.menuCustomization
      });
    }
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOperatingHours = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours![day],
          [field]: value
        }
      }
    }));
  };

  const applyToAllDays = (day: string) => {
    const daySettings = formData.operatingHours![day];
    const updatedHours = { ...formData.operatingHours };
    
    daysOfWeek.forEach(d => {
      updatedHours[d] = { ...daySettings };
    });
    
    setFormData(prev => ({
      ...prev,
      operatingHours: updatedHours
    }));
    
    toast.success('Applied to all days');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {channel ? 'Edit Channel' : 'Add New Channel'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hours')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'hours'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Operating Hours
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Channel Type */}
                {!channel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {channelTypes.map(type => (
                        <label
                          key={type.value}
                          className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${
                            formData.name === type.value
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="channelType"
                            value={type.value}
                            checked={formData.name === type.value}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value as any })}
                            className="sr-only"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{type.label}</p>
                            <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Dine In Service"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Brief description of this channel..."
                  />
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Channel is active</span>
                  </label>
                </div>
              </div>
            )}

            {/* Operating Hours Tab */}
            {activeTab === 'hours' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        Set the operating hours for this channel. These may differ from your restaurant's general hours.
                      </p>
                    </div>
                  </div>
                </div>

                {daysOfWeek.map((day, index) => {
                  const dayHours = formData.operatingHours![day];
                  return (
                    <div key={day} className="flex items-center space-x-4 py-2 border-b">
                      <div className="w-24">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {day}
                        </span>
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={dayHours.isOpen}
                          onChange={(e) => updateOperatingHours(day, 'isOpen', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600"
                        />
                        <span className="ml-2 text-sm text-gray-600">Open</span>
                      </label>

                      {dayHours.isOpen && (
                        <>
                          <input
                            type="time"
                            value={dayHours.openTime}
                            onChange={(e) => updateOperatingHours(day, 'openTime', e.target.value)}
                            className="border-gray-300 rounded-md shadow-sm text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={dayHours.closeTime}
                            onChange={(e) => updateOperatingHours(day, 'closeTime', e.target.value)}
                            className="border-gray-300 rounded-md shadow-sm text-sm"
                          />
                        </>
                      )}

                      {index === 0 && (
                        <button
                          type="button"
                          onClick={() => applyToAllDays(day)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Apply to all
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Requirements */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Requirements</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.settings?.requiresTable}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, requiresTable: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Requires table selection</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.settings?.requiresCustomerInfo}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, requiresCustomerInfo: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Requires customer information</span>
                    </label>
                  </div>
                </div>

                {/* Order Settings */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Order Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Order Amount
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.minOrderAmount || 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, minOrderAmount: parseFloat(e.target.value) || 0 }
                        })}
                        min="0"
                        step="0.01"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Order Amount
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.maxOrderAmount || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, maxOrderAmount: parseFloat(e.target.value) || undefined }
                        })}
                        min="0"
                        step="0.01"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Fees</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Fee
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.deliveryFee || 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, deliveryFee: parseFloat(e.target.value) || 0 }
                        })}
                        min="0"
                        step="0.01"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Packaging Fee
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.packagingFee || 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings!, packagingFee: parseFloat(e.target.value) || 0 }
                        })}
                        min="0"
                        step="0.01"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Estimated Time */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Estimated Preparation Time</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.estimatedTime?.min || 15}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            estimatedTime: {
                              ...formData.settings!.estimatedTime!,
                              min: parseInt(e.target.value) || 15
                            }
                          }
                        })}
                        min="0"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.settings?.estimatedTime?.max || 30}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            estimatedTime: {
                              ...formData.settings!.estimatedTime!,
                              max: parseInt(e.target.value) || 30
                            }
                          }
                        })}
                        min="0"
                        className="w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : channel ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelModal;