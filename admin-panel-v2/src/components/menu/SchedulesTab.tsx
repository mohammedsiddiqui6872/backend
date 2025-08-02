import { useState, useEffect } from 'react';
import { Plus, Calendar, Search, Info } from 'lucide-react';
import { MenuSchedule, ScheduleInput } from '../../types/schedule';
import { MenuItem } from '../../types/menu';
import { MenuChannel } from '../../types/channel';
import { ModifierGroup } from '../../types/modifiers';
import ScheduleCard from '../schedules/ScheduleCard';
import ScheduleModal from '../schedules/ScheduleModal';
import { getMenuSchedules, createMenuSchedule, updateMenuSchedule, deleteMenuSchedule, initializeDefaultSchedules } from '../../services/menuService';
import { getChannels } from '../../services/channelService';
import { getCategories } from '../../services/categoryService';
import toast from 'react-hot-toast';

interface SchedulesTabProps {
  menuItems: MenuItem[];
  modifierGroups: ModifierGroup[];
}

const SchedulesTab: React.FC<SchedulesTabProps> = ({ menuItems, modifierGroups }) => {
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [channels, setChannels] = useState<MenuChannel[]>([]);
  const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MenuSchedule | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, channelsData, categoriesData] = await Promise.all([
        getMenuSchedules(''),
        getChannels(''),
        getCategories('')
      ]);
      
      setSchedules(schedulesData);
      setChannels(channelsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (scheduleData: ScheduleInput) => {
    try {
      const newSchedule = await createMenuSchedule(scheduleData, '');
      setSchedules([...schedules, newSchedule]);
      toast.success('Schedule created successfully');
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
      throw error;
    }
  };

  const handleUpdateSchedule = async (scheduleData: ScheduleInput) => {
    if (!selectedSchedule) return;

    try {
      const updatedSchedule = await updateMenuSchedule(selectedSchedule._id, scheduleData, '');
      setSchedules(schedules.map(s => s._id === updatedSchedule._id ? updatedSchedule : s));
      toast.success('Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
      throw error;
    }
  };

  const handleDeleteSchedule = async (schedule: MenuSchedule) => {
    if (!window.confirm(`Are you sure you want to delete "${schedule.name}"?`)) {
      return;
    }

    try {
      await deleteMenuSchedule(schedule._id, '');
      setSchedules(schedules.filter(s => s._id !== schedule._id));
      toast.success('Schedule deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleActive = async (schedule: MenuSchedule) => {
    try {
      // Convert MenuSchedule to ScheduleInput
      const scheduleInput: ScheduleInput = {
        name: schedule.name,
        description: schedule.description,
        isActive: !schedule.isActive,
        scheduleType: schedule.scheduleType,
        timeSlots: schedule.timeSlots.map(slot => ({
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          daysOfWeek: slot.daysOfWeek,
          menuItems: slot.menuItems.map(item => typeof item === 'string' ? item : item._id),
          categories: slot.categories,
          modifierGroups: slot.modifierGroups.map(group => typeof group === 'string' ? group : group._id)
        })),
        dateSlots: schedule.dateSlots.map(slot => ({
          name: slot.name,
          startDate: slot.startDate,
          endDate: slot.endDate,
          menuItems: slot.menuItems.map(item => typeof item === 'string' ? item : item._id),
          categories: slot.categories,
          modifierGroups: slot.modifierGroups.map(group => typeof group === 'string' ? group : group._id)
        })),
        priority: schedule.priority,
        applicableChannels: schedule.applicableChannels.map(channel => 
          typeof channel === 'string' ? channel : channel._id
        ),
        settings: schedule.settings
      };
      
      const updatedSchedule = await updateMenuSchedule(
        schedule._id,
        scheduleInput,
        ''
      );
      setSchedules(schedules.map(s => s._id === updatedSchedule._id ? updatedSchedule : s));
      toast.success(`Schedule ${updatedSchedule.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!window.confirm('This will create default breakfast, lunch, and dinner schedules. Continue?')) {
      return;
    }

    try {
      await initializeDefaultSchedules('');
      await fetchData();
      toast.success('Default schedules created successfully');
    } catch (error: any) {
      console.error('Error initializing defaults:', error);
      if (error.response?.data?.error === 'Schedules already exist for this tenant') {
        toast.error('Default schedules already exist');
      } else {
        toast.error('Failed to create default schedules');
      }
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (schedule.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Menu Schedules</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create time-based or date-based schedules to control menu availability
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {schedules.length === 0 && (
              <button
                onClick={handleInitializeDefaults}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Initialize Defaults
              </button>
            )}
            <button
              onClick={() => {
                setSelectedSchedule(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Info Banner */}
      {schedules.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                No schedules created yet. Click "Initialize Defaults" to create standard breakfast, lunch, and dinner schedules,
                or create your own custom schedule.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schedules Grid */}
      {filteredSchedules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSchedules.map(schedule => (
            <ScheduleCard
              key={schedule._id}
              schedule={schedule}
              onEdit={(s) => {
                setSelectedSchedule(s);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteSchedule}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {schedules.length > 0 && filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria
          </p>
        </div>
      )}

      {/* Schedule Modal */}
      {isModalOpen && (
        <ScheduleModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSchedule(null);
          }}
          onSave={selectedSchedule ? handleUpdateSchedule : handleCreateSchedule}
          schedule={selectedSchedule}
          menuItems={menuItems}
          channels={channels}
          modifierGroups={modifierGroups}
          categories={categories}
        />
      )}
    </div>
  );
};

export default SchedulesTab;