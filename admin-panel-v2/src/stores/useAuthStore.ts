import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authAPI } from '../services/api';
import storageManager from '../utils/storageManager';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
}

interface Tenant {
  tenantId: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  subscription?: {
    plan: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        tenant: null,
        token: storageManager.getItem('adminToken'),
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authAPI.login(email, password);
            const { token, user, tenant } = response.data;
            
            storageManager.setItem('adminToken', token);
            storageManager.setItem('tenantId', tenant.tenantId);
            
            set({
              user,
              tenant,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              error: error.response?.data?.error || 'Login failed',
              isLoading: false,
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            await authAPI.logout();
          } catch (error) {
            console.error('Logout error:', error);
          }
          
          storageManager.removeItem('adminToken');
          storageManager.removeItem('tenantId');
          
          set({
            user: null,
            tenant: null,
            token: null,
            isAuthenticated: false,
          });
        },

        checkAuth: async () => {
          const token = get().token;
          if (!token) {
            set({ isAuthenticated: false });
            return;
          }

          set({ isLoading: true });
          
          try {
            const response = await authAPI.getProfile();
            const { user, tenant } = response.data;
            
            set({
              user,
              tenant,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            storageManager.removeItem('adminToken');
            set({
              user: null,
              tenant: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
        }),
      }
    )
  )
);