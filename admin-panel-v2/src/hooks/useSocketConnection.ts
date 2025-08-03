import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import storageManager from '../utils/storageManager';

// For backward compatibility, the default export returns just the socket
export const useSocketConnection = (namespace?: string) => {
  const { socket } = useSocketConnectionWithStatus(namespace);
  return socket;
};

// New export that returns both socket and connection status
export const useSocketConnectionWithStatus = (namespace?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get subdomain and token for authentication
    const subdomain = storageManager.getItem('subdomain');
    const token = storageManager.getItem('adminToken');
    
    if (!subdomain || !token) {
      console.error('Missing subdomain or token for socket connection');
      return;
    }

    // Connect to backend socket server
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = baseUrl.replace('/api', '');
    const socketPath = namespace ? `${socketUrl}${namespace}` : socketUrl;
    
    const newSocket = io(socketPath, {
      auth: {
        token,
        subdomain
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      // Join tenant-specific room
      newSocket.emit('join-tenant', { subdomain });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, connected };
};