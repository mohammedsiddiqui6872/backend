import { useState, useRef, useEffect } from 'react';
import { Table, TableLayout, TableStatus, TableSelection } from '../../types/table';
import { Move, RotateCw, Save, Grid, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Edit3, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface TableLayoutDesignerProps {
  tables: Table[];
  layout: TableLayout;
  selectedFloor: string;
  onFloorChange: (floorId: string) => void;
  onTableUpdate: (table: Table) => Promise<void>;
  onTablesUpdate?: (tables: Table[]) => Promise<void>;
  onLayoutUpdate: (updates: Partial<TableLayout>) => Promise<void>;
}

interface DragState {
  isDragging: boolean;
  tableId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  isMultiDrag?: boolean;
  multiDragOffsets?: Map<string, { x: number; y: number }>;
}

const TableLayoutDesignerV2: React.FC<TableLayoutDesignerProps> = ({
  tables,
  layout,
  selectedFloor,
  onFloorChange,
  onTableUpdate,
  onTablesUpdate,
  onLayoutUpdate
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    tableId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [localTables, setLocalTables] = useState<Table[]>([]);
  const [selectionBox, setSelectionBox] = useState<{
    isSelecting: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    // Auto-arrange tables that are all at position 0,0
    const tablesNeedArrangement = tables.filter(t => 
      t.location.floor === selectedFloor && 
      t.location.x === 0 && 
      t.location.y === 0
    ).length > 1;

    if (tablesNeedArrangement) {
      // Arrange tables in a grid if they're all at 0,0
      const arrangedTables = tables.map((table, index) => {
        if (table.location.floor === selectedFloor && table.location.x === 0 && table.location.y === 0) {
          const cols = 5; // 5 tables per row
          const spacing = 100; // pixels between tables
          const row = Math.floor(index / cols);
          const col = index % cols;
          
          return {
            ...table,
            location: {
              ...table.location,
              x: col * spacing + 50,
              y: row * spacing + 50
            }
          };
        }
        return table;
      });
      setLocalTables(arrangedTables);
    } else {
      setLocalTables(tables);
    }
  }, [tables, selectedFloor]);

  useEffect(() => {
    setShowBulkActions(selectedTables.size > 0);
  }, [selectedTables]);

  const floor = layout.floors.find(f => f.id === selectedFloor);
  const floorTables = localTables.filter(t => t.location.floor === selectedFloor);

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return '#10B981';
      case 'occupied':
        return '#EF4444';
      case 'reserved':
        return '#F59E0B';
      case 'cleaning':
        return '#3B82F6';
      case 'maintenance':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getTableDimensions = (table: Table) => {
    const defaults = layout.theme?.shapeDefaults || {
      square: { width: 80, height: 80 },
      rectangle: { width: 120, height: 80 },
      round: { width: 80, height: 80 },
      oval: { width: 120, height: 80 },
      custom: { width: 100, height: 100 }
    };

    return {
      width: table.location.width || defaults[table.shape]?.width || 80,
      height: table.location.height || defaults[table.shape]?.height || 80
    };
  };

  const handleTableClick = (e: React.MouseEvent, table: Table) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isCtrlOrCmd) {
      // Toggle selection
      const newSelection = new Set(selectedTables);
      if (newSelection.has(table._id)) {
        newSelection.delete(table._id);
      } else {
        newSelection.add(table._id);
      }
      setSelectedTables(newSelection);
      setSelectedTable(table);
    } else if (isShift && selectedTable) {
      // Range selection (simple implementation - select all tables between)
      const currentIndex = floorTables.findIndex(t => t._id === selectedTable._id);
      const targetIndex = floorTables.findIndex(t => t._id === table._id);
      const start = Math.min(currentIndex, targetIndex);
      const end = Math.max(currentIndex, targetIndex);
      
      const newSelection = new Set(selectedTables);
      for (let i = start; i <= end; i++) {
        newSelection.add(floorTables[i]._id);
      }
      setSelectedTables(newSelection);
    } else {
      // Single selection
      setSelectedTables(new Set([table._id]));
      setSelectedTable(table);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    if (e.button !== 0) return; // Only left click
    if (isLocked) return; // Don't allow dragging when locked

    handleTableClick(e, table);

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    if (!rect) return;

    const isMultiSelect = selectedTables.size > 1 && selectedTables.has(table._id);

    if (isMultiSelect) {
      // Calculate offsets for all selected tables
      const multiDragOffsets = new Map<string, { x: number; y: number }>();
      selectedTables.forEach(tableId => {
        const t = localTables.find(lt => lt._id === tableId);
        if (t) {
          multiDragOffsets.set(tableId, {
            x: (e.clientX - rect.left) / zoom - t.location.x,
            y: (e.clientY - rect.top) / zoom - t.location.y
          });
        }
      });

      setDragState({
        isDragging: true,
        tableId: table._id,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: (e.clientX - rect.left) / zoom - table.location.x,
        offsetY: (e.clientY - rect.top) / zoom - table.location.y,
        isMultiDrag: true,
        multiDragOffsets
      });
    } else {
      setDragState({
        isDragging: true,
        tableId: table._id,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: (e.clientX - rect.left) / zoom - table.location.x,
        offsetY: (e.clientY - rect.top) / zoom - table.location.y,
        isMultiDrag: false
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Start selection box
    setSelectionBox({
      isSelecting: true,
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });

    // Clear selection if clicking on empty space
    setSelectedTables(new Set());
    setSelectedTable(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (selectionBox?.isSelecting) {
      // Update selection box
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setSelectionBox({
        ...selectionBox,
        endX: x,
        endY: y
      });

      // Select tables within box
      const minX = Math.min(selectionBox.startX, x);
      const maxX = Math.max(selectionBox.startX, x);
      const minY = Math.min(selectionBox.startY, y);
      const maxY = Math.max(selectionBox.startY, y);

      const newSelection = new Set<string>();
      floorTables.forEach(table => {
        const dims = getTableDimensions(table);
        const tableX = table.location.x;
        const tableY = table.location.y;
        const tableRight = tableX + dims.width;
        const tableBottom = tableY + dims.height;

        // Check if table intersects with selection box
        if (tableX < maxX && tableRight > minX && tableY < maxY && tableBottom > minY) {
          newSelection.add(table._id);
        }
      });

      setSelectedTables(newSelection);
    } else if (dragState.isDragging && dragState.tableId) {
      const x = (e.clientX - rect.left) / zoom - dragState.offsetX;
      const y = (e.clientY - rect.top) / zoom - dragState.offsetY;

      // Snap to grid if enabled
      const snapX = layout.snapToGrid ? Math.round(x / layout.gridSize.width) * layout.gridSize.width : x;
      const snapY = layout.snapToGrid ? Math.round(y / layout.gridSize.height) * layout.gridSize.height : y;

      if (dragState.isMultiDrag && dragState.multiDragOffsets) {
        // Move all selected tables
        const deltaX = snapX - localTables.find(t => t._id === dragState.tableId)!.location.x;
        const deltaY = snapY - localTables.find(t => t._id === dragState.tableId)!.location.y;

        setLocalTables(prev => prev.map(table => {
          if (selectedTables.has(table._id)) {
            return {
              ...table,
              location: {
                ...table.location,
                x: table.location.x + deltaX,
                y: table.location.y + deltaY
              }
            };
          }
          return table;
        }));
      } else {
        // Move single table
        setLocalTables(prev => prev.map(table => 
          table._id === dragState.tableId 
            ? { ...table, location: { ...table.location, x: snapX, y: snapY } }
            : table
        ));
      }
    }
  };

  const handleMouseUp = async () => {
    if (selectionBox?.isSelecting) {
      setSelectionBox(null);
    }

    if (dragState.isDragging && dragState.tableId) {
      if (dragState.isMultiDrag && onTablesUpdate) {
        // Update multiple tables
        const tablesToUpdate = localTables.filter(t => selectedTables.has(t._id));
        await onTablesUpdate(tablesToUpdate);
      } else {
        // Update single table
        const table = localTables.find(t => t._id === dragState.tableId);
        if (table) {
          await onTableUpdate(table);
        }
      }
    }

    setDragState({
      isDragging: false,
      tableId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    });
  };

  const handleRotate = async () => {
    if (selectedTables.size === 0) return;

    const tablesToRotate = localTables.filter(t => selectedTables.has(t._id));
    const updatedTables = tablesToRotate.map(table => ({
      ...table,
      location: {
        ...table.location,
        rotation: ((table.location.rotation || 0) + 45) % 360
      }
    }));

    if (onTablesUpdate) {
      await onTablesUpdate(updatedTables);
    } else {
      // Fallback to single updates
      for (const table of updatedTables) {
        await onTableUpdate(table);
      }
    }

    setLocalTables(prev => {
      const updateMap = new Map(updatedTables.map(t => [t._id, t]));
      return prev.map(t => updateMap.get(t._id) || t);
    });
  };

  const handleSelectAll = () => {
    const allTableIds = new Set(floorTables.map(t => t._id));
    setSelectedTables(allTableIds);
  };

  const handleDeselectAll = () => {
    setSelectedTables(new Set());
    setSelectedTable(null);
  };

  const renderTable = (table: Table) => {
    const dims = getTableDimensions(table);
    const isSelected = selectedTables.has(table._id);
    const isPrimarySelected = selectedTable?._id === table._id;

    return (
      <div
        key={table._id}
        className={`absolute select-none transition-all ${
          isLocked ? 'cursor-not-allowed' : 'cursor-move'
        } ${
          isSelected ? 'ring-2 ring-primary-500 shadow-lg z-10' : 'hover:shadow-md'
        } ${
          isPrimarySelected ? 'ring-4' : ''
        }`}
        style={{
          left: `${table.location.x * zoom}px`,
          top: `${table.location.y * zoom}px`,
          width: `${dims.width * zoom}px`,
          height: `${dims.height * zoom}px`,
          transform: `rotate(${table.location.rotation || 0}deg)`,
          transformOrigin: 'center',
          backgroundColor: getStatusColor(table.status),
          borderRadius: table.shape === 'round' || table.shape === 'oval' ? '50%' : '8px',
          opacity: table.status === 'maintenance' ? 0.6 : 1
        }}
        onMouseDown={(e) => handleMouseDown(e, table)}
      >
        <div className="h-full flex flex-col items-center justify-center text-white p-2">
          <div className="font-bold text-lg" style={{ fontSize: `${16 * zoom}px` }}>
            {table.displayName || table.number}
          </div>
          <div className="text-xs opacity-75" style={{ fontSize: `${12 * zoom}px` }}>
            {table.capacity} seats
          </div>
          {table.currentWaiter && (
            <div className="text-xs opacity-75 mt-1" style={{ fontSize: `${10 * zoom}px` }}>
              {table.currentWaiter.name}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Floor Selector */}
            <select
              value={selectedFloor}
              onChange={(e) => onFloorChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {layout.floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>

            {/* Multi-select info */}
            {selectedTables.size > 0 && (
              <div className="text-sm text-gray-600">
                {selectedTables.size} table{selectedTables.size > 1 ? 's' : ''} selected
              </div>
            )}

            {/* Bulk Actions */}
            {showBulkActions && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  title="Rotate selected tables"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-md ${showGrid ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Toggle grid"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-2 rounded-md ${isLocked ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
              title={isLocked ? 'Unlock layout' : 'Lock layout'}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-2 text-xs text-gray-500">
          <span className="mr-4">Click to select</span>
          <span className="mr-4">Ctrl/Cmd+Click for multi-select</span>
          <span className="mr-4">Drag to move</span>
          <span>Drag on canvas to box select</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative overflow-auto"
        style={{ height: '600px', cursor: isLocked ? 'default' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
      >
        {/* Background Image */}
        {floor?.backgroundImage && (
          <img
            src={floor.backgroundImage}
            alt="Floor plan"
            className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none"
            style={{ maxWidth: `${floor.dimensions.width * zoom}px`, maxHeight: `${floor.dimensions.height * zoom}px` }}
          />
        )}

        {/* Grid */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${layout.gridSize.width * zoom}px ${layout.gridSize.height * zoom}px`
            }}
          />
        )}

        {/* Selection Box */}
        {selectionBox && selectionBox.isSelecting && (
          <div
            className="absolute border-2 border-primary-500 bg-primary-100 bg-opacity-20 pointer-events-none"
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.endX) * zoom}px`,
              top: `${Math.min(selectionBox.startY, selectionBox.endY) * zoom}px`,
              width: `${Math.abs(selectionBox.endX - selectionBox.startX) * zoom}px`,
              height: `${Math.abs(selectionBox.endY - selectionBox.startY) * zoom}px`
            }}
          />
        )}

        {/* Tables */}
        {floorTables.map(table => renderTable(table))}
      </div>
    </div>
  );
};

export default TableLayoutDesignerV2;