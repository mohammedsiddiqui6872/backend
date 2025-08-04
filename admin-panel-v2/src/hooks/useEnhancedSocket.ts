import { useEffect, useRef } from 'react';
import enhancedSocketService from '../services/enhancedSocketService';

interface UseEnhancedSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useEnhancedSocket(options: UseEnhancedSocketOptions = {}) {
  useEffect(() => {
    // Socket is already a singleton, just ensure it's connected
    if (options.autoConnect !== false) {
      // You might need to call connect with tenant and token here
      // For now, assuming it's already connected elsewhere
    }

    // Don't disconnect on unmount as it's a shared instance
    return () => {
      // Optionally remove only this component's listeners
    };
  }, [options.autoConnect]);

  return enhancedSocketService;
}

// Helper hook for components that just need to listen to events
export function useSocketListener<T = any>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const socket = useEnhancedSocket();

  useEffect(() => {
    const unsubscribe = socket.on(event as any, handler);
    
    return () => {
      unsubscribe();
    };
  }, [event, ...deps]);

  return socket;
}

// Helper hook for assignment operations
export function useAssignmentSocket() {
  const socket = useEnhancedSocket();
  
  return {
    createAssignment: socket.createAssignment.bind(socket),
    endAssignment: socket.endAssignment.bind(socket),
    requestUpdate: socket.requestAssignmentUpdate.bind(socket),
    requestLoads: socket.requestWaiterLoads.bind(socket),
    isConnected: socket.isConnected.bind(socket),
    socket
  };
}