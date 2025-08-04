import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  
  // Real-time data
  activeOrders: any[];
  tableStatuses: Map<string, string>;
  onlineStaff: Set<string>;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      socket: null,
      isConnected: false,
      connectionError: null,
      activeOrders: [],
      tableStatuses: new Map(),
      onlineStaff: new Set(),

      connect: () => {
        const state = get();
        if (state.socket?.connected) return;

        const token = useAuthStore.getState().token;
        const tenant = useAuthStore.getState().tenant;

        if (!token || !tenant) {
          set({ connectionError: 'No authentication token or tenant' });
          return;
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        
        const socket = io(socketUrl, {
          auth: { token },
          query: { 
            tenantId: tenant.tenantId,
            subdomain: tenant.subdomain 
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Connection event handlers
        socket.on('connect', () => {
          console.log('Socket connected');
          set({ isConnected: true, connectionError: null });
          
          // Join tenant room
          socket.emit('join-tenant', tenant.tenantId);
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          set({ isConnected: false });
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          set({ connectionError: error.message });
        });

        // Real-time event handlers
        socket.on('order-created', (order) => {
          set((state) => ({
            activeOrders: [...state.activeOrders, order],
          }));
        });

        socket.on('order-updated', (updatedOrder) => {
          set((state) => ({
            activeOrders: state.activeOrders.map((order) =>
              order._id === updatedOrder._id ? updatedOrder : order
            ),
          }));
        });

        socket.on('table-status-changed', ({ tableNumber, status }) => {
          set((state) => {
            const newStatuses = new Map(state.tableStatuses);
            newStatuses.set(tableNumber, status);
            return { tableStatuses: newStatuses };
          });
        });

        socket.on('staff-online', (staffId) => {
          set((state) => {
            const newOnlineStaff = new Set(state.onlineStaff);
            newOnlineStaff.add(staffId);
            return { onlineStaff: newOnlineStaff };
          });
        });

        socket.on('staff-offline', (staffId) => {
          set((state) => {
            const newOnlineStaff = new Set(state.onlineStaff);
            newOnlineStaff.delete(staffId);
            return { onlineStaff: newOnlineStaff };
          });
        });

        set({ socket });
      },

      disconnect: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({ 
            socket: null, 
            isConnected: false,
            activeOrders: [],
            tableStatuses: new Map(),
            onlineStaff: new Set(),
          });
        }
      },

      emit: (event, data) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
          socket.emit(event, data);
        } else {
          console.warn('Socket not connected, cannot emit event:', event);
        }
      },

      on: (event, handler) => {
        const { socket } = get();
        if (socket) {
          socket.on(event, handler);
        }
      },

      off: (event, handler) => {
        const { socket } = get();
        if (socket) {
          if (handler) {
            socket.off(event, handler);
          } else {
            socket.off(event);
          }
        }
      },
    })
  )
);