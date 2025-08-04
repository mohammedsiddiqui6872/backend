import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Grid3X3, 
  List, 
  Calendar, 
  BarChart3, 
  History,
  Settings,
  Bell,
  RefreshCw
} from 'lucide-react';
import { AssignmentViewMode } from '../types/staffAssignment';
import AssignmentGridView from '../components/staffAssignment/AssignmentGridView';
import AssignmentListView from '../components/staffAssignment/AssignmentListView';
import AssignmentScheduleView from '../components/staffAssignment/AssignmentScheduleView';
import AssignmentAnalytics from '../components/staffAssignment/AssignmentAnalytics';
import AssignmentHistory from '../components/staffAssignment/AssignmentHistory';
import AssignmentRules from '../components/staffAssignment/AssignmentRules';
import { useAuth } from '../hooks/useAuth';
import { checkPermission } from '../utils/permissions';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

const StaffAssignment: React.FC = () => {
  const [activeView, setActiveView] = useState<AssignmentViewMode>('grid');
  const [activeTab, setActiveTab] = useState<'assignments' | 'history' | 'rules' | 'analytics'>('assignments');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<number>(0);
  const { user } = useAuth();

  // Check permissions
  const canViewAssignments = checkPermission(user, 'tables', 'read');
  const canManageAssignments = checkPermission(user, 'tables', 'update');
  const canViewAnalytics = checkPermission(user, 'analytics', 'read');
  const canManageRules = checkPermission(user, 'settings', 'update');

  useEffect(() => {
    // Set up Socket.io connection
    const tenantId = localStorage.getItem('tenantId') || '';
    const token = localStorage.getItem('token') || '';
    
    if (tenantId && token) {
      socketService.connect(tenantId, token);
    }

    // Set up real-time notifications
    const unsubscribers = [
      socketService.on('assignment:created', () => {
        setNotifications(prev => prev + 1);
      }),
      socketService.on('assignment:ended', () => {
        setNotifications(prev => prev + 1);
      }),
      socketService.on('assignment:emergency-reassign', () => {
        setNotifications(prev => prev + 1);
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      socketService.disconnect();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger refresh in child components
      window.dispatchEvent(new CustomEvent('refresh-assignments'));
      toast.success('Assignments refreshed');
    } catch (error) {
      toast.error('Failed to refresh assignments');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  if (!canViewAssignments) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-500 mt-2">You don't have permission to view staff assignments.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'assignments', 
      label: 'Current Assignments', 
      icon: Users,
      badge: null,
      permission: 'read'
    },
    { 
      id: 'history', 
      label: 'Assignment History', 
      icon: History,
      badge: null,
      permission: 'read'
    },
    { 
      id: 'rules', 
      label: 'Assignment Rules', 
      icon: Settings,
      badge: null,
      permission: 'update'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3,
      badge: null,
      permission: 'read'
    }
  ];

  const viewModes = [
    { id: 'grid', label: 'Grid View', icon: Grid3X3 },
    { id: 'list', label: 'List View', icon: List },
    { id: 'schedule', label: 'Schedule View', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Assignment</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage waiter assignments to tables across all floors and sections
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button
                  className="relative p-2 text-gray-400 hover:text-gray-500"
                  onClick={() => setNotifications(0)}
                >
                  <Bell className="h-6 w-6" />
                  {notifications > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                  )}
                </button>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const canAccess = tab.permission === 'read' 
                ? canViewAssignments 
                : tab.permission === 'update' 
                  ? (tab.id === 'rules' ? canManageRules : canManageAssignments)
                  : true;

              if (!canAccess) return null;

              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    relative py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                    {tab.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-navigation for assignments tab */}
      {activeTab === 'assignments' && (
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                {viewModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setActiveView(mode.id as AssignmentViewMode)}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium
                        ${activeView === mode.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 mr-1.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'assignments' && (
          <>
            {activeView === 'grid' && <AssignmentGridView canManage={canManageAssignments} />}
            {activeView === 'list' && <AssignmentListView canManage={canManageAssignments} />}
            {activeView === 'schedule' && <AssignmentScheduleView canManage={canManageAssignments} />}
          </>
        )}
        {activeTab === 'history' && <AssignmentHistory />}
        {activeTab === 'rules' && <AssignmentRules canManage={canManageRules} />}
        {activeTab === 'analytics' && <AssignmentAnalytics />}
      </div>
    </div>
  );
};

export default StaffAssignment;