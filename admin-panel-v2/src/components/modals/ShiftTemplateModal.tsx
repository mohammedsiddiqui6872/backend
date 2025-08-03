import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getShiftTypeColor } from '../../utils/shiftUtils';

interface ShiftTime {
  dayOfWeek: number;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  scheduledTimes: {
    start: string;
    end: string;
  };
  department?: string;
  position?: string;
  minStaff?: number;
  maxStaff?: number;
}

interface ShiftTemplate {
  _id?: string;
  name: string;
  description?: string;
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  shifts: ShiftTime[];
}

interface ShiftTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: ShiftTemplate) => void;
  template?: ShiftTemplate | null;
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ShiftTemplateModal = ({ isOpen, onClose, onSave, template }: ShiftTemplateModalProps) => {
  const [formData, setFormData] = useState<ShiftTemplate>({
    name: '',
    description: '',
    pattern: 'weekly',
    shifts: []
  });

  const [newShift, setNewShift] = useState<ShiftTime>({
    dayOfWeek: 1,
    shiftType: 'morning',
    scheduledTimes: {
      start: '09:00',
      end: '17:00'
    },
    minStaff: 1,
    maxStaff: 1
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        description: '',
        pattern: 'weekly',
        shifts: []
      });
    }
  }, [template]);

  const handleAddShift = () => {
    // Check for duplicates
    const duplicate = formData.shifts.find(s => 
      s.dayOfWeek === newShift.dayOfWeek && 
      s.scheduledTimes.start === newShift.scheduledTimes.start
    );

    if (duplicate) {
      toast.error('A shift already exists for this day and time');
      return;
    }

    setFormData({
      ...formData,
      shifts: [...formData.shifts, { ...newShift }].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.scheduledTimes.start.localeCompare(b.scheduledTimes.start);
      })
    });

    // Reset new shift form
    setNewShift({
      dayOfWeek: 1,
      shiftType: 'morning',
      scheduledTimes: {
        start: '09:00',
        end: '17:00'
      },
      minStaff: 1,
      maxStaff: 1
    });
  };

  const handleRemoveShift = (index: number) => {
    setFormData({
      ...formData,
      shifts: formData.shifts.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (formData.shifts.length === 0) {
      toast.error('Please add at least one shift to the template');
      return;
    }

    onSave(formData);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {template ? 'Edit Shift Template' : 'Create Shift Template'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Template Info */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="e.g., Standard Week Schedule"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Describe when to use this template..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pattern
              </label>
              <select
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value as any })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Add Shift Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Shift</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Day</label>
                <select
                  value={newShift.dayOfWeek}
                  onChange={(e) => setNewShift({ ...newShift, dayOfWeek: parseInt(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={newShift.shiftType}
                  onChange={(e) => setNewShift({ ...newShift, shiftType: e.target.value as any })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={newShift.scheduledTimes.start}
                  onChange={(e) => setNewShift({
                    ...newShift,
                    scheduledTimes: { ...newShift.scheduledTimes, start: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={newShift.scheduledTimes.end}
                  onChange={(e) => setNewShift({
                    ...newShift,
                    scheduledTimes: { ...newShift.scheduledTimes, end: e.target.value }
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  value={newShift.department || ''}
                  onChange={(e) => setNewShift({ ...newShift, department: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g., Kitchen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  value={newShift.position || ''}
                  onChange={(e) => setNewShift({ ...newShift, position: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g., Chef"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Min Staff</label>
                <input
                  type="number"
                  min="1"
                  value={newShift.minStaff}
                  onChange={(e) => setNewShift({ ...newShift, minStaff: parseInt(e.target.value) || 1 })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Staff</label>
                <input
                  type="number"
                  min="1"
                  value={newShift.maxStaff}
                  onChange={(e) => setNewShift({ ...newShift, maxStaff: parseInt(e.target.value) || 1 })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleAddShift}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </button>
          </div>

          {/* Shifts List */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Template Shifts ({formData.shifts.length})</h4>
            {formData.shifts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No shifts added yet</p>
            ) : (
              <div className="space-y-2">
                {formData.shifts.map((shift, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-gray-900">
                        {daysOfWeek[shift.dayOfWeek]}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getShiftTypeColor(shift.shiftType)}`}>
                        {shift.shiftType}
                      </span>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(new Date(`2000-01-01T${shift.scheduledTimes.start}`), 'h:mm a')} - 
                        {format(new Date(`2000-01-01T${shift.scheduledTimes.end}`), 'h:mm a')}
                      </div>
                      {shift.department && (
                        <span className="text-sm text-gray-600">{shift.department}</span>
                      )}
                      {shift.position && (
                        <span className="text-sm text-gray-600">{shift.position}</span>
                      )}
                      <span className="text-sm text-gray-500">
                        Staff: {shift.minStaff}-{shift.maxStaff}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShift(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            {template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftTemplateModal;