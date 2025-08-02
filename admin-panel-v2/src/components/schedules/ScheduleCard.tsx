import { Clock, Calendar, Edit2, Trash2, MoreVertical, Power, Shield, Hash } from 'lucide-react';
import { useState } from 'react';
import { MenuSchedule } from '../../types/schedule';

interface ScheduleCardProps {
  schedule: MenuSchedule;
  onEdit: (schedule: MenuSchedule) => void;
  onDelete: (schedule: MenuSchedule) => void;
  onToggleActive: (schedule: MenuSchedule) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getScheduleIcon = () => {
    switch (schedule.scheduleType) {
      case 'time-based':
        return <Clock className="h-6 w-6" />;
      case 'date-based':
        return <Calendar className="h-6 w-6" />;
      default:
        return <Clock className="h-6 w-6" />;
    }
  };

  const getCurrentSlot = () => {
    if (schedule.scheduleType === 'time-based' && schedule.timeSlots.length > 0) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = now.getDay();

      for (const slot of schedule.timeSlots) {
        if (!slot.daysOfWeek.includes(currentDay)) continue;
        
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        
        const slotStart = startHour * 60 + startMin;
        const slotEnd = endHour * 60 + endMin;
        
        // Handle slots that cross midnight
        if (slotEnd < slotStart) {
          if (currentTime >= slotStart || currentTime <= slotEnd) {
            return slot.name;
          }
        } else {
          if (currentTime >= slotStart && currentTime <= slotEnd) {
            return slot.name;
          }
        }
      }
    }
    return null;
  };

  const formatDaysOfWeek = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.includes(1) && days.includes(2) && days.includes(3) && days.includes(4) && days.includes(5)) {
      return 'Weekdays';
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return 'Weekends';
    }
    return days.map(d => dayNames[d]).join(', ');
  };

  const currentSlot = getCurrentSlot();

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      schedule.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              schedule.isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {getScheduleIcon()}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
              {schedule.description && (
                <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => {
                      onEdit(schedule);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleActive(schedule);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    {schedule.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete(schedule);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              schedule.isActive ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              {schedule.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {schedule.isActive && currentSlot && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">Current:</span>
              <span className="ml-1">{currentSlot}</span>
            </div>
          )}
          
          {schedule.priority > 0 && (
            <div className="flex items-center">
              <Hash className="h-4 w-4 mr-1 text-gray-400" />
              <span className="text-sm text-gray-600">Priority {schedule.priority}</span>
            </div>
          )}
        </div>

        {/* Time Slots */}
        {schedule.scheduleType === 'time-based' && schedule.timeSlots.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Time Slots</h4>
            {schedule.timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">{slot.name || `Slot ${index + 1}`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{slot.startTime} - {slot.endTime}</span>
                  <span className="text-gray-400">|</span>
                  <span>{formatDaysOfWeek(slot.daysOfWeek)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Date Slots */}
        {schedule.scheduleType === 'date-based' && schedule.dateSlots.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Date Slots</h4>
            {schedule.dateSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium">{slot.name || `Slot ${index + 1}`}</span>
                </div>
                <div>
                  {new Date(slot.startDate).toLocaleDateString()} - {new Date(slot.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Summary */}
        <div className="flex items-center space-x-3 text-sm text-gray-600">
          {schedule.settings.autoSwitch && (
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1 text-gray-400" />
              <span>Auto-switch</span>
            </div>
          )}
          {schedule.settings.showUpcomingItems && (
            <div className="flex items-center">
              <span>Show upcoming ({schedule.settings.upcomingItemsMinutes}m)</span>
            </div>
          )}
          {schedule.settings.hideUnavailableItems && (
            <div className="flex items-center">
              <span>Hide unavailable</span>
            </div>
          )}
        </div>

        {/* Channels */}
        {schedule.applicableChannels && schedule.applicableChannels.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Applies to:</span>
              <span className="ml-2">
                {schedule.applicableChannels.map((channel: any) => 
                  typeof channel === 'string' ? channel : channel.displayName
                ).join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard;