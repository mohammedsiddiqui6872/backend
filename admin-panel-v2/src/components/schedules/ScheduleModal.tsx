import { useState, useEffect } from 'react';
import { X, Info, Clock, Calendar, Plus, Trash2 } from 'lucide-react';
import { MenuSchedule, ScheduleInput, TimeSlot, DateSlot } from '../../types/schedule';
import { MenuItem } from '../../types/menu';
import { MenuChannel } from '../../types/channel';
import { ModifierGroup } from '../../types/modifiers';
import toast from 'react-hot-toast';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleInput) => Promise<void>;
  schedule?: MenuSchedule | null;
  menuItems: MenuItem[];
  channels: MenuChannel[];
  modifierGroups: ModifierGroup[];
  categories: Array<{ slug: string; name: string }>;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schedule,
  menuItems,
  channels,
  modifierGroups,
  categories
}) => {
  const [formData, setFormData] = useState<ScheduleInput>({
    name: '',
    description: '',
    isActive: true,
    scheduleType: 'time-based',
    timeSlots: [],
    dateSlots: [],
    priority: 0,
    applicableChannels: [],
    settings: {
      autoSwitch: true,
      showUpcomingItems: false,
      upcomingItemsMinutes: 30,
      hideUnavailableItems: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'slots' | 'items' | 'settings'>('general');

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        isActive: schedule.isActive,
        scheduleType: schedule.scheduleType,
        timeSlots: schedule.timeSlots.map(slot => ({
          ...slot,
          menuItems: slot.menuItems.map(item => 
            typeof item === 'string' ? item : item._id
          ),
          modifierGroups: slot.modifierGroups.map(group => 
            typeof group === 'string' ? group : group._id
          )
        })),
        dateSlots: schedule.dateSlots.map(slot => ({
          ...slot,
          menuItems: slot.menuItems.map(item => 
            typeof item === 'string' ? item : item._id
          ),
          modifierGroups: slot.modifierGroups.map(group => 
            typeof group === 'string' ? group : group._id
          )
        })),
        priority: schedule.priority,
        applicableChannels: schedule.applicableChannels.map(channel => 
          typeof channel === 'string' ? channel : channel._id
        ),
        settings: schedule.settings
      });
    }
  }, [schedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a schedule name');
      return;
    }

    if (formData.scheduleType === 'time-based' && formData.timeSlots.length === 0) {
      toast.error('Please add at least one time slot');
      return;
    }

    if (formData.scheduleType === 'date-based' && formData.dateSlots.length === 0) {
      toast.error('Please add at least one date slot');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      timeSlots: [
        ...prev.timeSlots,
        {
          name: '',
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
          menuItems: [],
          categories: [],
          modifierGroups: []
        }
      ]
    }));
  };

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: any) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {schedule ? 'Edit Schedule' : 'Create Schedule'}
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
                onClick={() => setActiveTab('slots')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'slots'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Time Slots
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
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Standard Day Schedule"
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
                    placeholder="Brief description of this schedule..."
                  />
                </div>

                {/* Schedule Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Type
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <label className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${
                      formData.scheduleType === 'time-based'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="scheduleType"
                        value="time-based"
                        checked={formData.scheduleType === 'time-based'}
                        onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-600 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">Time-based</p>
                          <p className="text-sm text-gray-500">Daily schedules</p>
                        </div>
                      </div>
                    </label>

                    <label className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${
                      formData.scheduleType === 'date-based'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="scheduleType"
                        value="date-based"
                        checked={formData.scheduleType === 'date-based'}
                        onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">Date-based</p>
                          <p className="text-sm text-gray-500">Special events</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Higher priority schedules override lower priority ones
                  </p>
                </div>

                {/* Applicable Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicable Channels
                  </label>
                  <div className="space-y-2">
                    {channels.map(channel => (
                      <label key={channel._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.applicableChannels.includes(channel._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                applicableChannels: [...formData.applicableChannels, channel._id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                applicableChannels: formData.applicableChannels.filter(id => id !== channel._id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{channel.displayName}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty to apply to all channels
                  </p>
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
                    <span className="ml-2 text-sm text-gray-700">Schedule is active</span>
                  </label>
                </div>
              </div>
            )}

            {/* Time Slots Tab */}
            {activeTab === 'slots' && formData.scheduleType === 'time-based' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Time Slots</h4>
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slot
                  </button>
                </div>

                {formData.timeSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No time slots added yet. Click "Add Slot" to create one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.timeSlots.map((slot, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium text-gray-900">Slot {index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Slot Name
                            </label>
                            <input
                              type="text"
                              value={slot.name}
                              onChange={(e) => updateTimeSlot(index, 'name', e.target.value)}
                              className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                              placeholder="e.g., Breakfast"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Days of Week
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map(day => (
                              <label key={day.value} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={slot.daysOfWeek.includes(day.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateTimeSlot(index, 'daysOfWeek', [...slot.daysOfWeek, day.value]);
                                    } else {
                                      updateTimeSlot(index, 'daysOfWeek', slot.daysOfWeek.filter(d => d !== day.value));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-primary-600"
                                />
                                <span className="ml-1 text-sm text-gray-700">{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Categories
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {categories.map(category => (
                              <label key={category.slug} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={slot.categories.includes(category.slug)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateTimeSlot(index, 'categories', [...slot.categories, category.slug]);
                                    } else {
                                      updateTimeSlot(index, 'categories', slot.categories.filter(c => c !== category.slug));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-primary-600"
                                />
                                <span className="ml-1 text-sm text-gray-700">{category.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        These settings control how the menu behaves based on the schedule.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.autoSwitch}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, autoSwitch: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Auto Switch</span>
                      <p className="text-sm text-gray-500">Automatically switch menus based on time</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.showUpcomingItems}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, showUpcomingItems: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Show Upcoming Items</span>
                      <p className="text-sm text-gray-500">Display items from the next time slot</p>
                    </div>
                  </label>

                  {formData.settings.showUpcomingItems && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Show items starting (minutes before)
                      </label>
                      <input
                        type="number"
                        value={formData.settings.upcomingItemsMinutes}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { 
                            ...formData.settings, 
                            upcomingItemsMinutes: parseInt(e.target.value) || 30 
                          }
                        })}
                        min="0"
                        className="w-32 border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings.hideUnavailableItems}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, hideUnavailableItems: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Hide Unavailable Items</span>
                      <p className="text-sm text-gray-500">Hide items not in the current schedule</p>
                    </div>
                  </label>
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
              {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;