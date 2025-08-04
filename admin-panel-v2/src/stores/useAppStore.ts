import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Global Loading States
  globalLoading: boolean;
  loadingMessage: string;
  
  // Selected Items (for bulk actions)
  selectedItems: Map<string, Set<string>>;
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'ar') => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading Actions
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Selection Actions
  selectItem: (type: string, id: string) => void;
  deselectItem: (type: string, id: string) => void;
  selectAllItems: (type: string, ids: string[]) => void;
  clearSelection: (type: string) => void;
  getSelectedItems: (type: string) => string[];
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial State
      sidebarOpen: true,
      theme: 'light',
      language: 'en',
      notifications: [],
      unreadCount: 0,
      globalLoading: false,
      loadingMessage: '',
      selectedItems: new Map(),

      // UI Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      
      setLanguage: (language) => {
        set({ language });
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      },

      // Notification Actions
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date(),
          read: false,
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },
      
      markNotificationRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          const unreadCount = notifications.filter((n) => !n.read).length;
          return { notifications, unreadCount };
        });
      },
      
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

      // Loading Actions
      setGlobalLoading: (loading, message = '') => {
        set({ globalLoading: loading, loadingMessage: message });
      },

      // Selection Actions
      selectItem: (type, id) => {
        set((state) => {
          const newMap = new Map(state.selectedItems);
          const typeSet = newMap.get(type) || new Set();
          typeSet.add(id);
          newMap.set(type, typeSet);
          return { selectedItems: newMap };
        });
      },
      
      deselectItem: (type, id) => {
        set((state) => {
          const newMap = new Map(state.selectedItems);
          const typeSet = newMap.get(type);
          if (typeSet) {
            typeSet.delete(id);
            if (typeSet.size === 0) {
              newMap.delete(type);
            } else {
              newMap.set(type, typeSet);
            }
          }
          return { selectedItems: newMap };
        });
      },
      
      selectAllItems: (type, ids) => {
        set((state) => {
          const newMap = new Map(state.selectedItems);
          newMap.set(type, new Set(ids));
          return { selectedItems: newMap };
        });
      },
      
      clearSelection: (type) => {
        set((state) => {
          const newMap = new Map(state.selectedItems);
          newMap.delete(type);
          return { selectedItems: newMap };
        });
      },
      
      getSelectedItems: (type) => {
        const state = get();
        const typeSet = state.selectedItems.get(type);
        return typeSet ? Array.from(typeSet) : [];
      },
    })
  )
);