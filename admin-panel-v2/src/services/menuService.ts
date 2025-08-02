import { menuSchedulesAPI } from './api';
import { MenuSchedule, ScheduleInput } from '../types/schedule';

export const getMenuSchedules = async (token: string): Promise<MenuSchedule[]> => {
  try {
    const response = await menuSchedulesAPI.getSchedules();
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching menu schedules:', error);
    throw error;
  }
};

export const getMenuSchedule = async (id: string, token: string): Promise<MenuSchedule> => {
  try {
    const response = await menuSchedulesAPI.getSchedule(id);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching menu schedule:', error);
    throw error;
  }
};

export const createMenuSchedule = async (scheduleData: ScheduleInput, token: string): Promise<MenuSchedule> => {
  try {
    const response = await menuSchedulesAPI.createSchedule(scheduleData);
    return response.data.data;
  } catch (error) {
    console.error('Error creating menu schedule:', error);
    throw error;
  }
};

export const updateMenuSchedule = async (id: string, scheduleData: ScheduleInput, token: string): Promise<MenuSchedule> => {
  try {
    const response = await menuSchedulesAPI.updateSchedule(id, scheduleData);
    return response.data.data;
  } catch (error) {
    console.error('Error updating menu schedule:', error);
    throw error;
  }
};

export const deleteMenuSchedule = async (id: string, token: string): Promise<void> => {
  try {
    await menuSchedulesAPI.deleteSchedule(id);
  } catch (error) {
    console.error('Error deleting menu schedule:', error);
    throw error;
  }
};

export const initializeDefaultSchedules = async (token: string): Promise<MenuSchedule[]> => {
  try {
    const response = await menuSchedulesAPI.initializeDefaults();
    return response.data.data || [];
  } catch (error) {
    console.error('Error initializing default schedules:', error);
    throw error;
  }
};

export const getActiveMenu = async (channelId: string | undefined, token: string) => {
  try {
    const response = await menuSchedulesAPI.getActiveMenu(channelId);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching active menu:', error);
    throw error;
  }
};

export const checkItemAvailability = async (itemId: string, channelId: string | undefined, token: string) => {
  try {
    const response = await menuSchedulesAPI.checkItemAvailability(itemId, channelId);
    return response.data.data;
  } catch (error) {
    console.error('Error checking item availability:', error);
    throw error;
  }
};