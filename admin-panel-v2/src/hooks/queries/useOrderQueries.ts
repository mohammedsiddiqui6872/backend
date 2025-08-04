import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Fetch orders with real-time updates
export const useOrders = (params?: any) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersAPI.getOrders(params),
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
};

// Fetch single order
export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersAPI.getOrderDetails(id),
    enabled: !!id,
    refetchInterval: 5000, // More frequent updates for single order
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      ordersAPI.updateOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Order status updated');
    },
  });
};

// Fetch order statistics
export const useOrderStatistics = (timeRange?: string) => {
  return useQuery({
    queryKey: ['orders', 'statistics', timeRange],
    queryFn: () => analyticsAPI.getDashboardStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Export orders
export const useExportOrders = () => {
  return useMutation({
    mutationFn: async () => {
      // Export not implemented yet
      throw new Error('Export functionality not implemented');
    },
    onSuccess: () => {
      toast.success('Orders exported successfully');
    },
  });
};

// Cancel order
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      ordersAPI.cancelOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Order cancelled successfully');
    },
  });
};