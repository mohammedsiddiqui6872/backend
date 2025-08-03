import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { validateShiftTimes, getShiftTypeDefaults } from '../../utils/shiftUtils';
import { Employee, ShiftFormData, ShiftType } from '../../types/shift';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: ShiftFormData) => void;
  employees: Employee[];
  selectedDate?: Date | null;
}

const AddShiftModal = ({ isOpen, onClose, onAdd, employees, selectedDate }: AddShiftModalProps) => {
  const [formData, setFormData] = useState<ShiftFormData>({
    employee: '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    shiftType: 'morning' as ShiftType,
    scheduledTimes: {
      start: '09:00',
      end: '17:00'
    },
    department: '',
    position: '',
    notes: ''
  });


  useEffect(() => {
    // Update times when shift type changes
    if (formData.shiftType !== 'custom') {
      const defaults = getShiftTypeDefaults(formData.shiftType);
      setFormData(prev => ({
        ...prev,
        scheduledTimes: defaults
      }));
    }
  }, [formData.shiftType]);

  useEffect(() => {
    // Update department and position when employee changes
    if (formData.employee) {
      const employee = employees.find(e => e._id === formData.employee);
      if (employee) {
        setFormData(prev => ({
          ...prev,
          department: employee.profile?.department || '',
          position: employee.profile?.position || ''
        }));
      }
    }
  }, [formData.employee, employees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee) {
      toast.error('Please select an employee');
      return;
    }

    // Validate times
    const validation = validateShiftTimes(
      formData.scheduledTimes.start,
      formData.scheduledTimes.end,
      formData.shiftType
    );
    
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid shift times');
      return;
    }

    onAdd(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Shift</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Shift Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.shiftType}
              onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as ShiftType })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Auto-filled from employee"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Auto-filled from employee"
              />
            </div>
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
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Add Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShiftModal;