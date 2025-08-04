import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuAPI, categoryAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Fetch menu items
export const useMenuItems = (params?: any) => {
  return useQuery({
    queryKey: ['menu', 'items', params],
    queryFn: () => menuAPI.getItems(params),
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: () => categoryAPI.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

// Create menu item
export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: menuAPI.addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item created successfully');
    },
  });
};

// Update menu item
export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      menuAPI.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item updated successfully');
    },
  });
};

// Delete menu item
export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: menuAPI.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item deleted successfully');
    },
  });
};

// Toggle menu item availability
export const useToggleMenuAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => 
      menuAPI.updateItem(id, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
};

// Create category
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: categoryAPI.addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      toast.success('Category created successfully');
    },
  });
};

// Update category
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      categoryAPI.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      toast.success('Category updated successfully');
    },
  });
};

// Delete category
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: categoryAPI.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Category deleted successfully');
    },
  });
};