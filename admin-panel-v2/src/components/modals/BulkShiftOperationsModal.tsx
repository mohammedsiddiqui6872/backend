import React, { useState } from 'react';
import { X, Calendar, Users, Clock, Trash2, Edit3, Copy } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Shift, Employee, ShiftType, ShiftStatus } from '../../types/shift';
import { shiftsAPI } from '../../services/api';
import { handleApiError } from '../../utils/errorHandling';
import AccessibleModal from '../common/AccessibleModal';

interface BulkShiftOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShifts: Shift[];
  employees: Employee[];
  onOperationComplete: () => void;
}

type BulkOperation = 'assign' | 'reassign' | 'changeType' | 'changeStatus' | 'delete' | 'duplicate';

const BulkShiftOperationsModal: React.FC<BulkShiftOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedShifts,
  employees,
  onOperationComplete
}) => {
  const [operation, setOperation] = useState<BulkOperation>('assign');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [status, setStatus] = useState<ShiftStatus>('scheduled');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkOperation = async () => {
    if (selectedShifts.length === 0) {
      toast.error('No shifts selected');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      switch (operation) {
        case 'assign':
        case 'reassign':
          if (!selectedEmployee) {
            toast.error('Please select an employee');
            setIsProcessing(false);
            return;
          }

          for (const shift of selectedShifts) {
            try {
              await shiftsAPI.updateShift(shift._id, { 
                employee: selectedEmployee 
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Failed to update shift ${shift._id}:`, error);
            }
          }
          break;

        case 'changeType':
          for (const shift of selectedShifts) {
            try {
              await shiftsAPI.updateShift(shift._id, { 
                shiftType 
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Failed to update shift ${shift._id}:`, error);
            }
          }
          break;

        case 'changeStatus':
          for (const shift of selectedShifts) {
            try {
              await shiftsAPI.updateShift(shift._id, { 
                status 
              });
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Failed to update shift ${shift._id}:`, error);
            }
          }
          break;

        case 'delete':
          if (!window.confirm(`Are you sure you want to delete ${selectedShifts.length} shifts?`)) {
            setIsProcessing(false);
            return;
          }

          for (const shift of selectedShifts) {
            try {
              await shiftsAPI.deleteShift(shift._id);
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Failed to delete shift ${shift._id}:`, error);
            }
          }
          break;

        case 'duplicate':
          for (const shift of selectedShifts) {
            try {
              const newShiftData = {
                employee: shift.employee?._id,
                date: shift.date,
                shiftType: shift.shiftType,
                scheduledTimes: shift.scheduledTimes,
                department: shift.department,
                position: shift.position,
                notes: `${shift.notes || ''} (Duplicated)`
              };
              await shiftsAPI.createShift(newShiftData);
              successCount++;
            } catch (error) {
              errorCount++;
              console.error(`Failed to duplicate shift ${shift._id}:`, error);
            }
          }
          break;
      }

      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} shift${successCount > 1 ? 's' : ''}`);
        onOperationComplete();
        onClose();
      }

      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} shift${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      handleApiError(error, 'Bulk operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Shift Operations"
      description={`Perform operations on ${selectedShifts.length} selected shift${selectedShifts.length > 1 ? 's' : ''}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Selected Shifts Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Shifts Summary</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>{selectedShifts.length} shifts selected</p>
            <p>{selectedShifts.filter(s => s.employee).length} assigned, {selectedShifts.filter(s => !s.employee).length} unassigned</p>
            <p>Date range: {format(new Date(Math.min(...selectedShifts.map(s => new Date(s.date).getTime()))), 'MMM d')} - {format(new Date(Math.max(...selectedShifts.map(s => new Date(s.date).getTime()))), 'MMM d, yyyy')}</p>
          </div>
        </div>

        {/* Operation Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Operation
          </label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as BulkOperation)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="assign">Assign to Employee</option>
            <option value="reassign">Reassign to Different Employee</option>
            <option value="changeType">Change Shift Type</option>
            <option value="changeStatus">Change Status</option>
            <option value="duplicate">Duplicate Shifts</option>
            <option value="delete">Delete Shifts</option>
          </select>
        </div>

        {/* Operation-specific inputs */}
        {(operation === 'assign' || operation === 'reassign') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            >
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.role}
                </option>
              ))}
            </select>
          </div>
        )}

        {operation === 'changeType' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Shift Type
            </label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value as ShiftType)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        )}

        {operation === 'changeStatus' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ShiftStatus)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {/* Warning for delete operation */}
        {operation === 'delete' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. All selected shifts will be permanently deleted.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkOperation}
            disabled={isProcessing}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Apply to Selected'}
          </button>
        </div>
      </div>
    </AccessibleModal>
  );
};

export default BulkShiftOperationsModal;