import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) {
          return false; // Don't retry on auth errors
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      onError: (error: any) => {
        const message = error?.response?.data?.error || error?.message || 'An error occurred';
        toast.error(message);
      },
    },
  },
});

// Invalidation helpers
export const invalidateQueries = {
  team: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  menu: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  orders: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  tables: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  analytics: () => queryClient.invalidateQueries({ queryKey: ['analytics'] }),
  shifts: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  roles: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  compliance: () => queryClient.invalidateQueries({ queryKey: ['compliance'] }),
  all: () => queryClient.invalidateQueries(),
};