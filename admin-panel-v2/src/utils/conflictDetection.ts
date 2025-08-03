import { Shift } from '../types/shift';
import { format, parseISO } from 'date-fns';

export interface ShiftConflict {
  type: 'double-booking' | 'overtime' | 'insufficient-rest' | 'max-hours-exceeded';
  severity: 'warning' | 'error';
  message: string;
  affectedShifts: string[];
  employeeId?: string;
  employeeName?: string;
}

/**
 * Check if two time ranges overlap
 */
const timeRangesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const s1 = new Date(`2000-01-01T${start1}`);
  let e1 = new Date(`2000-01-01T${end1}`);
  const s2 = new Date(`2000-01-01T${start2}`);
  let e2 = new Date(`2000-01-01T${end2}`);
  
  // Handle overnight shifts
  if (e1 < s1) e1 = new Date(`2000-01-02T${end1}`);
  if (e2 < s2) e2 = new Date(`2000-01-02T${end2}`);
  
  return s1 < e2 && s2 < e1;
};

/**
 * Calculate hours between two times
 */
const calculateHours = (start: string, end: string): number => {
  const s = new Date(`2000-01-01T${start}`);
  let e = new Date(`2000-01-01T${end}`);
  
  // Handle overnight shift
  if (e < s) {
    e = new Date(`2000-01-02T${end}`);
  }
  
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
};

/**
 * Detect conflicts for a single shift
 */
export const detectShiftConflicts = (
  shift: Shift,
  allShifts: Shift[],
  maxDailyHours: number = 10,
  maxWeeklyHours: number = 48,
  minRestHours: number = 8
): ShiftConflict[] => {
  const conflicts: ShiftConflict[] = [];
  
  if (!shift.employee) return conflicts;
  
  const shiftDate = format(new Date(shift.date), 'yyyy-MM-dd');
  const employeeId = shift.employee._id;
  const employeeName = shift.employee.name;
  
  // 1. Check for double booking
  const sameDayShifts = allShifts.filter(s => 
    s._id !== shift._id &&
    s.employee?._id === employeeId &&
    format(new Date(s.date), 'yyyy-MM-dd') === shiftDate &&
    s.status !== 'cancelled'
  );
  
  for (const otherShift of sameDayShifts) {
    if (timeRangesOverlap(
      shift.scheduledTimes.start,
      shift.scheduledTimes.end,
      otherShift.scheduledTimes.start,
      otherShift.scheduledTimes.end
    )) {
      conflicts.push({
        type: 'double-booking',
        severity: 'error',
        message: `${employeeName} is already scheduled from ${otherShift.scheduledTimes.start} to ${otherShift.scheduledTimes.end}`,
        affectedShifts: [shift._id, otherShift._id],
        employeeId,
        employeeName
      });
    }
  }
  
  // 2. Check for overtime (daily)
  const dailyHours = sameDayShifts.reduce((total, s) => {
    return total + calculateHours(s.scheduledTimes.start, s.scheduledTimes.end);
  }, calculateHours(shift.scheduledTimes.start, shift.scheduledTimes.end));
  
  if (dailyHours > maxDailyHours) {
    conflicts.push({
      type: 'overtime',
      severity: 'warning',
      message: `${employeeName} will work ${dailyHours.toFixed(1)} hours on ${format(new Date(shift.date), 'MMM d')}, exceeding the ${maxDailyHours} hour daily limit`,
      affectedShifts: [shift._id, ...sameDayShifts.map(s => s._id)],
      employeeId,
      employeeName
    });
  }
  
  // 3. Check for insufficient rest between shifts
  const previousDayShifts = allShifts.filter(s => {
    const prevDate = new Date(shift.date);
    prevDate.setDate(prevDate.getDate() - 1);
    return s.employee?._id === employeeId &&
      format(new Date(s.date), 'yyyy-MM-dd') === format(prevDate, 'yyyy-MM-dd') &&
      s.status !== 'cancelled';
  });
  
  for (const prevShift of previousDayShifts) {
    const prevEndTime = new Date(`${format(new Date(prevShift.date), 'yyyy-MM-dd')}T${prevShift.scheduledTimes.end}`);
    const currentStartTime = new Date(`${shiftDate}T${shift.scheduledTimes.start}`);
    
    // Handle overnight shifts
    if (prevShift.scheduledTimes.end < prevShift.scheduledTimes.start) {
      prevEndTime.setDate(prevEndTime.getDate() + 1);
    }
    
    const restHours = (currentStartTime.getTime() - prevEndTime.getTime()) / (1000 * 60 * 60);
    
    if (restHours < minRestHours && restHours >= 0) {
      conflicts.push({
        type: 'insufficient-rest',
        severity: 'warning',
        message: `${employeeName} will have only ${restHours.toFixed(1)} hours of rest between shifts (minimum ${minRestHours} hours recommended)`,
        affectedShifts: [prevShift._id, shift._id],
        employeeId,
        employeeName
      });
    }
  }
  
  // 4. Check weekly hours
  const weekStart = new Date(shift.date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const weeklyShifts = allShifts.filter(s => {
    const sDate = new Date(s.date);
    return s.employee?._id === employeeId &&
      sDate >= weekStart &&
      sDate <= weekEnd &&
      s.status !== 'cancelled' &&
      (s._id === shift._id || s._id !== shift._id);
  });
  
  const weeklyHours = weeklyShifts.reduce((total, s) => {
    return total + calculateHours(s.scheduledTimes.start, s.scheduledTimes.end);
  }, 0);
  
  if (weeklyHours > maxWeeklyHours) {
    conflicts.push({
      type: 'max-hours-exceeded',
      severity: 'warning',
      message: `${employeeName} will work ${weeklyHours.toFixed(1)} hours this week, exceeding the ${maxWeeklyHours} hour weekly limit`,
      affectedShifts: weeklyShifts.map(s => s._id),
      employeeId,
      employeeName
    });
  }
  
  return conflicts;
};

/**
 * Detect all conflicts in a set of shifts
 */
export const detectAllConflicts = (
  shifts: Shift[],
  maxDailyHours: number = 10,
  maxWeeklyHours: number = 48,
  minRestHours: number = 8
): ShiftConflict[] => {
  const allConflicts: ShiftConflict[] = [];
  const processedPairs = new Set<string>();
  
  for (const shift of shifts) {
    if (!shift.employee || shift.status === 'cancelled') continue;
    
    const conflicts = detectShiftConflicts(
      shift,
      shifts,
      maxDailyHours,
      maxWeeklyHours,
      minRestHours
    );
    
    // Filter out duplicate conflicts
    for (const conflict of conflicts) {
      const conflictKey = conflict.affectedShifts.sort().join('-');
      if (!processedPairs.has(conflictKey)) {
        processedPairs.add(conflictKey);
        allConflicts.push(conflict);
      }
    }
  }
  
  return allConflicts;
};