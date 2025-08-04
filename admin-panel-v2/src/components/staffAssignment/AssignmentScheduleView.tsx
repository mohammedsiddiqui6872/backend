import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Filter,
  Users,
  AlertCircle,
  X
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay } from 'date-fns';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { shiftAPI, Shift } from '../../services/shiftAPI';
import { StaffAssignment, WaiterLoad } from '../../types/staffAssignment';
import toast from 'react-hot-toast';

interface AssignmentScheduleViewProps {
  canManage: boolean;
}

interface ShiftWithAssignments extends Shift {
  assignments: StaffAssignment[];
  waiterLoad?: WaiterLoad;
}

const AssignmentScheduleView: React.FC<AssignmentScheduleViewProps> = ({ canManage }) => {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftWithAssignments | null>(null);
  const [showAutoAssign, setShowAutoAssign] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 0 })
        : currentDate;
      
      const endDate = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 0 })
        : currentDate;

      // Load shifts and assignments
      const [shiftsData, assignmentsData, waiterLoadsData] = await Promise.all([
        shiftAPI.getShifts({ 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        }),
        staffAssignmentAPI.getAssignments({
          dateRange: { start: startDate, end: endDate }
        }),
        staffAssignmentAPI.getWaiterLoads()
      ]);

      // Combine shifts with their assignments
      const shiftsWithAssignments: ShiftWithAssignments[] = shiftsData.map(shift => {
        const shiftAssignments = assignmentsData.filter(
          a => a.shiftId === shift._id
        );
        const waiterLoad = waiterLoadsData.find(
          w => w.waiterId === shift.employee._id
        );
        
        return {
          ...shift,
          assignments: shiftAssignments,
          waiterLoad
        };
      });

      setShifts(shiftsWithAssignments);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  // Navigation
  const navigatePrevious = () => {
    setCurrentDate(prev => addDays(prev, viewMode === 'week' ? -7 : -1));
  };

  const navigateNext = () => {
    setCurrentDate(prev => addDays(prev, viewMode === 'week' ? 7 : 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Auto-assign based on shift
  const handleAutoAssign = async (shift: ShiftWithAssignments) => {
    if (!canManage) return;

    try {
      // Get available tables for the shift time
      const tables = await staffAssignmentAPI.getAssignments({ 
        status: ['unassigned'] 
      });

      if (tables.length === 0) {
        toast('No unassigned tables available', { icon: 'ℹ️' });
        return;
      }

      // Auto-assign tables based on waiter capacity
      const maxTables = shift.waiterLoad?.maxCapacity || 4;
      const currentTables = shift.waiterLoad?.currentTables || 0;
      const availableCapacity = maxTables - currentTables;

      if (availableCapacity <= 0) {
        toast('Waiter is at full capacity', { icon: '⚠️' });
        return;
      }

      // Assign tables up to available capacity
      const tablesToAssign = tables.slice(0, availableCapacity);
      const assignments = await Promise.all(
        tablesToAssign.map(table => 
          staffAssignmentAPI.assignWaiter(table.tableId, shift.employee._id, 'primary')
        )
      );

      toast.success(`Assigned ${assignments.length} tables to ${shift.employee.name}`);
      await loadData();
    } catch (error) {
      toast.error('Failed to auto-assign tables');
    }
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => 
      isSameDay(new Date(shift.date), date)
    );
  };

  // Get time slots for the day view
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Format shift type badge
  const getShiftTypeBadge = (type: string) => {
    const colors = {
      morning: 'bg-yellow-100 text-yellow-800',
      afternoon: 'bg-orange-100 text-orange-800',
      evening: 'bg-purple-100 text-purple-800',
      night: 'bg-indigo-100 text-indigo-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    
    return colors[type as keyof typeof colors] || colors.custom;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('day')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-l-md border
                  ${viewMode === 'day'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r
                  ${viewMode === 'week'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                Week
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={navigatePrevious}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={navigateToday}
                className="px-3 py-1 text-sm font-medium rounded-md hover:bg-gray-100"
              >
                Today
              </button>
              <button
                onClick={navigateNext}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Date Display */}
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'week'
                ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMMM d, yyyy')
              }
            </h2>
          </div>

          {/* Actions */}
          {canManage && (
            <button
              onClick={() => setShowAutoAssign(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Auto-Assign by Shift
            </button>
          )}
        </div>
      </div>

      {/* Schedule View */}
      {viewMode === 'week' ? (
        // Week View
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-8 gap-px bg-gray-200">
            {/* Time Column */}
            <div className="bg-gray-50 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Time</div>
            </div>
            
            {/* Day Columns */}
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(startOfWeek(currentDate), i);
              const dayShifts = getShiftsForDate(date);
              
              return (
                <div
                  key={i}
                  className={`bg-white p-4 ${isToday(date) ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-semibold ${isToday(date) ? 'text-primary-600' : 'text-gray-900'}`}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  
                  {/* Shifts for the day */}
                  <div className="space-y-2">
                    {dayShifts.map(shift => (
                      <div
                        key={shift._id}
                        onClick={() => setSelectedShift(shift)}
                        className={`
                          p-2 rounded-md cursor-pointer transition-colors
                          ${getShiftTypeBadge(shift.shiftType)}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span className="text-xs font-medium">
                              {shift.employee.name}
                            </span>
                          </div>
                          {shift.assignments.length > 0 && (
                            <span className="text-xs">
                              {shift.assignments.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-1">
                          {format(new Date(shift.scheduledStart), 'HH:mm')} - 
                          {format(new Date(shift.scheduledEnd), 'HH:mm')}
                        </div>
                        {shift.waiterLoad && (
                          <div className="text-xs mt-1 text-gray-600">
                            {shift.waiterLoad.currentTables}/{shift.waiterLoad.maxCapacity} tables
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayShifts.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-8">
                        No shifts
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Day View
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-12 gap-px bg-gray-200">
            {/* Time slots */}
            {timeSlots.map(hour => (
              <React.Fragment key={hour}>
                <div className="col-span-1 bg-gray-50 p-2 text-xs font-medium text-gray-500">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
                <div className="col-span-11 bg-white p-2 min-h-[60px]">
                  {/* Shifts in this hour */}
                  {getShiftsForDate(currentDate)
                    .filter(shift => {
                      const shiftHour = new Date(shift.scheduledStart).getHours();
                      return shiftHour === hour;
                    })
                    .map(shift => (
                      <div
                        key={shift._id}
                        onClick={() => setSelectedShift(shift)}
                        className={`
                          p-2 mb-1 rounded-md cursor-pointer
                          ${getShiftTypeBadge(shift.shiftType)}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span className="text-sm font-medium">
                              {shift.employee.name}
                            </span>
                          </div>
                          <div className="text-xs">
                            {shift.assignments.length} tables assigned
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Selected Shift Details */}
      {selectedShift && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Shift Details
              </h3>
              <button
                onClick={() => setSelectedShift(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Waiter Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {selectedShift.employee.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {selectedShift.department} - {selectedShift.position}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getShiftTypeBadge(selectedShift.shiftType)}`}>
                    {selectedShift.shiftType}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <Clock className="inline h-4 w-4 mr-1" />
                  {format(new Date(selectedShift.scheduledStart), 'HH:mm')} - 
                  {format(new Date(selectedShift.scheduledEnd), 'HH:mm')}
                </div>
              </div>

              {/* Current Load */}
              {selectedShift.waiterLoad && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Current Load</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Tables:</span>
                      <span className="ml-2 font-medium">
                        {selectedShift.waiterLoad.currentTables} / {selectedShift.waiterLoad.maxCapacity}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Guests:</span>
                      <span className="ml-2 font-medium">
                        {selectedShift.waiterLoad.totalGuests}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Tables */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Assigned Tables ({selectedShift.assignments.length})
                </h4>
                {selectedShift.assignments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedShift.assignments.map(assignment => (
                      <div
                        key={assignment.id}
                        className="bg-gray-50 rounded-lg p-3 text-sm"
                      >
                        <div className="font-medium">
                          Table {assignment.tableNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          Since {format(new Date(assignment.assignedAt), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tables assigned yet</p>
                )}
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleAutoAssign(selectedShift);
                      setSelectedShift(null);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Auto-Assign Tables
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentScheduleView;