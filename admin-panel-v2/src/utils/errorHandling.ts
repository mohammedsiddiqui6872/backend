import toast from 'react-hot-toast';

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

/**
 * Extract error message from various error formats
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  const apiError = error as ApiError;
  
  if (apiError.response?.data?.message) {
    return apiError.response.data.message;
  }
  
  if (apiError.response?.data?.error) {
    return apiError.response.data.error;
  }
  
  if (apiError.message) {
    return apiError.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Handle API errors consistently
 */
export const handleApiError = (error: unknown, defaultMessage: string = 'Operation failed'): void => {
  const message = getErrorMessage(error);
  const apiError = error as ApiError;
  
  // Check for specific error codes
  if (apiError.response?.status === 401) {
    toast.error('Session expired. Please login again.');
    // Optionally redirect to login
    return;
  }
  
  if (apiError.response?.status === 403) {
    toast.error('You do not have permission to perform this action.');
    return;
  }
  
  if (apiError.response?.status === 404) {
    toast.error('The requested resource was not found.');
    return;
  }
  
  if (apiError.response?.status === 409) {
    toast.error(message || 'Conflict: This operation conflicts with existing data.');
    return;
  }
  
  if (apiError.response?.status === 422) {
    toast.error(message || 'Validation error: Please check your input.');
    return;
  }
  
  if (apiError.response?.status === 500) {
    toast.error('Server error: Please try again later or contact support.');
    return;
  }
  
  // Default error handling
  toast.error(message || defaultMessage);
};

/**
 * Retry failed operations with exponential backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      const apiError = error as ApiError;
      if (apiError.response?.status && apiError.response.status >= 400 && apiError.response.status < 500) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Validate shift operation permissions
 */
export const validateShiftOperation = (shift: any, operation: string): { valid: boolean; error?: string } => {
  switch (operation) {
    case 'edit':
      if (shift.status === 'completed' || shift.status === 'in-progress') {
        return { valid: false, error: 'Cannot edit a shift that is in progress or completed' };
      }
      break;
      
    case 'delete':
      if (shift.status === 'completed') {
        return { valid: false, error: 'Cannot delete a completed shift' };
      }
      if (shift.status === 'in-progress') {
        return { valid: false, error: 'Cannot delete a shift that is in progress' };
      }
      break;
      
    case 'clockIn':
      if (shift.status !== 'scheduled') {
        return { valid: false, error: 'Can only clock in to scheduled shifts' };
      }
      if (shift.actualTimes?.clockIn) {
        return { valid: false, error: 'Already clocked in to this shift' };
      }
      break;
      
    case 'clockOut':
      if (!shift.actualTimes?.clockIn) {
        return { valid: false, error: 'Must clock in before clocking out' };
      }
      if (shift.actualTimes?.clockOut) {
        return { valid: false, error: 'Already clocked out of this shift' };
      }
      break;
  }
  
  return { valid: true };
};