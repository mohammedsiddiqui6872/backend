import { menuAPI } from './api';

export const getCategories = async (token: string): Promise<Array<{ slug: string; name: string }>> => {
  try {
    const response = await menuAPI.getCategories();
    const categories = response.data.data || [];
    
    // Map to the format expected by the component
    return categories.map((cat: any) => ({
      slug: cat.slug,
      name: cat.name
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};