import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, 
  ChevronRight, Filter, Download, Upload, AlertCircle, CheckCircle,
  XCircle, Timer, Coffee, LogIn, LogOut, Repeat, Eye
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { shiftsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AddShiftModal from '../components/modals/AddShiftModal';
import EditShiftModal from '../components/modals/EditShiftModal';
import ShiftDetailsModal from '../components/modals/ShiftDetailsModal';
import TimeTrackingModal from '../components/modals/TimeTrackingModal';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  profile?: {
    department?: string;
    position?: string;
  };
}

interface ShiftTime {
  start: string;
  end: string;
}

interface ActualTimes {
  clockIn?: string;
  clockOut?: string;
  breaks: Array<{
    start: string;
    end?: string;
    type: 'short' | 'meal';
  }>;
}

interface Shift {
  _id: string;
  employee: Employee;
  date: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  scheduledTimes: ShiftTime;
  actualTimes?: ActualTimes;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  department?: string;
  position?: string;
  notes?: string;
  overtime?: {
    hours: number;
    approved: boolean;
  };
}

interface ShiftStats {
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  noShowShifts: number;
  completionRate: number;
  totalHoursScheduled: number;
  totalHoursWorked: number;
  overtimeHours: number;
  pendingSwapRequests: number;
}

const Shifts = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTimeTrackingModal, setShowTimeTrackingModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
    fetchStats();
  }, [currentWeek, filterDepartment, filterEmployee]);

  const fetchShifts = async () => {
    try {
      const response = await shiftsAPI.getShifts({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        department: filterDepartment,
        employee: filterEmployee
      });
      setShifts(response.data.data);
    } catch (error) {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await shiftsAPI.getEmployees();
      setEmployees(response.data.data);
    } catch (error) {
      console.error('Failed to load employees');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await shiftsAPI.getStats({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleAddShift = async (data: any) => {
    try {
      await shiftsAPI.createShift(data);
      toast.success('Shift created successfully');
      setShowAddModal(false);
      setSelectedDate(null);
      fetchShifts();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create shift');
    }
  };

  const handleEditShift = async (data: any) => {
    if (!selectedShift) return;
    
    try {
      await shiftsAPI.updateShift(selectedShift._id, data);
      toast.success('Shift updated successfully');
      setShowEditModal(false);
      setSelectedShift(null);
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update shift');
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
      toast.error('Failed to cancel shift');
    }
  };

  const getShiftsForDay = (date: Date) => {
    return shifts.filter(shift => isSameDay(new Date(shift.date), date));
  };

  const getShiftColor = (shiftType: string) => {
    const colors: Record<string, string> = {
      morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
      evening: 'bg-purple-100 text-purple-800 border-purple-200',
      night: 'bg-gray-100 text-gray-800 border-gray-200',
      custom: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[shiftType] || 'bg-gray-100 text-gray-800 border-gray-200';
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
          const shift: any = {};
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
              shiftType: shiftData['Shift Type'].toLowerCase(),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Shift Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Schedule and track employee shifts
          </p>
        </div>
        <div className="flex space-x-3">
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
      </div>

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
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-md"
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
                className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                  viewMode === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border-t border-b border-r`}
              >
                Day
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                      setSelectedShift(shift);
                      setShowDetailsModal(true);
                    }}
                    className={`p-2 rounded-md border cursor-pointer hover:shadow-md transition-shadow ${
                      getShiftColor(shift.shiftType)
                    }`}
                  >
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
                className="mt-2 w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              >
                <Plus className="h-4 w-4 mx-auto" />
              </button>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default Shifts;