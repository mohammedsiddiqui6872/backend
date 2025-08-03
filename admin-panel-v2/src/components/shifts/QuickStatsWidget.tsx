import React from 'react';
import { Clock, Users, AlertCircle, TrendingUp, Calendar, UserCheck } from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import { Shift } from '../../types/shift';

interface QuickStatsWidgetProps {
  shifts: Shift[];
  employees: any[];
}

const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({ shifts, employees }) => {
  // Today's stats
  const todayShifts = shifts.filter(s => isToday(new Date(s.date)));
  const tomorrowShifts = shifts.filter(s => isTomorrow(new Date(s.date)));
  
  const todayScheduled = todayShifts.filter(s => s.status === 'scheduled').length;
  const todayInProgress = todayShifts.filter(s => s.status === 'in-progress').length;
  const todayCompleted = todayShifts.filter(s => s.status === 'completed').length;
  const todayUnassigned = todayShifts.filter(s => !s.employee).length;
  
  // Coverage calculation
  const totalEmployees = employees.length;
  const todayAssignedEmployees = new Set(todayShifts.filter(s => s.employee).map(s => s.employee?._id)).size;
  const coveragePercentage = totalEmployees > 0 ? Math.round((todayAssignedEmployees / totalEmployees) * 100) : 0;
  
  // Upcoming shifts needing attention
  const upcomingUnassigned = shifts
    .filter(s => new Date(s.date) > new Date() && !s.employee)
    .slice(0, 5);
    
  // Overtime warnings (employees with more than 8 hours today)
  const employeeHoursToday = todayShifts.reduce((acc, shift) => {
    if (shift.employee && shift.scheduledTimes) {
      const employeeId = shift.employee._id;
      const start = new Date(`2000-01-01T${shift.scheduledTimes.start}`);
      const end = new Date(`2000-01-01T${shift.scheduledTimes.end}`);
      let duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Handle overnight shifts
      if (end < start) {
        duration += 24;
      }
      
      acc[employeeId] = (acc[employeeId] || 0) + duration;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const overtimeWarnings = Object.entries(employeeHoursToday)
    .filter(([_, hours]) => hours > 8)
    .map(([employeeId, hours]) => ({
      employee: employees.find(e => e._id === employeeId),
      hours
    }))
    .filter(item => item.employee);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Quick Stats Dashboard</h3>
      
      {/* Today's Overview */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Today's Overview</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-semibold text-blue-900">{todayScheduled}</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">Scheduled</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-semibold text-green-900">{todayInProgress}</span>
            </div>
            <p className="text-xs text-green-700 mt-1">In Progress</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-semibold text-purple-900">{todayCompleted}</span>
            </div>
            <p className="text-xs text-purple-700 mt-1">Completed</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-semibold text-orange-900">{todayUnassigned}</span>
            </div>
            <p className="text-xs text-orange-700 mt-1">Unassigned</p>
          </div>
        </div>
      </div>
      
      {/* Coverage Meter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Today's Coverage</h4>
          <span className="text-sm font-semibold text-gray-900">{coveragePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              coveragePercentage >= 80 ? 'bg-green-600' : 
              coveragePercentage >= 60 ? 'bg-yellow-600' : 
              'bg-red-600'
            }`}
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {todayAssignedEmployees} of {totalEmployees} employees scheduled
        </p>
      </div>
      
      {/* Alerts Section */}
      <div className="space-y-4">
        {/* Unassigned Shifts Alert */}
        {upcomingUnassigned.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="ml-3">
                <h5 className="text-sm font-medium text-yellow-800">Unassigned Shifts</h5>
                <div className="mt-2 space-y-1">
                  {upcomingUnassigned.map((shift, idx) => (
                    <p key={shift._id} className="text-xs text-yellow-700">
                      • {format(new Date(shift.date), 'MMM d')} - {shift.shiftType} ({shift.scheduledTimes.start} - {shift.scheduledTimes.end})
                    </p>
                  ))}
                  {shifts.filter(s => new Date(s.date) > new Date() && !s.employee).length > 5 && (
                    <p className="text-xs text-yellow-700 italic">
                      And {shifts.filter(s => new Date(s.date) > new Date() && !s.employee).length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Overtime Warnings */}
        {overtimeWarnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="ml-3">
                <h5 className="text-sm font-medium text-red-800">Overtime Alerts</h5>
                <div className="mt-2 space-y-1">
                  {overtimeWarnings.map((warning, idx) => (
                    <p key={idx} className="text-xs text-red-700">
                      • {warning.employee.name}: {warning.hours.toFixed(1)} hours scheduled today
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Tomorrow Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Tomorrow's Preview</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>{tomorrowShifts.length} total shifts</p>
              <p className="text-xs mt-1">{tomorrowShifts.filter(s => !s.employee).length} need assignment</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {new Set(tomorrowShifts.filter(s => s.employee).map(s => s.employee?._id)).size} staff
              </p>
              <p className="text-xs text-gray-600">scheduled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStatsWidget;