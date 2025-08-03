/**
 * Utility functions for shift management
 */

/**
 * Detects shift type based on start time
 */
export const detectShiftType = (startTime: string): 'morning' | 'afternoon' | 'evening' | 'night' | 'custom' => {
  const [hours] = startTime.split(':').map(Number);
  
  if (hours >= 4 && hours < 12) {
    return 'morning';
  } else if (hours >= 12 && hours < 16) {
    return 'afternoon';
  } else if (hours >= 16 && hours < 21) {
    return 'evening';
  } else if (hours >= 21 || hours < 4) {
    return 'night';
  }
  
  return 'custom';
};

/**
 * Calculates duration between two time strings, handling cross-midnight shifts
 */
export const calculateShiftDuration = (start: string, end: string): { hours: number; minutes: number; totalMinutes: number } => {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  let durationMinutes = endTotalMinutes - startTotalMinutes;
  
  // Handle cross-midnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  return { hours, minutes, totalMinutes: durationMinutes };
};

/**
 * Formats duration object to human-readable string
 */
export const formatDuration = (duration: { hours: number; minutes: number }): string => {
  if (duration.hours === 0 && duration.minutes === 0) {
    return '0m';
  }
  
  const parts = [];
  if (duration.hours > 0) {
    parts.push(`${duration.hours}h`);
  }
  if (duration.minutes > 0) {
    parts.push(`${duration.minutes}m`);
  }
  
  return parts.join(' ');
};

/**
 * Validates if a shift time range is valid
 */
export const validateShiftTimes = (start: string, end: string, shiftType: string): { valid: boolean; error?: string } => {
  if (!start || !end) {
    return { valid: false, error: 'Start and end times are required' };
  }
  
  const duration = calculateShiftDuration(start, end);
  
  // Minimum shift duration: 1 hour
  if (duration.totalMinutes < 60) {
    return { valid: false, error: 'Shift must be at least 1 hour long' };
  }
  
  // Maximum shift duration: 12 hours (unless it's a custom shift)
  if (shiftType !== 'custom' && duration.totalMinutes > 12 * 60) {
    return { valid: false, error: 'Shift cannot exceed 12 hours' };
  }
  
  // Maximum shift duration for any shift: 24 hours
  if (duration.totalMinutes >= 24 * 60) {
    return { valid: false, error: 'Shift cannot be 24 hours or longer' };
  }
  
  return { valid: true };
};

/**
 * Gets color classes for shift type
 */
export const getShiftTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
    evening: 'bg-purple-100 text-purple-800 border-purple-200',
    night: 'bg-gray-100 text-gray-800 border-gray-200',
    custom: 'bg-green-100 text-green-800 border-green-200'
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Gets default time range for shift type
 */
export const getShiftTypeDefaults = (type: string): { start: string; end: string } => {
  const defaults: Record<string, { start: string; end: string }> = {
    morning: { start: '06:00', end: '14:00' },
    afternoon: { start: '14:00', end: '22:00' },
    evening: { start: '16:00', end: '00:00' },
    night: { start: '22:00', end: '06:00' },
    custom: { start: '09:00', end: '17:00' }
  };
  
  return defaults[type] || defaults.custom;
};