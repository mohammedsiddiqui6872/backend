import { useEffect, useState, useCallback } from 'react';
import { useSocketConnectionWithStatus } from './useSocketConnection';
import { shiftsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface ShiftNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  timestamp: Date;
}

export const useShiftNotifications = (userId?: string) => {
  const { socket, connected } = useSocketConnectionWithStatus('/admin');
  const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !connected) return;

    const handleShiftNotification = (notification: ShiftNotification) => {
      // Add to local notifications
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification based on priority
      const toastOptions: any = {
        duration: notification.priority === 'urgent' ? 8000 : 5000,
      };

      switch (notification.priority) {
        case 'urgent':
          toast.error(notification.message, {
            ...toastOptions,
            icon: '🚨',
          });
          break;
        case 'high':
          toast(notification.message, {
            ...toastOptions,
            icon: '⚠️',
          });
          break;
        default:
          toast(notification.message, {
            ...toastOptions,
            icon: '🔔',
          });
      }

      // Play notification sound for urgent notifications
      if (notification.priority === 'urgent' && 'Audio' in window) {
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.5;
          audio.play().catch(console.error);
        } catch (error) {
          console.error('Failed to play notification sound:', error);
        }
      }

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/logo192.png',
            tag: notification.id,
            requireInteraction: notification.priority === 'urgent',
          });

          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
          };
        } catch (error) {
          console.error('Failed to show browser notification:', error);
        }
      }
    };

    const handleUrgentShiftNotification = (data: any) => {
      // Handle urgent notifications from managers
      toast.error(`URGENT: ${data.notification.message}`, {
        duration: 10000,
        icon: '🚨',
      });
    };

    // Subscribe to notifications
    socket.on('shift-notification', handleShiftNotification);
    socket.on('urgent-shift-notification', handleUrgentShiftNotification);

    // Subscribe to shift updates if userId provided
    if (userId) {
      socket.emit('subscribe-shift-updates', userId);
    }

    return () => {
      socket.off('shift-notification', handleShiftNotification);
      socket.off('urgent-shift-notification', handleUrgentShiftNotification);
    };
  }, [socket, connected, userId]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await shiftsAPI.getNotifications({ limit: 50 });
      const unreadNotifications = response.data.data.filter(
        (n: any) => n.status !== 'read'
      );
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await shiftsAPI.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Acknowledge via socket
      if (socket && connected) {
        socket.emit('acknowledge-notification', notificationId);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [socket, connected]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    refetch: fetchNotifications,
  };
};