import { X, Clock, User, Calendar, Building, Edit2, Trash2, Coffee, LogIn, LogOut, Timer, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { shiftsAPI } from '../../services/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
}

interface Shift {
  _id: string;
  employee: Employee;
  date: string;
  shiftType: string;
  scheduledTimes: {
    start: string;
    end: string;
  };
  actualTimes?: {
    clockIn?: string;
    clockOut?: string;
    breaks?: Array<{
      start: string;
      end?: string;
      type: 'short' | 'meal';
    }>;
  };
  status: string;
  department?: string;
  position?: string;
  notes?: string;
  payroll?: {
    totalHours?: number;
    regularHours?: number;
    overtimeHours?: number;
    hourlyRate?: number;
    totalPay?: number;
  };
}

interface ShiftDetailsModalProps {
  isOpen: boolean;
  shift: Shift;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  employees?: Employee[];
}

const ShiftDetailsModal = ({ isOpen, shift, onClose, onEdit, onDelete, employees = [] }: ShiftDetailsModalProps) => {
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapWithEmployee, setSwapWithEmployee] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('-', ' ')}
      </span>
    );
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    const diff = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateActualDuration = () => {
    if (!shift.actualTimes?.clockIn) return null;
    
    const clockIn = new Date(shift.actualTimes.clockIn);
    const clockOut = shift.actualTimes.clockOut 
      ? new Date(shift.actualTimes.clockOut)
      : new Date();
    
    const diff = clockOut.getTime() - clockIn.getTime();
    
    // Subtract break time
    let breakTime = 0;
    shift.actualTimes.breaks?.forEach(breakItem => {
      if (breakItem.end) {
        const breakStart = new Date(breakItem.start);
        const breakEnd = new Date(breakItem.end);
        breakTime += breakEnd.getTime() - breakStart.getTime();
      }
    });
    
    const workTime = diff - breakTime;
    const hours = Math.floor(workTime / (1000 * 60 * 60));
    const minutes = Math.floor((workTime % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Shift Details</h3>
            {getStatusBadge(shift.status)}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Employee Info */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Employee Information</h4>
            <div className="flex items-center space-x-4">
              <img
                className="h-12 w-12 rounded-full"
                src={shift.employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shift.employee.name)}&background=6366f1&color=fff`}
                alt={shift.employee.name}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{shift.employee.name}</p>
                <p className="text-sm text-gray-500">{shift.employee.email}</p>
                {shift.employee.phone && (
                  <p className="text-sm text-gray-500">{shift.employee.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shift Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Shift Information</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium capitalize">{shift.shiftType}</span>
                </div>
                {shift.department && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-medium">{shift.department}</span>
                  </div>
                )}
                {shift.position && (
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Position:</span>
                    <span className="ml-2 font-medium">{shift.position}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Time Details</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">Scheduled:</span>
                  <div className="font-medium">
                    {format(new Date(`2000-01-01T${shift.scheduledTimes.start}`), 'h:mm a')} - 
                    {format(new Date(`2000-01-01T${shift.scheduledTimes.end}`), 'h:mm a')}
                    <span className="text-gray-500 ml-1">
                      ({calculateDuration(shift.scheduledTimes.start, shift.scheduledTimes.end)})
                    </span>
                  </div>
                </div>

                {shift.actualTimes?.clockIn && (
                  <div className="text-sm">
                    <span className="text-gray-600">Actual:</span>
                    <div className="font-medium">
                      <LogIn className="h-3 w-3 inline mr-1" />
                      {format(new Date(shift.actualTimes.clockIn), 'h:mm a')}
                      {shift.actualTimes.clockOut && (
                        <>
                          {' - '}
                          <LogOut className="h-3 w-3 inline mr-1" />
                          {format(new Date(shift.actualTimes.clockOut), 'h:mm a')}
                          <span className="text-gray-500 ml-1">
                            ({calculateActualDuration()})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Breaks */}
          {shift.actualTimes?.breaks && shift.actualTimes.breaks.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Breaks</h4>
              <div className="space-y-2">
                {shift.actualTimes.breaks.map((breakItem, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <Coffee className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="capitalize">{breakItem.type} break:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(breakItem.start), 'h:mm a')}
                      {breakItem.end && ` - ${format(new Date(breakItem.end), 'h:mm a')}`}
                      {!breakItem.end && <span className="text-orange-600 ml-1">(In progress)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Info */}
          {shift.payroll && shift.status === 'completed' && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Payroll Information</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Regular Hours:</span>
                    <span className="ml-2 font-medium">{shift.payroll.regularHours?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Overtime Hours:</span>
                    <span className="ml-2 font-medium">{shift.payroll.overtimeHours?.toFixed(2) || '0.00'}</span>
                  </div>
                  {shift.payroll.hourlyRate && (
                    <>
                      <div>
                        <span className="text-gray-600">Hourly Rate:</span>
                        <span className="ml-2 font-medium">AED {shift.payroll.hourlyRate.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Pay:</span>
                        <span className="ml-2 font-medium text-green-600">
                          AED {shift.payroll.totalPay?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {shift.notes && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Notes</h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {shift.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onDelete}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancel Shift
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Shift
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftDetailsModal;