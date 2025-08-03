import React, { useState } from 'react';
import { X, RefreshCw, User, Calendar, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { shiftsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Shift, Employee } from '../../types/shift';

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  employees: Employee[];
  onSuccess: () => void;
}

const SwapRequestModal: React.FC<SwapRequestModalProps> = ({
  isOpen,
  onClose,
  shift,
  employees,
  onSuccess
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const eligibleEmployees = employees.filter(emp => 
    emp._id !== shift.employee?._id && 
    (!shift.department || emp.profile?.department === shift.department)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error('Please select an employee to swap with');
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the swap request');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await shiftsAPI.createSwapRequest(shift._id, {
        requestedWith: selectedEmployee,
        reason: reason.trim()
      });
      
      toast.success('Swap request sent successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create swap request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-primary-600" />
            Request Shift Swap
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Shift Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Current Shift Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {shift.scheduledTimes.start} - {shift.scheduledTimes.end} ({shift.shiftType})
              </div>
              {shift.department && (
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  {shift.department} - {shift.position}
                </div>
              )}
            </div>
          </div>

          {/* Select Employee */}
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
              Swap With
            </label>
            <select
              id="employee"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select an employee...</option>
              {eligibleEmployees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.profile?.department || 'No Department'} ({emp.role})
                </option>
              ))}
            </select>
            {eligibleEmployees.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                No eligible employees found for swap
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Reason for Swap
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Please explain why you need to swap this shift..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedEmployee || !reason.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SwapRequestModal;