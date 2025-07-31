import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
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
  department?: string;
  position?: string;
  notes?: string;
  status: string;
}

interface EditShiftModalProps {
  isOpen: boolean;
  shift: Shift;
  onClose: () => void;
  onEdit: (data: any) => void;
  employees: Employee[];
}

const EditShiftModal = ({ isOpen, shift, onClose, onEdit, employees }: EditShiftModalProps) => {
  const [formData, setFormData] = useState({
    employee: '',
    date: '',
    shiftType: 'morning',
    scheduledTimes: {
      start: '09:00',
      end: '17:00'
    },
    department: '',
    position: '',
    notes: '',
    status: 'scheduled'
  });

  const shiftTimePresets = {
    morning: { start: '06:00', end: '14:00' },
    afternoon: { start: '14:00', end: '22:00' },
    evening: { start: '16:00', end: '00:00' },
    night: { start: '22:00', end: '06:00' },
    custom: { start: '09:00', end: '17:00' }
  };

  useEffect(() => {
    if (shift) {
      setFormData({
        employee: shift.employee._id,
        date: format(new Date(shift.date), 'yyyy-MM-dd'),
        shiftType: shift.shiftType,
        scheduledTimes: shift.scheduledTimes,
        department: shift.department || '',
        position: shift.position || '',
        notes: shift.notes || '',
        status: shift.status
      });
    }
  }, [shift]);

  useEffect(() => {
    // Update times when shift type changes
    if (formData.shiftType !== 'custom' && formData.shiftType !== shift.shiftType) {
      setFormData(prev => ({
        ...prev,
        scheduledTimes: shiftTimePresets[formData.shiftType as keyof typeof shiftTimePresets]
      }));
    }
  }, [formData.shiftType, shift.shiftType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee) {
      toast.error('Please select an employee');
      return;
    }

    // Don't allow editing if shift is completed or in progress
    if (shift.status === 'completed' || shift.status === 'in-progress') {
      toast.error('Cannot edit a shift that is in progress or completed');
      return;
    }

    onEdit(formData);
  };

  if (!isOpen) return null;

  const canEdit = ['scheduled', 'cancelled'].includes(shift.status);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Shift</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!canEdit && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              This shift is {shift.status} and cannot be edited.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employee}
              onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
              disabled={!canEdit}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shift Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.shiftType}
              onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              disabled={!canEdit}
            >
              <option value="morning">Morning (6 AM - 2 PM)</option>
              <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
              <option value="evening">Evening (4 PM - 12 AM)</option>
              <option value="night">Night (10 PM - 6 AM)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.scheduledTimes.start}
                onChange={(e) => setFormData({
                  ...formData,
                  scheduledTimes: { ...formData.scheduledTimes, start: e.target.value }
                })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
                disabled={!canEdit}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.scheduledTimes.end}
                onChange={(e) => setFormData({
                  ...formData,
                  scheduledTimes: { ...formData.scheduledTimes, end: e.target.value }
                })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
                disabled={!canEdit}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              disabled={!canEdit}
            >
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Any special instructions or notes..."
              disabled={!canEdit}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Save Changes
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;