import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore - react-dnd types issue
import { DndProvider, useDrag, useDrop } from 'react-dnd';
// @ts-ignore - react-dnd types issue
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  User, 
  Users, 
  Clock, 
  AlertCircle, 
  Filter,
  Search,
  ChevronDown,
  Loader2,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { tableAPI } from '../../services/tableAPI';
import { userAPI } from '../../services/userAPI';
import { StaffAssignment, WaiterLoad, AssignmentFilters } from '../../types/staffAssignment';
import { Table } from '../../types/table';
import toast from 'react-hot-toast';
import socketService from '../../services/socketService';

interface AssignmentGridViewProps {
  canManage: boolean;
}

interface DragItem {
  type: 'waiter';
  waiterId: string;
  waiterName: string;
}

const WaiterCard: React.FC<{
  waiter: WaiterLoad;
  canManage: boolean;
}> = ({ waiter, canManage }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'waiter',
    item: { type: 'waiter', waiterId: waiter.waiterId, waiterName: waiter.waiterName },
    canDrag: canManage && waiter.isAvailable,
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={canManage ? drag : undefined}
      className={`
        bg-white rounded-lg shadow-sm border p-3 
        ${canManage && waiter.isAvailable ? 'cursor-move' : 'cursor-default'}
        ${isDragging ? 'opacity-50' : ''}
        ${!waiter.isAvailable ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="h-4 w-4 text-primary-600" />
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium text-gray-900">{waiter.waiterName}</p>
            <p className="text-xs text-gray-500">
              {waiter.currentTables} tables • {waiter.totalGuests} guests
            </p>
          </div>
        </div>
        {!waiter.isAvailable && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            Full
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Load: {Math.round((waiter.currentTables / waiter.maxCapacity) * 100)}%
      </div>
    </div>
  );
};

const TableCard: React.FC<{
  table: Table;
  assignment?: StaffAssignment;
  canManage: boolean;
  onAssign: (tableId: string, waiterId: string) => void;
  onUnassign: (tableId: string, waiterId: string) => void;
}> = ({ table, assignment, canManage, onAssign, onUnassign }) => {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: 'waiter',
    canDrop: () => canManage && table.status !== 'maintenance',
    drop: (item: any) => {
      if (assignment?.waiterId !== item.waiterId) {
        onAssign(table._id, item.waiterId);
      }
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const getStatusColor = () => {
    if (table.status === 'occupied') return 'border-red-300 bg-red-50';
    if (table.status === 'reserved') return 'border-orange-300 bg-orange-50';
    if (assignment) return 'border-green-300 bg-green-50';
    return 'border-gray-300 bg-white';
  };

  return (
    <div
      ref={canManage ? drop : undefined}
      className={`
        relative rounded-lg border-2 p-4 transition-all
        ${getStatusColor()}
        ${isOver && canDrop ? 'border-primary-500 shadow-lg scale-105' : ''}
        ${canDrop ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Table Number */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-gray-900">{table.displayName || table.number}</h3>
        <p className="text-sm text-gray-500">
          <Users className="inline h-3 w-3 mr-1" />
          {table.capacity} seats
        </p>
      </div>

      {/* Assignment Status */}
      {assignment ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm font-medium text-gray-900">{assignment.waiterName}</span>
            </div>
            {canManage && (
              <button
                onClick={() => onUnassign(table._id, assignment.waiterId)}
                className="text-red-600 hover:text-red-800"
              >
                <UserX className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            <Clock className="inline h-3 w-3 mr-1" />
            {new Date(assignment.assignedAt).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">No waiter assigned</p>
        </div>
      )}

      {/* Table Status Badge */}
      <div className="absolute top-2 right-2">
        <span className={`
          inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
          ${table.status === 'occupied' ? 'bg-red-100 text-red-800' : ''}
          ${table.status === 'reserved' ? 'bg-orange-100 text-orange-800' : ''}
          ${table.status === 'available' ? 'bg-green-100 text-green-800' : ''}
          ${table.status === 'cleaning' ? 'bg-blue-100 text-blue-800' : ''}
        `}>
          {table.status}
        </span>
      </div>
    </div>
  );
};

const AssignmentGridView: React.FC<AssignmentGridViewProps> = ({ canManage }) => {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [waiterLoads, setWaiterLoads] = useState<WaiterLoad[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AssignmentFilters>({});

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tablesResponse, assignmentsData, waiterLoadsData, layoutData] = await Promise.all([
        tableAPI.getTables(),
        staffAssignmentAPI.getAssignments(filters),
        staffAssignmentAPI.getWaiterLoads(),
        tableAPI.getLayout()
      ]);

      // Ensure we have proper data
      const tables = Array.isArray(tablesResponse.tables) ? tablesResponse.tables : [];
      const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
      const loads = Array.isArray(waiterLoadsData) ? waiterLoadsData : [];
      
      setTables(tables);
      setAssignments(assignments);
      setWaiterLoads(loads);
      
      // Extract unique floors
      const uniqueFloors = layoutData.layout.floors.map((f: any) => f.name);
      setFloors(uniqueFloors);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh event
  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-assignments', handleRefresh);
    return () => window.removeEventListener('refresh-assignments', handleRefresh);
  }, [loadData]);

  // Setup Socket.io listeners
  useEffect(() => {
    // Subscribe to real-time events
    const unsubscribers = [
      socketService.on('assignment:created', (data) => {
        setAssignments(prev => [...prev.filter(a => a.tableId !== data.assignment.tableId), data.assignment]);
        loadData(); // Refresh waiter loads
      }),
      
      socketService.on('assignment:ended', (data) => {
        setAssignments(prev => prev.filter(a => a.id !== data.assignmentId));
        loadData(); // Refresh waiter loads
      }),
      
      socketService.on('assignment:bulk-created', () => {
        loadData(); // Full refresh for bulk operations
      }),
      
      socketService.on('assignment:rotation', () => {
        loadData(); // Full refresh for rotations
      }),
      
      socketService.on('assignment:emergency-reassign', () => {
        loadData(); // Full refresh for emergency reassignments
      }),
      
      socketService.on('assignment:current-list', (data) => {
        setAssignments(data.assignments);
      }),
      
      socketService.on('assignment:waiter-loads', (data) => {
        setWaiterLoads(data.loads);
      })
    ];

    // Request initial data via socket
    socketService.requestAssignmentUpdate();
    socketService.requestWaiterLoads();

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Handle assignment
  const handleAssign = async (tableId: string, waiterId: string) => {
    try {
      const assignment = await staffAssignmentAPI.assignWaiter(tableId, waiterId);
      setAssignments(prev => [...prev.filter(a => a.tableId !== tableId), assignment]);
      
      // Update waiter loads
      const updatedLoads = await staffAssignmentAPI.getWaiterLoads();
      setWaiterLoads(updatedLoads);
      
      toast.success('Waiter assigned successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign waiter');
    }
  };

  // Handle unassignment
  const handleUnassign = async (tableId: string, waiterId: string) => {
    try {
      await staffAssignmentAPI.unassignWaiter(tableId, waiterId);
      setAssignments(prev => prev.filter(a => a.tableId !== tableId));
      
      // Update waiter loads
      const updatedLoads = await staffAssignmentAPI.getWaiterLoads();
      setWaiterLoads(updatedLoads);
      
      toast.success('Waiter unassigned successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unassign waiter');
    }
  };

  // Filter tables
  const filteredTables = tables.filter(table => {
    if (selectedFloor !== 'all' && table.location.floor !== selectedFloor) return false;
    if (searchQuery && !table.number.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !table.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group tables by section
  const tablesBySection = filteredTables.reduce((acc, table) => {
    const section = table.location.section || 'Unassigned';
    if (!acc[section]) acc[section] = [];
    acc[section].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Floor Filter */}
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Floors</option>
                {floors.map(floor => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </select>

              {/* Advanced Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`ml-2 h-4 w-4 transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Optimize Button */}
            {canManage && (
              <button
                onClick={async () => {
                  try {
                    const result = await staffAssignmentAPI.optimizeAssignments();
                    toast.success(`Optimized ${result.changes.length} assignments`);
                    loadData();
                  } catch (error) {
                    toast.error('Failed to optimize assignments');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Optimize
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Waiters Panel */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Waiters</h3>
              <div className="space-y-3">
                {waiterLoads.length > 0 ? (
                  waiterLoads.map(waiter => (
                    <WaiterCard key={waiter.waiterId} waiter={waiter} canManage={canManage} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No waiters available</p>
                )}
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="col-span-9">
            <div className="space-y-6">
              {Object.entries(tablesBySection).map(([section, sectionTables]) => (
                <div key={section} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{section}</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {sectionTables.map(table => {
                      const assignment = assignments.find(a => a.tableId === table._id);
                      return (
                        <TableCard
                          key={table._id}
                          table={table}
                          assignment={assignment}
                          canManage={canManage}
                          onAssign={handleAssign}
                          onUnassign={handleUnassign}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default AssignmentGridView;