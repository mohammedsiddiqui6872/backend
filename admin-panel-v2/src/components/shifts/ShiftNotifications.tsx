import React, { useState, useEffect } from 'react';
import { 
  Bell, BellOff, Clock, AlertCircle, UserPlus, Calendar, 
  CheckCircle, XCircle, RefreshCw, Settings, X 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { shiftsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ShiftNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  scheduledFor: string;
  readAt?: string;
  shift?: {
    _id: string;
    date: string;
    shiftType: string;
    scheduledTimes: {
      start: string;
      end: string;
    };
  };
  data?: {
    shiftDate?: string;
    shiftStart?: string;
    shiftEnd?: string;
    department?: string;
    position?: string;
    otherEmployee?: {
      _id: string;
      name: string;
      email: string;
    };
  };
}

interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  reminderTimes: number[];
}

interface ShiftNotificationsProps {
  onClose?: () => void;
}

const ShiftNotifications: React.FC<ShiftNotificationsProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('unread');
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
    inApp: true,
    reminderTimes: [60, 30, 15]
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      let params: any = {};
      if (filter === 'unread') {
        params.status = 'delivered';
      } else if (filter === 'urgent') {
        params.priority = 'urgent';
      }

      const response = await shiftsAPI.getNotifications(params);
      setNotifications(response.data.data);
      
      // Count unread
      const unread = response.data.data.filter(
        (n: ShiftNotification) => n.status !== 'read'
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await shiftsAPI.getNotificationPreferences();
      setPreferences(response.data.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await shiftsAPI.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, status: 'read', readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await shiftsAPI.updateNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
      toast.success('Notification preferences updated');
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shift-reminder':
      case 'shift-start':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'no-show-warning':
      case 'no-show-alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'swap-request':
      case 'swap-approved':
      case 'swap-rejected':
        return <RefreshCw className="h-5 w-5 text-purple-500" />;
      case 'shift-assigned':
      case 'shift-updated':
        return <Calendar className="h-5 w-5 text-green-500" />;
      case 'overtime-warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Shift Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Notification settings"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Push Notifications</label>
              <input
                type="checkbox"
                checked={preferences.push}
                onChange={(e) => setPreferences({ ...preferences, push: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Email Notifications</label>
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">SMS Notifications</label>
              <input
                type="checkbox"
                checked={preferences.sms}
                onChange={(e) => setPreferences({ ...preferences, sms: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">In-App Notifications</label>
              <input
                type="checkbox"
                checked={preferences.inApp}
                onChange={(e) => setPreferences({ ...preferences, inApp: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="text-sm text-gray-700 block mb-2">Reminder Times (minutes before shift)</label>
              <div className="flex space-x-2">
                {[15, 30, 60, 120].map(minutes => (
                  <button
                    key={minutes}
                    onClick={() => {
                      const newTimes = preferences.reminderTimes.includes(minutes)
                        ? preferences.reminderTimes.filter(t => t !== minutes)
                        : [...preferences.reminderTimes, minutes].sort((a, b) => b - a);
                      setPreferences({ ...preferences, reminderTimes: newTimes });
                    }}
                    className={`px-3 py-1 text-sm rounded-md ${
                      preferences.reminderTimes.includes(minutes)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => updatePreferences(preferences)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            filter === 'all'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            filter === 'unread'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setFilter('urgent')}
          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
            filter === 'urgent'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Urgent
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <BellOff className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  notification.status !== 'read' ? 'bg-blue-50' : ''
                }`}
                onClick={() => notification.status !== 'read' && markAsRead(notification._id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.shift && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>
                              {format(new Date(notification.shift.date), 'MMM d, yyyy')} • 
                              {notification.data?.shiftStart} - {notification.data?.shiftEnd}
                            </p>
                            {notification.data?.department && (
                              <p>{notification.data.department} - {notification.data.position}</p>
                            )}
                          </div>
                        )}
                        {notification.data?.otherEmployee && (
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <UserPlus className="h-3 w-3 mr-1" />
                            {notification.data.otherEmployee.name}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getPriorityColor(notification.priority)
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      {notification.readAt && (
                        <>
                          <CheckCircle className="h-3 w-3 ml-3 mr-1 text-green-500" />
                          Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftNotifications;