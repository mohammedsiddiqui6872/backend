import { useState, useEffect } from 'react';
import { Plus, Grid3X3, Download, Upload, Layers, BarChart3, Settings, Search, Filter, Zap, FileUp } from 'lucide-react';
import { Table, TableLayout, TableInput } from '../types/table';
import { tableAPI } from '../services/tableAPI';
import TableCard from '../components/tables/TableCard';
import TableModal from '../components/tables/TableModal';
import TableLayoutDesigner from '../components/tables/TableLayoutDesigner';
import TableLayoutDesignerV2 from '../components/tables/TableLayoutDesignerV2';
import TableAnalytics from '../components/tables/TableAnalytics';
import QRCodeManager from '../components/tables/QRCodeManager';
import FloorManager from '../components/tables/FloorManager';
import QRCodeViewer from '../components/tables/QRCodeViewer';
import TableStatusRules from '../components/tables/TableStatusRules';
import TableImport from '../components/tables/TableImport';

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
      
      setTables(tablesData.tables);
      setStats(tablesData.stats);
      setLayout(layoutData.layout);
    } catch (error) {
      console.error('Error fetching data:', error);
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
        await tableAPI.updateTableStatus(table.number, status);
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
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

      {/* Content */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            // Find floor and section names from layout
            const floor = layout?.floors.find(f => f.id === table.location.floor);
            const section = floor?.sections.find(s => s.id === table.location.section);
            
            return (
              <TableCard
                key={table._id}
                table={table}
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
                  setViewMode('analytics');
                }}
                onQRCode={() => {
                  setSelectedTable(table);
                  setShowQRViewer(true);
                }}
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
    </div>
  );
};

export default Tables;