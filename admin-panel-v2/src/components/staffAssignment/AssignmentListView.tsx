import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  UserPlus, 
  UserMinus,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Loader2,
  Users,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { staffAssignmentAPI } from '../../services/staffAssignmentAPI';
import { tableAPI } from '../../services/tableAPI';
import { userAPI } from '../../services/userAPI';
import { StaffAssignment, WaiterLoad, BulkAssignmentRequest } from '../../types/staffAssignment';
import { Table } from '../../types/table';
import { User } from '../../types/user';
import toast from 'react-hot-toast';
import socketService from '../../services/socketService';

interface AssignmentListViewProps {
  canManage: boolean;
}

interface TableAssignmentRow {
  table: Table;
  assignment?: StaffAssignment;
  assistantAssignments: StaffAssignment[];
}

const AssignmentListView: React.FC<AssignmentListViewProps> = ({ canManage }) => {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [waiters, setWaiters] = useState<User[]>([]);
  const [waiterLoads, setWaiterLoads] = useState<WaiterLoad[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'table' | 'waiter' | 'status' | 'time'>('table');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedWaiterId, setSelectedWaiterId] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tablesResponse, assignmentsData, waitersData, waiterLoadsData] = await Promise.all([
        tableAPI.getTables(),
        staffAssignmentAPI.getAssignments(),
        userAPI.getUsers({ role: 'waiter' }),
        staffAssignmentAPI.getWaiterLoads()
      ]);

      // Ensure we have proper data
      const tables = Array.isArray(tablesResponse.tables) ? tablesResponse.tables : [];
      const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
      const waiters = Array.isArray(waitersData) ? waitersData : [];
      const loads = Array.isArray(waiterLoadsData) ? waiterLoadsData : [];
      
      setTables(tables);
      setAssignments(assignments);
      setWaiters(waiters.filter((u: any) => u.isActive));
      setWaiterLoads(loads);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh event
  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('refresh-assignments', handleRefresh);
    return () => window.removeEventListener('refresh-assignments', handleRefresh);
  }, [loadData]);

  // Listen for real-time updates
  useEffect(() => {
    // Set up real-time listeners
    const unsubscribers = [
      socketService.on('assignment:created', () => {
        console.log('Assignment created - reloading data');
        loadData();
      }),
      socketService.on('assignment:ended', () => {
        console.log('Assignment ended - reloading data');
        loadData();
      }),
      socketService.on('assignment:bulk-created', () => {
        console.log('Bulk assignments created - reloading data');
        loadData();
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [loadData]);

  // Prepare table rows with assignments
  const tableRows: TableAssignmentRow[] = tables.map(table => {
    const primaryAssignment = assignments.find(a => a.tableId === table._id && a.role === 'primary');
    const assistantAssignments = assignments.filter(a => a.tableId === table._id && a.role === 'assistant');
    return {
      table,
      assignment: primaryAssignment,
      assistantAssignments
    };
  });

  // Filter and sort tables
  const filteredRows = tableRows
    .filter(row => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!row.table.number.toLowerCase().includes(query) &&
            !row.table.displayName?.toLowerCase().includes(query) &&
            !row.assignment?.waiterName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus === 'assigned' && !row.assignment) return false;
      if (filterStatus === 'unassigned' && row.assignment) return false;

      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'table':
          compareValue = a.table.number.localeCompare(b.table.number);
          break;
        case 'waiter':
          compareValue = (a.assignment?.waiterName || '').localeCompare(b.assignment?.waiterName || '');
          break;
        case 'status':
          compareValue = a.table.status.localeCompare(b.table.status);
          break;
        case 'time':
          compareValue = (a.assignment?.assignedAt || 0) > (b.assignment?.assignedAt || 0) ? 1 : -1;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  // Handle individual assignment
  const handleAssign = async (tableId: string, waiterId: string, role: 'primary' | 'assistant' = 'primary') => {
    try {
      const assignment = await staffAssignmentAPI.assignWaiter(tableId, waiterId, role);
      await loadData();
      toast.success('Waiter assigned successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign waiter');
    }
  };

  // Handle unassignment
  const handleUnassign = async (tableId: string, waiterId: string) => {
    try {
      await staffAssignmentAPI.unassignWaiter(tableId, waiterId);
      await loadData();
      toast.success('Waiter unassigned successfully');
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unassign waiter');
      return false;
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async () => {
    if (!selectedWaiterId || selectedTables.size === 0) {
      toast.error('Please select a waiter and at least one table');
      return;
    }

    const request: BulkAssignmentRequest = {
      tableIds: Array.from(selectedTables),
      waiterId: selectedWaiterId,
      role: 'primary'
    };

    try {
      const result = await staffAssignmentAPI.bulkAssign(request);
      
      if (result.conflicts.length > 0) {
        toast(`Assigned ${result.successful.length} tables with ${result.conflicts.length} conflicts`, { icon: '⚠️' });
      } else {
        toast.success(`Successfully assigned ${result.successful.length} tables`);
      }

      setSelectedTables(new Set());
      setShowBulkAssign(false);
      await loadData();
    } catch (error) {
      toast.error('Failed to perform bulk assignment');
    }
  };

  // Toggle table selection
  const toggleTableSelection = (tableId: string) => {
    const newSelection = new Set(selectedTables);
    if (newSelection.has(tableId)) {
      newSelection.delete(tableId);
    } else {
      newSelection.add(tableId);
    }
    setSelectedTables(newSelection);
  };

  // Select all visible tables
  const selectAllTables = () => {
    const allTableIds = filteredRows.map(row => row.table._id);
    setSelectedTables(new Set(allTableIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTables(new Set());
  };

  const getWaiterLoad = (waiterId: string) => {
    const load = waiterLoads.find(w => w.waiterId === waiterId);
    return load ? `${load.currentTables}/${load.maxCapacity}` : '0/0';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables or waiters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Tables</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Unassigned Only</option>
            </select>

            {/* Selection Info */}
            {selectedTables.size > 0 && (
              <div className="text-sm text-gray-600">
                {selectedTables.size} table{selectedTables.size > 1 ? 's' : ''} selected
                <button
                  onClick={clearSelection}
                  className="ml-2 text-primary-600 hover:text-primary-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {canManage && selectedTables.size > 0 && (
              <button
                onClick={() => setShowBulkAssign(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Bulk Assign
              </button>
            )}
            
            <button
              onClick={() => {
                // Export functionality
                toast('Export feature coming soon', { icon: 'ℹ️' });
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTables.size === filteredRows.length && filteredRows.length > 0}
                  onChange={(e) => e.target.checked ? selectAllTables() : clearSelection()}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => {
                  setSortBy('table');
                  setSortOrder(sortBy === 'table' && sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center">
                  Table
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => {
                  setSortBy('status');
                  setSortOrder(sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center">
                  Status
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => {
                  setSortBy('waiter');
                  setSortOrder(sortBy === 'waiter' && sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center">
                  Primary Waiter
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assistants
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => {
                  setSortBy('time');
                  setSortOrder(sortBy === 'time' && sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center">
                  Assigned At
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              {canManage && (
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.map((row) => (
              <tr key={row.table._id} className={selectedTables.has(row.table._id) ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedTables.has(row.table._id)}
                    onChange={() => toggleTableSelection(row.table._id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {row.table.displayName || row.table.number}
                    </div>
                    <div className="ml-2 flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      {row.table.capacity}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.table.location.floor} - {row.table.location.section}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${row.table.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                    ${row.table.status === 'occupied' ? 'bg-red-100 text-red-800' : ''}
                    ${row.table.status === 'reserved' ? 'bg-orange-100 text-orange-800' : ''}
                    ${row.table.status === 'cleaning' ? 'bg-blue-100 text-blue-800' : ''}
                    ${row.table.status === 'maintenance' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {row.table.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {canManage ? (
                    <div className="flex items-center space-x-2">
                      <select
                        value={row.assignment?.waiterId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            if (row.assignment) {
                              // First unassign current waiter
                              handleUnassign(row.table._id, row.assignment.waiterId).then(() => {
                                // Then assign new waiter
                                handleAssign(row.table._id, e.target.value);
                              });
                            } else {
                              handleAssign(row.table._id, e.target.value);
                            }
                          } else if (row.assignment) {
                            handleUnassign(row.table._id, row.assignment.waiterId);
                          }
                        }}
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">No Primary Waiter</option>
                        {waiters.map(waiter => {
                          const load = waiterLoads.find(w => w.waiterId === waiter._id);
                          const isAvailable = load ? load.isAvailable : true;
                          return (
                            <option 
                              key={waiter._id} 
                              value={waiter._id}
                              disabled={!isAvailable}
                            >
                              {waiter.name} ({getWaiterLoad(waiter._id)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    row.assignment ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {row.assignment.waiterName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Load: {getWaiterLoad(row.assignment.waiterId)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {canManage ? (
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssign(row.table._id, e.target.value, 'assistant');
                            e.target.value = '';
                          }
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        defaultValue=""
                      >
                        <option value="">Add Assistant...</option>
                        {waiters
                          .filter(w => w._id !== row.assignment?.waiterId && 
                                      !row.assistantAssignments.some(a => a.waiterId === w._id))
                          .map(waiter => {
                            const load = waiterLoads.find(w => w.waiterId === waiter._id);
                            const isAvailable = load ? load.isAvailable : true;
                            return (
                              <option 
                                key={waiter._id} 
                                value={waiter._id}
                                disabled={!isAvailable}
                              >
                                {waiter.name} ({getWaiterLoad(waiter._id)})
                              </option>
                            );
                          })}
                      </select>
                      <div className="flex -space-x-1">
                        {row.assistantAssignments.map((assistant) => (
                          <div
                            key={assistant.id}
                            className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 border-2 border-white group"
                            title={assistant.waiterName}
                          >
                            <span className="text-xs font-medium text-gray-600">
                              {assistant.waiterName.charAt(0)}
                            </span>
                            <button
                              onClick={() => handleUnassign(row.table._id, assistant.waiterId)}
                              className="absolute -top-1 -right-1 hidden group-hover:block bg-red-500 text-white rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex -space-x-1">
                      {row.assistantAssignments.slice(0, 3).map((assistant) => (
                        <div
                          key={assistant.id}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 border-2 border-white"
                          title={assistant.waiterName}
                        >
                          <span className="text-xs font-medium text-gray-600">
                            {assistant.waiterName.charAt(0)}
                          </span>
                        </div>
                      ))}
                      {row.assistantAssignments.length > 3 && (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 border-2 border-white">
                          <span className="text-xs font-medium text-gray-600">
                            +{row.assistantAssignments.length - 3}
                          </span>
                        </div>
                      )}
                      {row.assistantAssignments.length === 0 && (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.assignment ? (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(row.assignment.assignedAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {row.assignment ? (
                        <>
                          <button
                            onClick={() => handleUnassign(row.table._id, row.assignment!.waiterId)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Unassign
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const firstAvailableWaiter = waiters.find(w => {
                              const load = waiterLoads.find(wl => wl.waiterId === w._id);
                              return load ? load.isAvailable : true;
                            });
                            if (firstAvailableWaiter) {
                              handleAssign(row.table._id, firstAvailableWaiter._id);
                            } else {
                              toast.error('No available waiters');
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-white hover:bg-green-50"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Quick Assign
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Bulk Assign Tables
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Assign {selectedTables.size} selected table{selectedTables.size > 1 ? 's' : ''} to a waiter
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Waiter
              </label>
              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Choose a waiter...</option>
                {waiters.map(waiter => {
                  const load = waiterLoads.find(w => w.waiterId === waiter._id);
                  const isAvailable = load ? load.isAvailable : true;
                  return (
                    <option 
                      key={waiter._id} 
                      value={waiter._id}
                      disabled={!isAvailable}
                    >
                      {waiter.name} (Current load: {getWaiterLoad(waiter._id)})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkAssign(false);
                  setSelectedWaiterId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={!selectedWaiterId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign Tables
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentListView;