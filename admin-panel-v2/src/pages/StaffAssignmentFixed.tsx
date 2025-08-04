import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import { 
  Calendar, Users, UserCheck, Clock, Activity, Settings, 
  BarChart3, RefreshCw, Filter, Plus 
} from 'lucide-react';
import toast from 'react-hot-toast';
import AssignmentGridView from '../components/staffAssignment/AssignmentGridView';
import AssignmentListView from '../components/staffAssignment/AssignmentListView';
import AssignmentScheduleView from '../components/staffAssignment/AssignmentScheduleView';
import AssignmentAnalytics from '../components/staffAssignment/AssignmentAnalytics';
import AssignmentHistory from '../components/staffAssignment/AssignmentHistory';
import AssignmentRules from '../components/staffAssignment/AssignmentRules';
import { useTimeout } from '../hooks/useTimeout';

type ViewType = 'grid' | 'list' | 'schedule' | 'analytics' | 'history' | 'rules';

export default function StaffAssignmentFixed() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldResetRefresh, setShouldResetRefresh] = useState(false);

  // Use custom hook for timeout cleanup
  useTimeout(() => {
    if (shouldResetRefresh) {
      setIsRefreshing(false);
      setShouldResetRefresh(false);
    }
  }, shouldResetRefresh ? 1000 : null);

  const canViewAssignments = hasPermission(user, 'assignments.view');
  const canManageAssignments = hasPermission(user, 'assignments.manage');

  const viewOptions = [
    { id: 'grid', label: 'Grid View', icon: Activity },
    { id: 'list', label: 'List View', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'rules', label: 'Rules', icon: Settings }
  ];

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      setShouldResetRefresh(false);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    try {
      // Trigger refresh in child components
      window.dispatchEvent(new CustomEvent('refresh-assignments'));
      toast.success('Assignments refreshed');
    } catch (error) {
      toast.error('Failed to refresh assignments');
    } finally {
      setShouldResetRefresh(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Assignment</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage staff assignments, schedules, and workload distribution
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {canManageAssignments && (
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                  <Plus className="mr-2 h-4 w-4" />
                  New Assignment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {viewOptions.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as ViewType)}
                  className={`
                    whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                    ${activeView === view.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-2" />
                    {view.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg">
          {activeView === 'grid' && <AssignmentGridView canManage={canManageAssignments} />}
          {activeView === 'list' && <AssignmentListView canManage={canManageAssignments} />}
          {activeView === 'schedule' && <AssignmentScheduleView canManage={canManageAssignments} />}
          {activeView === 'analytics' && <AssignmentAnalytics />}
          {activeView === 'history' && <AssignmentHistory />}
          {activeView === 'rules' && <AssignmentRules canManage={canManageAssignments} />}
        </div>
      </div>
    </div>
  );
}