import { MenuItem } from './menu';
import { ModifierGroup } from './modifiers';
import { MenuChannel } from './channel';

export interface TimeSlot {
  _id?: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday to Saturday)
  menuItems: (string | MenuItem)[];
  categories: string[];
  modifierGroups: (string | ModifierGroup)[];
}

export interface DateSlot {
  _id?: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  menuItems: (string | MenuItem)[];
  categories: string[];
  modifierGroups: (string | ModifierGroup)[];
}

export interface ScheduleSettings {
  autoSwitch: boolean;
  showUpcomingItems: boolean;
  upcomingItemsMinutes: number;
  hideUnavailableItems: boolean;
}

export interface MenuSchedule {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  scheduleType: 'time-based' | 'date-based' | 'recurring';
  timeSlots: TimeSlot[];
  dateSlots: DateSlot[];
  priority: number;
  applicableChannels: (string | MenuChannel)[];
  settings: ScheduleSettings;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ScheduleInput {
  name: string;
  description?: string;
  isActive: boolean;
  scheduleType: 'time-based' | 'date-based' | 'recurring';
  timeSlots: Omit<TimeSlot, '_id'>[];
  dateSlots: Omit<DateSlot, '_id'>[];
  priority: number;
  applicableChannels: string[];
  settings: ScheduleSettings;
}

export interface ActiveMenuData {
  activeSlots: Array<{
    schedule: {
      _id: string;
      name: string;
      priority: number;
    };
    slot: TimeSlot | DateSlot;
    type: 'current';
  }>;
  upcomingSlots: Array<{
    schedule: {
      _id: string;
      name: string;
      priority: number;
    };
    slot: TimeSlot | DateSlot;
    type: 'upcoming';
  }>;
  availableItems: string[];
  availableCategories: string[];
  availableModifierGroups: string[];
}

export interface ItemAvailability {
  itemId: string;
  isAvailable: boolean;
  availableIn?: {
    slot: string;
    startTime: string;
  };
  reason: string;
}