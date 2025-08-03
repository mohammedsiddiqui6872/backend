import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, 
  ChevronRight, Filter, Download, Upload, AlertCircle, CheckCircle,
  XCircle, Timer, Coffee, LogIn, LogOut, Repeat, Eye, Copy, FileText, Edit3, Bell
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { shiftsAPI, shiftTemplatesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { getShiftTypeColor } from '../../utils/shiftUtils';
import { handleApiError, retryOperation } from '../../utils/errorHandling';
import ErrorBoundary from '../common/ErrorBoundary';
import { getShiftAriaLabel, announce, handleCalendarKeyboard, getAccessibleShiftColor } from '../../utils/accessibility';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import SkipLink from '../common/SkipLink';
import { Employee, Shift, ShiftStats, ShiftFormData, ShiftUpdateData, ShiftType } from '../../types/shift';
import AddShiftModal from '../modals/AddShiftModal';
import EditShiftModal from '../modals/EditShiftModal';
import ShiftDetailsModal from '../modals/ShiftDetailsModal';
import TimeTrackingModal from '../modals/TimeTrackingModal';
import ShiftTemplateModal from '../modals/ShiftTemplateModal';
import ShiftTemplatesListModal from '../modals/ShiftTemplatesListModal';
import BulkShiftOperationsModal from '../modals/BulkShiftOperationsModal';
import QuickStatsWidget from './QuickStatsWidget';
import MonthViewCalendar from './MonthViewCalendar';
import ConflictDetectionWidget from './ConflictDetectionWidget';
import ShiftNotifications from './ShiftNotifications';

const ShiftManagement = () => {
  const { settings } = useAccessibility();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTimeTrackingModal, setShowTimeTrackingModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplatesListModal, setShowTemplatesListModal] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [showBulkOperationsModal, setShowBulkOperationsModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [isCopyingLastWeek, setIsCopyingLastWeek] = useState(false);

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
    fetchStats();
    checkUnreadNotifications();
  }, [currentWeek, filterDepartment, filterEmployee]);

  const checkUnreadNotifications = async () => {
    try {
      const response = await shiftsAPI.getNotifications({ status: 'delivered' });
      setUnreadNotifications(response.data.data.length);
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await retryOperation(() => 
        shiftsAPI.getShifts({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          department: filterDepartment,
          employee: filterEmployee
        })
      );
      setShifts(response.data.data);
    } catch (error) {
      handleApiError(error, 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await retryOperation(() => shiftsAPI.getEmployees());
      setEmployees(response.data.data);
    } catch (error) {
      handleApiError(error, 'Failed to load employees');
      console.error('Failed to load employees:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await retryOperation(() => 
        shiftsAPI.getStats({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString()
        })
      );
      setStats(response.data.data);
    } catch (error) {
      handleApiError(error, 'Failed to load statistics');
      console.error('Failed to load stats:', error);
    }
  };

  const handleAddShift = async (data: ShiftFormData) => {
    try {
      await shiftsAPI.createShift(data);
      toast.success('Shift created successfully');
      setShowAddModal(false);
      setSelectedDate(null);
      fetchShifts();
      fetchStats();
    } catch (error) {
      handleApiError(error, 'Failed to create shift');
    }
  };

  const handleEditShift = async (data: ShiftUpdateData) => {
    if (!selectedShift) return;
    
    try {
      await shiftsAPI.updateShift(selectedShift._id, data);
      toast.success('Shift updated successfully');
      setShowEditModal(false);
      setSelectedShift(null);
      fetchShifts();
    } catch (error) {
      handleApiError(error, 'Failed to update shift');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('Are you sure you want to cancel this shift?')) {
      return;
    }

    try {
      await shiftsAPI.deleteShift(shiftId);
      toast.success('Shift cancelled successfully');
      fetchShifts();
      fetchStats();
    } catch (error) {
      handleApiError(error, 'Failed to cancel shift');
    }
  };

  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => isSameDay(new Date(shift.date), date));
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Timer className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no-show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const copyLastWeekShifts = async () => {
    setIsCopyingLastWeek(true);
    try {
      // Calculate last week's date range
      const lastWeekStart = startOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 });
      
      // Fetch last week's shifts
      const response = await shiftsAPI.getShifts({
        startDate: lastWeekStart.toISOString(),
        endDate: lastWeekEnd.toISOString(),
        department: filterDepartment,
        employee: filterEmployee
      });
      
      const lastWeekShifts = response.data.data;
      
      if (lastWeekShifts.length === 0) {
        toast.error('No shifts found in the previous week to copy');
        return;
      }
      
      // Copy each shift to current week
      let successCount = 0;
      let errorCount = 0;
      
      for (const shift of lastWeekShifts) {
        try {
          // Calculate the new date (add 7 days)
          const originalDate = new Date(shift.date);
          const newDate = new Date(originalDate);
          newDate.setDate(originalDate.getDate() + 7);
          
          // Only copy if the shift is scheduled (not completed, cancelled, etc.)
          if (shift.status === 'scheduled') {
            await shiftsAPI.createShift({
              employee: shift.employee?._id,
              date: newDate.toISOString(),
              shiftType: shift.shiftType,
              scheduledTimes: {
                start: shift.scheduledTimes.start,
                end: shift.scheduledTimes.end
              },
              department: shift.department,
              position: shift.position,
              notes: shift.notes ? `${shift.notes} (Copied from last week)` : 'Copied from last week'
            });
            successCount++;
          }
        } catch (error) {
          console.error('Error copying shift:', error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully copied ${successCount} shift${successCount > 1 ? 's' : ''} from last week`);
        fetchShifts();
        fetchStats();
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to copy ${errorCount} shift${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error copying last week shifts:', error);
      toast.error('Failed to copy shifts from last week');
    } finally {
      setIsCopyingLastWeek(false);
    }
  };

  const exportShifts = async () => {
    try {
      // Prepare CSV data
      const csvData = shifts.map(shift => ({
        Date: format(new Date(shift.date), 'yyyy-MM-dd'),
        Employee: shift.employee?.name || 'Unassigned',
        'Employee Email': shift.employee?.email || 'N/A',
        Department: shift.department || '',
        Position: shift.position || '',
        'Shift Type': shift.shiftType,
        'Start Time': shift.scheduledTimes.start,
        'End Time': shift.scheduledTimes.end,
        Status: shift.status,
        'Clock In': shift.actualTimes?.clockIn ? format(new Date(shift.actualTimes.clockIn), 'HH:mm') : '',
        'Clock Out': shift.actualTimes?.clockOut ? format(new Date(shift.actualTimes.clockOut), 'HH:mm') : '',
        Notes: shift.notes || ''
      }));

      // Convert to CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvString = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => 
            JSON.stringify(row[header as keyof typeof row] || '')
          ).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shifts-${format(weekStart, 'yyyy-MM-dd')}-to-${format(weekEnd, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Shifts exported successfully');
    } catch (error) {
      toast.error('Failed to export shifts');
      console.error('Export error:', error);
    }
  };

  const importShifts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const shifts = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const shift: Record<string, string> = {};
          headers.forEach((header, index) => {
            shift[header] = values[index];
          });
          return shift;
        });

        // Process each shift
        let successCount = 0;
        let errorCount = 0;

        for (const shiftData of shifts) {
          try {
            // Find employee by email
            const employee = employees.find(e => e.email === shiftData['Employee Email']);
            if (!employee) {
              errorCount++;
              continue;
            }

            await handleAddShift({
              employee: employee._id,
              date: shiftData.Date,
              shiftType: shiftData['Shift Type'].toLowerCase() as ShiftType,
              scheduledTimes: {
                start: shiftData['Start Time'],
                end: shiftData['End Time']
              },
              department: shiftData.Department,
              position: shiftData.Position,
              notes: shiftData.Notes
            });

            successCount++;
          } catch (error) {
            errorCount++;
          }
        }

        toast.success(`Import completed: ${successCount} shifts imported${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        fetchShifts();
        fetchStats();
      } catch (error) {
        toast.error('Failed to import CSV file');
        console.error('Import error:', error);
      }
    };

    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <SkipLink target="shift-calendar">Skip to calendar</SkipLink>
        <SkipLink target="shift-actions">Skip to actions</SkipLink>
      {/* Action Buttons */}
      <div id="shift-actions" className="flex justify-end space-x-3" role="toolbar" aria-label="Shift management actions">
        <button
          onClick={() => setShowNotifications(true)}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </button>
        {isSelectionMode && (
          <>
            <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700">
              {selectedShifts.length} selected
            </span>
            <button
              onClick={() => setShowBulkOperationsModal(true)}
              disabled={selectedShifts.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label="Bulk operations on selected shifts"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Operations
            </button>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedShifts([]);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label="Cancel selection"
            >
              Cancel
            </button>
          </>
        )}
        {!isSelectionMode && (
          <button
            onClick={() => setIsSelectionMode(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            aria-label="Enable multi-select mode"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Select Multiple
          </button>
        )}
        <button
          onClick={() => setShowTemplatesListModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Manage shift templates"
        >
          <FileText className="h-4 w-4 mr-2" />
          Templates
        </button>
        <button
          onClick={copyLastWeekShifts}
          disabled={isCopyingLastWeek}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Copy shifts from last week"
          aria-busy={isCopyingLastWeek}
        >
          <Copy className="h-4 w-4 mr-2" />
          {isCopyingLastWeek ? 'Copying...' : 'Copy Last Week'}
        </button>
        <button
          onClick={() => setShowTimeTrackingModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Timer className="h-4 w-4 mr-2" />
          Time Clock
        </button>
        <button
          onClick={exportShifts}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
        <button
          onClick={importShifts}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Shift
        </button>
      </div>

      {/* Quick Stats Dashboard */}
      {showQuickStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickStatsWidget shifts={shifts} employees={employees} />
          <ConflictDetectionWidget 
            shifts={shifts} 
            onShiftClick={(shiftId) => {
              const shift = shifts.find(s => s._id === shiftId);
              if (shift) {
                setSelectedShift(shift);
                setShowDetailsModal(true);
              }
            }}
          />
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Shifts
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.totalShifts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completion Rate
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.completionRate}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Hours Worked
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.totalHoursWorked.toFixed(1)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Repeat className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Swap Requests
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.pendingSwapRequests}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and View Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setCurrentWeek(subWeeks(currentWeek, 1));
                announce('Navigated to previous week');
              }}
              className="p-2 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label="Go to previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <button
              onClick={() => {
                setCurrentWeek(addWeeks(currentWeek, 1));
                announce('Navigated to next week');
              }}
              className="p-2 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label="Go to next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-md"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Service">Service</option>
              <option value="Management">Management</option>
              <option value="Bar">Bar</option>
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>

            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                  viewMode === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border-t border-b border-r`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                  viewMode === 'month'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border-t border-b border-r`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'month' ? (
        <MonthViewCalendar
          shifts={shifts}
          onDayClick={(date) => {
            setSelectedDate(date);
            setShowAddModal(true);
          }}
          onShiftClick={(shift) => {
            setSelectedShift(shift);
            setShowDetailsModal(true);
          }}
          selectedShifts={selectedShifts}
          isSelectionMode={isSelectionMode}
          onShiftSelect={(shiftId) => {
            setSelectedShifts(prev => 
              prev.includes(shiftId) 
                ? prev.filter(id => id !== shiftId)
                : [...prev, shiftId]
            );
          }}
        />
      ) : (
        <div id="shift-calendar" className="bg-white shadow rounded-lg overflow-hidden" role="region" aria-label="Shift calendar">
          <div className="grid grid-cols-7 gap-0 border-b">
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r last:border-r-0 ${
                isToday(day) ? 'bg-primary-50' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                {format(day, 'EEE')}
              </div>
              <div className={`text-2xl ${
                isToday(day) ? 'text-primary-600 font-semibold' : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className="min-h-[300px] border-r last:border-r-0 border-b p-2"
            >
              <div className="space-y-1">
                {getShiftsForDay(day).map(shift => (
                  <div
                    key={shift._id}
                    onClick={() => {
                      if (isSelectionMode) {
                        setSelectedShifts(prev => 
                          prev.includes(shift._id) 
                            ? prev.filter(id => id !== shift._id)
                            : [...prev, shift._id]
                        );
                      } else {
                        setSelectedShift(shift);
                        setShowDetailsModal(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isSelectionMode) {
                          setSelectedShifts(prev => 
                            prev.includes(shift._id) 
                              ? prev.filter(id => id !== shift._id)
                              : [...prev, shift._id]
                          );
                        } else {
                          setSelectedShift(shift);
                          setShowDetailsModal(true);
                        }
                      }
                    }}
                    className={`p-2 rounded-md border cursor-pointer hover:shadow-md transition-shadow relative ${
                      getAccessibleShiftColor(shift.shiftType, settings.colorblindMode)
                    } ${
                      selectedShifts.includes(shift._id) ? 'ring-2 ring-primary-500' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-label={getShiftAriaLabel(shift)}
                    aria-selected={selectedShifts.includes(shift._id)}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-1 left-1">
                        <input
                          type="checkbox"
                          checked={selectedShifts.includes(shift._id)}
                          onChange={() => {}}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          aria-label={`Select shift for ${shift.employee?.name || 'Unassigned'}`}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {shift.employee ? (
                          <>
                            <img
                              className="h-6 w-6 rounded-full"
                              src={shift.employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shift.employee.name)}&background=6366f1&color=fff`}
                              alt={shift.employee.name}
                            />
                            <span className="text-xs font-medium truncate">
                              {shift.employee.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-gray-500">
                            Unassigned
                          </span>
                        )}
                      </div>
                      {getStatusIcon(shift.status)}
                    </div>
                    <div className="mt-1 text-xs">
                      {format(new Date(`2000-01-01T${shift.scheduledTimes.start}`), 'h:mm a')} - 
                      {format(new Date(`2000-01-01T${shift.scheduledTimes.end}`), 'h:mm a')}
                    </div>
                    {shift.department && (
                      <div className="mt-1 text-xs text-gray-600">
                        {shift.department}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Add shift button for empty slots */}
              <button
                onClick={() => {
                  setSelectedDate(day);
                  setShowAddModal(true);
                }}
                className="mt-2 w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                aria-label={`Add shift for ${format(day, 'EEEE, MMMM d')}`}
              >
                <Plus className="h-4 w-4 mx-auto" />
              </button>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddShiftModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedDate(null);
          }}
          onAdd={handleAddShift}
          employees={employees}
          selectedDate={selectedDate}
        />
      )}

      {showEditModal && selectedShift && (
        <EditShiftModal
          isOpen={showEditModal}
          shift={selectedShift}
          onClose={() => {
            setShowEditModal(false);
            setSelectedShift(null);
          }}
          onEdit={handleEditShift}
          employees={employees}
        />
      )}

      {showDetailsModal && selectedShift && (
        <ShiftDetailsModal
          isOpen={showDetailsModal}
          shift={selectedShift}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedShift(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            handleDeleteShift(selectedShift._id);
            setShowDetailsModal(false);
            setSelectedShift(null);
          }}
          employees={employees}
        />
      )}

      {showTimeTrackingModal && (
        <TimeTrackingModal
          isOpen={showTimeTrackingModal}
          onClose={() => setShowTimeTrackingModal(false)}
          employees={employees}
          onRefresh={() => {
            fetchShifts();
            fetchStats();
          }}
        />
      )}

      {showTemplatesListModal && (
        <ShiftTemplatesListModal
          isOpen={showTemplatesListModal}
          onClose={() => setShowTemplatesListModal(false)}
          onApplyTemplate={() => {
            fetchShifts();
            fetchStats();
          }}
        />
      )}

      {showBulkOperationsModal && (
        <BulkShiftOperationsModal
          isOpen={showBulkOperationsModal}
          onClose={() => setShowBulkOperationsModal(false)}
          selectedShifts={shifts.filter(s => selectedShifts.includes(s._id))}
          employees={employees}
          onOperationComplete={() => {
            fetchShifts();
            fetchStats();
            setSelectedShifts([]);
            setIsSelectionMode(false);
          }}
        />
      )}

      {showNotifications && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <ShiftNotifications
            onClose={() => {
              setShowNotifications(false);
              checkUnreadNotifications();
            }}
          />
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default ShiftManagement;