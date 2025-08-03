/**
 * Accessibility utilities for the Shifts module
 */

import React from 'react';

/**
 * Generate ARIA label for shift cards
 */
export const getShiftAriaLabel = (shift: any): string => {
  const employee = shift.employee?.name || 'Unassigned';
  const date = new Date(shift.date).toLocaleDateString();
  const startTime = shift.scheduledTimes.start;
  const endTime = shift.scheduledTimes.end;
  const status = shift.status.replace('-', ' ');
  
  return `${shift.shiftType} shift for ${employee} on ${date} from ${startTime} to ${endTime}. Status: ${status}`;
};

/**
 * Keyboard navigation keys
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
};

/**
 * Handle keyboard navigation for calendar grid
 */
export const handleCalendarKeyboard = (
  event: React.KeyboardEvent,
  currentIndex: number,
  totalDays: number,
  onNavigate: (index: number) => void
) => {
  const { key } = event;
  let newIndex = currentIndex;

  switch (key) {
    case KEYBOARD_KEYS.ARROW_LEFT:
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case KEYBOARD_KEYS.ARROW_RIGHT:
      newIndex = Math.min(totalDays - 1, currentIndex + 1);
      break;
    case KEYBOARD_KEYS.ARROW_UP:
      newIndex = Math.max(0, currentIndex - 7);
      break;
    case KEYBOARD_KEYS.ARROW_DOWN:
      newIndex = Math.min(totalDays - 1, currentIndex + 7);
      break;
    case KEYBOARD_KEYS.HOME:
      newIndex = 0;
      break;
    case KEYBOARD_KEYS.END:
      newIndex = totalDays - 1;
      break;
    default:
      return;
  }

  if (newIndex !== currentIndex) {
    event.preventDefault();
    onNavigate(newIndex);
  }
};

/**
 * Generate focus trap for modals
 */
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusableElement = focusableElements[0] as HTMLElement;
  const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== KEYBOARD_KEYS.TAB) return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);
  firstFocusableElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Screen reader announcements
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Color blind friendly color schemes
 */
export const COLORBLIND_SAFE_COLORS = {
  // Using colors that work for all types of color blindness
  morning: {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    colorblind: 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400'
  },
  afternoon: {
    default: 'bg-orange-100 text-orange-800 border-orange-200',
    colorblind: 'bg-orange-100 text-orange-900 border-orange-300 ring-2 ring-orange-400'
  },
  evening: {
    default: 'bg-purple-100 text-purple-800 border-purple-200',
    colorblind: 'bg-purple-100 text-purple-900 border-purple-300 ring-2 ring-purple-400'
  },
  night: {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    colorblind: 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400'
  },
  custom: {
    default: 'bg-green-100 text-green-800 border-green-200',
    colorblind: 'bg-green-100 text-green-900 border-green-300 ring-2 ring-green-400'
  }
};

/**
 * Get colorblind-safe shift color
 */
export const getAccessibleShiftColor = (shiftType: string, colorblindMode: boolean = false): string => {
  const colors = COLORBLIND_SAFE_COLORS[shiftType as keyof typeof COLORBLIND_SAFE_COLORS] || COLORBLIND_SAFE_COLORS.custom;
  return colorblindMode ? colors.colorblind : colors.default;
};

// Skip link component moved to separate file due to TSX requirements