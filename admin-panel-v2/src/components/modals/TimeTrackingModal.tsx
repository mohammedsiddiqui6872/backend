import { useState, useEffect } from 'react';
import { X, LogIn, LogOut, Coffee, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { shiftsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Employee, Shift } from '../../types/shift';

interface TimeTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onRefresh: () => void;
}

const TimeTrackingModal = ({ isOpen, onClose, employees, onRefresh }: TimeTrackingModalProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pin, setPin] = useState('');

  useEffect(() => {
    // Only set up timer when modal is open
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Cleanup timer when modal closes or component unmounts
    return () => {
      clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchActiveShift();
    }
  }, [selectedEmployee]);

  const fetchActiveShift = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      const response = await shiftsAPI.getActiveShift(selectedEmployee);
      setActiveShift(response.data.data);
    } catch (error) {
      console.error('Failed to fetch active shift');
      setActiveShift(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!activeShift) {
      toast.error('No scheduled shift found for today');
      return;
    }

    try {
      await shiftsAPI.clockIn(activeShift._id);
      toast.success('Clocked in successfully');
      fetchActiveShift();
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any).response?.data?.message || 'Failed to clock in';
      toast.error(errorMessage);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;

    try {
      await shiftsAPI.clockOut(activeShift._id);
      toast.success('Clocked out successfully');
      setSelectedEmployee('');
      setActiveShift(null);
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any).response?.data?.message || 'Failed to clock out';
      toast.error(errorMessage);
    }
  };

  const handleStartBreak = async (type: 'short' | 'meal') => {
    if (!activeShift) return;

    try {
      await shiftsAPI.startBreak(activeShift._id, type);
      toast.success(`${type === 'short' ? 'Short' : 'Meal'} break started`);
      fetchActiveShift();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any).response?.data?.message || 'Failed to start break';
      toast.error(errorMessage);
    }
  };

  const handleEndBreak = async () => {
    if (!activeShift) return;

    try {
      await shiftsAPI.endBreak(activeShift._id);
      toast.success('Break ended');
      fetchActiveShift();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any).response?.data?.message || 'Failed to end break';
      toast.error(errorMessage);
    }
  };

  const calculateHoursWorked = () => {
    if (!activeShift?.actualTimes?.clockIn) return '0:00';
    
    const clockIn = new Date(activeShift.actualTimes.clockIn);
    const clockOut = activeShift.actualTimes.clockOut 
      ? new Date(activeShift.actualTimes.clockOut)
      : currentTime;
    
    const diff = clockOut.getTime() - clockIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const isOnBreak = () => {
    return activeShift?.actualTimes?.breaks?.some(b => !b.end) || false;
  };

  const getCurrentBreak = () => {
    return activeShift?.actualTimes?.breaks?.find(b => !b.end);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Time Clock</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Current Time Display */}
        <div className="text-center mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-900">
            {format(currentTime, 'h:mm:ss a')}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>

        {/* Employee Selection */}
        {!selectedEmployee ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {employees.map(emp => (
                <button
                  key={emp._id}
                  onClick={() => setSelectedEmployee(emp._id)}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2">
                    <img
                      className="h-8 w-8 rounded-full"
                      src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff`}
                      alt={emp.name}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.role}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Selected Employee Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    className="h-10 w-10 rounded-full"
                    src={employees.find(e => e._id === selectedEmployee)?.avatar || 
                         `https://ui-avatars.com/api/?name=${encodeURIComponent(
                           employees.find(e => e._id === selectedEmployee)?.name || ''
                         )}&background=6366f1&color=fff`}
                    alt=""
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {employees.find(e => e._id === selectedEmployee)?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employees.find(e => e._id === selectedEmployee)?.role}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmployee('');
                    setActiveShift(null);
                    setPin('');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-900"
                >
                  Change
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : activeShift ? (
              <div>
                {/* Shift Info */}
                <div className="mb-4 p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between mb-1">
                      <span>Shift:</span>
                      <span className="font-medium capitalize">{activeShift.shiftType}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Scheduled:</span>
                      <span className="font-medium">
                        {format(new Date(`2000-01-01T${activeShift.scheduledTimes.start}`), 'h:mm a')} - 
                        {format(new Date(`2000-01-01T${activeShift.scheduledTimes.end}`), 'h:mm a')}
                      </span>
                    </div>
                    {activeShift.actualTimes?.clockIn && (
                      <div className="flex justify-between mb-1">
                        <span>Clocked In:</span>
                        <span className="font-medium">
                          {format(new Date(activeShift.actualTimes.clockIn), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    {activeShift.actualTimes?.clockIn && (
                      <div className="flex justify-between">
                        <span>Hours Worked:</span>
                        <span className="font-medium">{calculateHoursWorked()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PIN Entry (optional - for production use) */}
                {/* <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter PIN
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="4-digit PIN"
                    maxLength={4}
                  />
                </div> */}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!activeShift.actualTimes?.clockIn ? (
                    <button
                      onClick={handleClockIn}
                      className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <LogIn className="h-5 w-5 mr-2" />
                      Clock In
                    </button>
                  ) : !activeShift.actualTimes?.clockOut ? (
                    <>
                      {isOnBreak() ? (
                        <button
                          onClick={handleEndBreak}
                          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                        >
                          <Coffee className="h-5 w-5 mr-2" />
                          End {getCurrentBreak()?.type === 'meal' ? 'Meal' : 'Short'} Break
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleStartBreak('short')}
                            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Coffee className="h-4 w-4 mr-2" />
                            Short Break
                          </button>
                          <button
                            onClick={() => handleStartBreak('meal')}
                            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Coffee className="h-4 w-4 mr-2" />
                            Meal Break
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={handleClockOut}
                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Clock Out
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-green-800">
                        <Clock className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">Shift Completed</p>
                        <p className="text-sm mt-1">
                          Worked: {calculateHoursWorked()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No active shift found for today</p>
                <p className="text-sm text-gray-500 mt-1">
                  Please check your schedule or contact your manager
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTrackingModal;