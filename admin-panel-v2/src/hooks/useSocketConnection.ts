import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import storageManager from '../utils/storageManager';

export const useSocketConnection = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

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
    
    const newSocket = io(socketUrl, {
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
      // Join tenant-specific room
      newSocket.emit('join-tenant', { subdomain });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
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

  return socket;
};