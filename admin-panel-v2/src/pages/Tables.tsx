import { useState, useEffect } from 'react';
import { Plus, Grid3X3, Download, Upload, Layers, BarChart3, Settings, Search, Filter, Zap, FileUp } from 'lucide-react';
import { Table, TableLayout, TableInput } from '../types/table';
import { tableAPI } from '../services/tableAPI';
import TableCard from '../components/tables/TableCard';
import TableCardV2 from '../components/tables/TableCardV2';
import TableModal from '../components/tables/TableModal';
import TableLayoutDesigner from '../components/tables/TableLayoutDesigner';
import TableLayoutDesignerV2 from '../components/tables/TableLayoutDesignerV2';
import TableAnalytics from '../components/tables/TableAnalytics';
import QRCodeManager from '../components/tables/QRCodeManager';
import FloorManager from '../components/tables/FloorManager';
import QRCodeViewer from '../components/tables/QRCodeViewer';
import TableStatusRules from '../components/tables/TableStatusRules';
import TableImport from '../components/tables/TableImport';
import TableCombination from '../components/tables/TableCombination';
import TableDetails from '../components/tables/TableDetails';

type ViewMode = 'grid' | 'layout' | 'analytics' | 'rules';

const Tables = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFloor, setSelectedFloor] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showQRManager, setShowQRManager] = useState(false);
  const [showFloorManager, setShowFloorManager] = useState(false);
  const [showQRViewer, setShowQRViewer] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCombination, setShowCombination] = useState(false);
  const [showTableDetails, setShowTableDetails] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<string>('available');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tablesData, layoutData] = await Promise.all([
        tableAPI.getTables(),
        tableAPI.getLayout()
      ]);
      
      console.log('Tables API Response:', tablesData); // Debug log
      
      setTables(tablesData.tables || []);
      setStats(tablesData.stats || {});
      setLayout(layoutData.layout || null);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Show user-friendly error
      alert('Failed to load tables. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTable = async (tableData: TableInput) => {
    try {
      setModalLoading(true);
      if (selectedTable) {
        await tableAPI.updateTable(selectedTable._id, tableData);
      } else {
        await tableAPI.createTable(tableData);
      }
      await fetchData();
      setShowTableModal(false);
      setSelectedTable(null);
    } catch (err: any) {
      console.error('Error saving table:', err);
      alert(err.response?.data?.error || 'Failed to save table');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (tableId: string, status: string) => {
    try {
      const table = tables.find(t => t._id === tableId);
      if (table) {
        // Optimistic update - update local state immediately
        setTables(prevTables => 
          prevTables.map(t => 
            t._id === tableId ? { ...t, status: status as any } : t
          )
        );
        
        // Then update on server
        await tableAPI.updateTableStatus(table.number, status);
        
        // Only fetch if there's an error
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error by fetching fresh data
      await fetchData();
    }
  };
  
  const handleTableSelect = (tableId: string, isMulti: boolean) => {
    if (isMulti) {
      // Multi-select with Ctrl/Cmd
      setSelectedTableIds(prev => 
        prev.includes(tableId) 
          ? prev.filter(id => id !== tableId)
          : [...prev, tableId]
      );
    } else {
      // Single select
      setSelectedTableIds([tableId]);
    }
  };

  const handleDeleteTable = async (tableNumber: string) => {
    if (window.confirm(`Are you sure you want to delete table ${tableNumber}?`)) {
      try {
        await tableAPI.deleteTable(tableNumber);
        await fetchData();
      } catch (error) {
        console.error('Error deleting table:', error);
        alert('Failed to delete table');
      }
    }
  };

  const handleBulkStatusUpdate = async () => {
    try {
      setModalLoading(true);
      // Update status for all selected tables
      const updatePromises = selectedTableIds.map(tableId => {
        const table = tables.find(t => t._id === tableId);
        if (table) {
          return tableAPI.updateTableStatus(table.number, bulkStatusUpdate);
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      await fetchData();
      setSelectedTableIds([]);
      setShowBulkStatusModal(false);
    } catch (error) {
      console.error('Error updating table statuses:', error);
      alert('Failed to update some tables');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || table.status === filterStatus;
    const matchesFloor = viewMode !== 'layout' || table.location.floor === selectedFloor;
    return matchesSearch && matchesStatus && matchesFloor;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Table Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage restaurant tables, layouts, and QR codes
          </p>
          {stats && (
            <div className="mt-4 flex space-x-6 text-sm">
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-medium text-gray-900">{stats.total}</span>
              </div>
              <div>
                <span className="text-gray-500">Available:</span>
                <span className="ml-2 font-medium text-green-600">{stats.available}</span>
              </div>
              <div>
                <span className="text-gray-500">Occupied:</span>
                <span className="ml-2 font-medium text-red-600">{stats.occupied}</span>
              </div>
              <div>
                <span className="text-gray-500">Reserved:</span>
                <span className="ml-2 font-medium text-orange-600">{stats.reserved}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFloorManager(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Layers className="h-4 w-4 mr-2" />
            Floors
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => setShowQRManager(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            QR Codes
          </button>
          <button
            onClick={() => {
              setSelectedTable(null);
              setShowTableModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('grid')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'grid'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid3X3 className="inline-block h-4 w-4 mr-2" />
            Grid View
          </button>
          <button
            onClick={() => setViewMode('layout')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'layout'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="inline-block h-4 w-4 mr-2" />
            Layout Designer
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="inline-block h-4 w-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'rules'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap className="inline-block h-4 w-4 mr-2" />
            Status Rules
          </button>
        </nav>
      </div>

      {/* Filters */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by table number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-12 py-3 text-base border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="cleaning">Cleaning</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedTableIds.length > 0 && viewMode === 'grid' && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-primary-900">
                {selectedTableIds.length} table{selectedTableIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedTableIds([])}
                className="text-sm text-primary-700 hover:text-primary-900"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBulkStatusModal(true)}
                className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Update Status
              </button>
              <button
                onClick={async () => {
                  if (window.confirm(`Delete ${selectedTableIds.length} tables?`)) {
                    // Implement bulk delete
                    setSelectedTableIds([]);
                  }
                }}
                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            // Find floor and section names from layout
            const floor = layout?.floors.find(f => f.id === table.location.floor);
            const section = floor?.sections.find(s => s.id === table.location.section);
            
            return (
              <TableCardV2
                key={table._id}
                table={table}
                isSelected={selectedTableIds.includes(table._id)}
                floorName={floor?.name}
                sectionName={section?.name}
                onEdit={() => {
                  setSelectedTable(table);
                  setShowTableModal(true);
                }}
                onUpdateStatus={handleUpdateStatus}
                onDelete={() => handleDeleteTable(table.number)}
                onViewDetails={() => {
                  setSelectedTable(table);
                  setShowTableDetails(true);
                }}
                onQRCode={() => {
                  setSelectedTable(table);
                  setShowQRViewer(true);
                }}
                onCombination={() => {
                  setSelectedTable(table);
                  setShowCombination(true);
                }}
                onSelect={handleTableSelect}
              />
            );
          })}
        </div>
      )}

      {viewMode === 'layout' && layout && (
        <TableLayoutDesignerV2
          tables={tables}
          layout={layout}
          selectedFloor={selectedFloor}
          onFloorChange={setSelectedFloor}
          onTableUpdate={async (table) => {
            await tableAPI.updateTable(table._id, table);
            await fetchData();
          }}
          onTablesUpdate={async (tables) => {
            // Update multiple tables
            await Promise.all(tables.map(table => 
              tableAPI.updateTable(table._id, table)
            ));
            await fetchData();
          }}
          onLayoutUpdate={async (updates) => {
            await tableAPI.updateLayout(updates);
            await fetchData();
          }}
        />
      )}

      {viewMode === 'analytics' && (
        <TableAnalytics
          tables={tables}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
        />
      )}

      {viewMode === 'rules' && (
        <TableStatusRules />
      )}

      {/* Modals */}
      {showTableModal && (
        <TableModal
          isOpen={showTableModal}
          onClose={() => {
            setShowTableModal(false);
            setSelectedTable(null);
          }}
          onSave={handleSaveTable}
          table={selectedTable}
          loading={modalLoading}
          floors={layout?.floors || []}
        />
      )}

      {showQRManager && (
        <QRCodeManager
          isOpen={showQRManager}
          onClose={() => setShowQRManager(false)}
          tables={tables}
        />
      )}

      {showFloorManager && layout && (
        <FloorManager
          isOpen={showFloorManager}
          onClose={() => setShowFloorManager(false)}
          layout={layout}
          onUpdate={async () => {
            await fetchData();
          }}
        />
      )}

      {showQRViewer && selectedTable && (
        <QRCodeViewer
          isOpen={showQRViewer}
          onClose={() => {
            setShowQRViewer(false);
            setSelectedTable(null);
          }}
          table={selectedTable}
          floorName={layout?.floors.find(f => f.id === selectedTable.location.floor)?.name}
          sectionName={layout?.floors.find(f => f.id === selectedTable.location.floor)?.sections.find(s => s.id === selectedTable.location.section)?.name}
        />
      )}

      {showImport && (
        <TableImport
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setShowImport(false);
            fetchData();
          }}
        />
      )}

      {showCombination && selectedTable && (
        <TableCombination
          table={selectedTable}
          onCombine={() => {
            setShowCombination(false);
            setSelectedTable(null);
            fetchData();
          }}
          onSplit={() => {
            setShowCombination(false);
            setSelectedTable(null);
            fetchData();
          }}
          onClose={() => {
            setShowCombination(false);
            setSelectedTable(null);
          }}
        />
      )}

      {/* Table Details Modal */}
      {showTableDetails && selectedTable && (
        <TableDetails
          table={selectedTable}
          onClose={() => {
            setShowTableDetails(false);
            setSelectedTable(null);
          }}
        />
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Update Status for {selectedTableIds.length} Table{selectedTableIds.length > 1 ? 's' : ''}
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Status
              </label>
              <select
                value={bulkStatusUpdate}
                onChange={(e) => setBulkStatusUpdate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkStatusModal(false);
                  setBulkStatusUpdate('available');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={modalLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {modalLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;