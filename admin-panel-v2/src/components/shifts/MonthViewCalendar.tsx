import React, { useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Shift } from '../../types/shift';
import { getAccessibleShiftColor } from '../../utils/accessibility';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface MonthViewCalendarProps {
  shifts: Shift[];
  onDayClick: (date: Date) => void;
  onShiftClick: (shift: Shift) => void;
  selectedShifts?: string[];
  isSelectionMode: boolean;
  onShiftSelect?: (shiftId: string) => void;
}

const MonthViewCalendar: React.FC<MonthViewCalendarProps> = ({
  shifts,
  onDayClick,
  onShiftClick,
  selectedShifts = [],
  isSelectionMode,
  onShiftSelect
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { settings } = useAccessibility();
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => 
      format(new Date(shift.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };
  
  const getDayStats = (date: Date) => {
    const dayShifts = getShiftsForDay(date);
    return {
      total: dayShifts.length,
      assigned: dayShifts.filter(s => s.employee).length,
      unassigned: dayShifts.filter(s => !s.employee).length,
      morning: dayShifts.filter(s => s.shiftType === 'morning').length,
      afternoon: dayShifts.filter(s => s.shiftType === 'afternoon').length,
      evening: dayShifts.filter(s => s.shiftType === 'evening').length,
      night: dayShifts.filter(s => s.shiftType === 'night').length
    };
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-medium text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dayShifts = getShiftsForDay(day);
            const stats = getDayStats(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={idx}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isCurrentDay ? 'border-primary-500 border-2' : 'border-gray-200'}
                  hover:bg-gray-50 transition-colors
                `}
                onClick={() => onDayClick(day)}
                role="button"
                tabIndex={0}
                aria-label={`${format(day, 'EEEE, MMMM d')}. ${stats.total} shifts, ${stats.unassigned} unassigned`}
              >
                {/* Day Number */}
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isCurrentDay ? 'text-primary-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                {/* Shift Summary */}
                {stats.total > 0 && (
                  <div className="space-y-1">
                    {/* Total shifts indicator */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{stats.total} shifts</span>
                      {stats.unassigned > 0 && (
                        <span className="text-orange-600 font-medium">{stats.unassigned}!</span>
                      )}
                    </div>
                    
                    {/* Shift type indicators */}
                    <div className="flex flex-wrap gap-1">
                      {stats.morning > 0 && (
                        <div className="w-5 h-5 bg-yellow-100 rounded text-xs flex items-center justify-center text-yellow-800 font-medium">
                          {stats.morning}
                        </div>
                      )}
                      {stats.afternoon > 0 && (
                        <div className="w-5 h-5 bg-blue-100 rounded text-xs flex items-center justify-center text-blue-800 font-medium">
                          {stats.afternoon}
                        </div>
                      )}
                      {stats.evening > 0 && (
                        <div className="w-5 h-5 bg-purple-100 rounded text-xs flex items-center justify-center text-purple-800 font-medium">
                          {stats.evening}
                        </div>
                      )}
                      {stats.night > 0 && (
                        <div className="w-5 h-5 bg-gray-100 rounded text-xs flex items-center justify-center text-gray-800 font-medium">
                          {stats.night}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected shifts in selection mode */}
                    {isSelectionMode && (
                      <div className="mt-1">
                        {dayShifts.filter(s => selectedShifts.includes(s._id)).length > 0 && (
                          <span className="text-xs text-primary-600 font-medium">
                            {dayShifts.filter(s => selectedShifts.includes(s._id)).length} selected
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Add shift button for empty days */}
                {stats.total === 0 && isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(day);
                    }}
                    className="mt-2 w-full p-1 border border-dashed border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    aria-label={`Add shift for ${format(day, 'MMMM d')}`}
                  >
                    <Plus className="h-3 w-3 mx-auto" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 rounded" />
              <span>Morning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 rounded" />
              <span>Afternoon</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-100 rounded" />
              <span>Evening</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded" />
              <span>Night</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-orange-600">!</span>
            <span>Unassigned</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthViewCalendar;