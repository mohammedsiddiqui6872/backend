import { useState, useCallback } from 'react';
import { shiftsAPI } from '../services/api';
import { ShiftFormData, ShiftUpdateData } from '../types/shift';
import { handleApiError, validateShiftOperation } from '../utils/errorHandling';
import toast from 'react-hot-toast';

interface UseShiftOperationsResult {
  loading: boolean;
  error: string | null;
  createShift: (data: ShiftFormData) => Promise<boolean>;
  updateShift: (shiftId: string, data: ShiftUpdateData) => Promise<boolean>;
  deleteShift: (shiftId: string) => Promise<boolean>;
  clockIn: (shiftId: string) => Promise<boolean>;
  clockOut: (shiftId: string) => Promise<boolean>;
  startBreak: (shiftId: string, type: 'short' | 'meal') => Promise<boolean>;
  endBreak: (shiftId: string) => Promise<boolean>;
  requestSwap: (shiftId: string, data: any) => Promise<boolean>;
}

export const useShiftOperations = (): UseShiftOperationsResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeOperation = useCallback(async (
    operation: () => Promise<any>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await operation();
      if (successMessage) {
        toast.success(successMessage);
      }
      return true;
    } catch (err) {
      const message = errorMessage || 'Operation failed';
      handleApiError(err, message);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createShift = useCallback(async (data: ShiftFormData): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.createShift(data),
      'Shift created successfully',
      'Failed to create shift'
    );
  }, [executeOperation]);

  const updateShift = useCallback(async (shiftId: string, data: ShiftUpdateData): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.updateShift(shiftId, data),
      'Shift updated successfully',
      'Failed to update shift'
    );
  }, [executeOperation]);

  const deleteShift = useCallback(async (shiftId: string): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.deleteShift(shiftId),
      'Shift cancelled successfully',
      'Failed to cancel shift'
    );
  }, [executeOperation]);

  const clockIn = useCallback(async (shiftId: string): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.clockIn(shiftId),
      'Clocked in successfully',
      'Failed to clock in'
    );
  }, [executeOperation]);

  const clockOut = useCallback(async (shiftId: string): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.clockOut(shiftId),
      'Clocked out successfully',
      'Failed to clock out'
    );
  }, [executeOperation]);

  const startBreak = useCallback(async (shiftId: string, type: 'short' | 'meal'): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.startBreak(shiftId, type),
      `${type === 'short' ? 'Short' : 'Meal'} break started`,
      'Failed to start break'
    );
  }, [executeOperation]);

  const endBreak = useCallback(async (shiftId: string): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.endBreak(shiftId),
      'Break ended',
      'Failed to end break'
    );
  }, [executeOperation]);

  const requestSwap = useCallback(async (shiftId: string, data: any): Promise<boolean> => {
    return executeOperation(
      () => shiftsAPI.requestSwap(shiftId, data),
      'Swap request submitted successfully',
      'Failed to submit swap request'
    );
  }, [executeOperation]);

  return {
    loading,
    error,
    createShift,
    updateShift,
    deleteShift,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    requestSwap
  };
};