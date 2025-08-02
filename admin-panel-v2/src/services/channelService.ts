import { channelsAPI } from './api';
import { MenuChannel } from '../types/channel';

export const getChannels = async (token: string): Promise<MenuChannel[]> => {
  try {
    const response = await channelsAPI.getChannels();
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
};