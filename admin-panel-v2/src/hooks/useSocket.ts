import { useEffect, useCallback } from 'react';
import { useSocketStore } from '../stores/useSocketStore';
import { useAuthStore } from '../stores/useAuthStore';

interface UseSocketOptions {
  autoConnect?: boolean;
  events?: Record<string, (data: any) => void>;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { autoConnect = true, events = {} } = options;
  const { 
    socket, 
    isConnected, 
    connectionError,
    connect, 
    disconnect, 
    emit, 
    on, 
    off 
  } = useSocketStore();
  
  const { isAuthenticated } = useAuthStore();

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected) {
      connect();
    }

    return () => {
      if (autoConnect && isConnected) {
        disconnect();
      }
    };
  }, [autoConnect, isAuthenticated, isConnected, connect, disconnect]);

  // Register event listeners
  useEffect(() => {
    if (!isConnected) return;

    const eventEntries = Object.entries(events);
    
    // Add all event listeners
    eventEntries.forEach(([event, handler]) => {
      on(event, handler);
    });

    // Cleanup
    return () => {
      eventEntries.forEach(([event, handler]) => {
        off(event, handler);
      });
    };
  }, [isConnected, events, on, off]);

  // Safe emit function
  const safeEmit = useCallback((event: string, data?: any) => {
    if (isConnected) {
      emit(event, data);
    } else {
      console.warn(`Cannot emit '${event}' - socket not connected`);
    }
  }, [isConnected, emit]);

  return {
    socket,
    isConnected,
    connectionError,
    emit: safeEmit,
    on,
    off,
    connect,
    disconnect,
  };
};

// Specialized hooks for specific features
export const useOrderSocket = () => {
  const { addNotification } = useAppStore();
  
  return useSocket({
    events: {
      'order-created': (order) => {
        addNotification({
          type: 'info',
          message: `New order #${order.orderNumber} from table ${order.tableNumber}`,
        });
      },
      'order-updated': (order) => {
        if (order.status === 'ready') {
          addNotification({
            type: 'success',
            message: `Order #${order.orderNumber} is ready for pickup`,
          });
        }
      },
    },
  });
};

export const useTableSocket = () => {
  return useSocket({
    events: {
      'table-status-changed': ({ tableNumber, status }) => {
        // Table status is handled in the store
        console.log(`Table ${tableNumber} status changed to ${status}`);
      },
    },
  });
};

export const useStaffSocket = () => {
  const { addNotification } = useAppStore();
  
  return useSocket({
    events: {
      'staff-clock-in': ({ staffName, time }) => {
        addNotification({
          type: 'info',
          message: `${staffName} clocked in at ${new Date(time).toLocaleTimeString()}`,
        });
      },
      'staff-clock-out': ({ staffName, time }) => {
        addNotification({
          type: 'info',
          message: `${staffName} clocked out at ${new Date(time).toLocaleTimeString()}`,
        });
      },
    },
  });
};

// Import useAppStore at the top of the file
import { useAppStore } from '../stores/useAppStore';