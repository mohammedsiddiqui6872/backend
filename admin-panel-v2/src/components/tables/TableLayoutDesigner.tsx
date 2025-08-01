import { useState, useRef, useEffect } from 'react';
import { Table, TableLayout, TableStatus } from '../../types/table';
import { Move, RotateCw, Save, Grid, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface TableLayoutDesignerProps {
  tables: Table[];
  layout: TableLayout;
  selectedFloor: string;
  onFloorChange: (floorId: string) => void;
  onTableUpdate: (table: Table) => Promise<void>;
  onLayoutUpdate: (updates: Partial<TableLayout>) => Promise<void>;
}

interface DragState {
  isDragging: boolean;
  tableId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

const TableLayoutDesigner: React.FC<TableLayoutDesignerProps> = ({
  tables,
  layout,
  selectedFloor,
  onFloorChange,
  onTableUpdate,
  onLayoutUpdate
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    tableId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });

  const floor = layout.floors.find(f => f.id === selectedFloor);
  const floorTables = tables.filter(t => t.location.floor === selectedFloor);

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

  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    if (e.button !== 0) return; // Only left click

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectedTable(table);
    setDragState({
      isDragging: true,
      tableId: table._id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: (e.clientX - rect.left) / zoom - table.location.x,
      offsetY: (e.clientY - rect.top) / zoom - table.location.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.tableId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom - dragState.offsetX;
    const y = (e.clientY - rect.top) / zoom - dragState.offsetY;

    // Snap to grid if enabled
    const snapX = layout.snapToGrid ? Math.round(x / layout.gridSize.width) * layout.gridSize.width : x;
    const snapY = layout.snapToGrid ? Math.round(y / layout.gridSize.height) * layout.gridSize.height : y;

    const table = tables.find(t => t._id === dragState.tableId);
    if (table) {
      // Update table position locally for smooth dragging
      table.location.x = snapX;
      table.location.y = snapY;
    }
  };

  const handleMouseUp = async () => {
    if (dragState.isDragging && dragState.tableId) {
      const table = tables.find(t => t._id === dragState.tableId);
      if (table) {
        await onTableUpdate(table);
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
    if (!selectedTable) return;

    const newRotation = ((selectedTable.location.rotation || 0) + 45) % 360;
    const updatedTable = {
      ...selectedTable,
      location: {
        ...selectedTable.location,
        rotation: newRotation
      }
    };

    await onTableUpdate(updatedTable);
    setSelectedTable(updatedTable);
  };

  const renderTable = (table: Table) => {
    const dims = getTableDimensions(table);
    const isSelected = selectedTable?._id === table._id;

    return (
      <div
        key={table._id}
        className={`absolute cursor-move select-none transition-shadow ${
          isSelected ? 'ring-2 ring-primary-500 shadow-lg z-10' : 'hover:shadow-md'
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

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                title="Reset Zoom"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 border rounded ${
                showGrid 
                  ? 'border-primary-500 bg-primary-50 text-primary-600' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Toggle Grid"
            >
              <Grid className="h-4 w-4" />
            </button>

            {/* Selected Table Actions */}
            {selectedTable && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <button
                  onClick={handleRotate}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                  title="Rotate Table"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Selected: {selectedTable.displayName || selectedTable.number}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Layout Settings */}
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={layout.snapToGrid}
                onChange={(e) => onLayoutUpdate({ snapToGrid: e.target.checked })}
                className="mr-2"
              />
              Snap to Grid
            </label>

            {/* Save Indicator */}
            <div className="flex items-center text-sm text-green-600">
              <Save className="h-4 w-4 mr-1" />
              Auto-saved
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative overflow-auto" style={{ height: '600px' }}>
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: `${floor?.dimensions.width || 1000}px`,
            height: `${floor?.dimensions.height || 800}px`,
            backgroundImage: showGrid 
              ? `repeating-linear-gradient(
                  0deg,
                  #e5e7eb,
                  #e5e7eb 1px,
                  transparent 1px,
                  transparent ${layout.gridSize.height}px
                ),
                repeating-linear-gradient(
                  90deg,
                  #e5e7eb,
                  #e5e7eb 1px,
                  transparent 1px,
                  transparent ${layout.gridSize.width}px
                )`
              : undefined,
            backgroundColor: '#f9fafb'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Floor Background Image */}
          {floor?.backgroundImage && (
            <img
              src={floor.backgroundImage}
              alt="Floor plan"
              className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none"
            />
          )}

          {/* Render Tables */}
          {floorTables.map(renderTable)}

          {/* Section Labels */}
          {floor?.sections.map((section) => (
            <div
              key={section.id}
              className="absolute text-gray-500 text-sm font-medium pointer-events-none"
              style={{
                left: '10px',
                top: '10px',
                color: section.color
              }}
            >
              {section.name}
            </div>
          ))}
        </div>
      </div>

      {/* Status Legend */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span className="ml-2 text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="ml-2 text-gray-600">Occupied</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="ml-2 text-gray-600">Reserved</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="ml-2 text-gray-600">Cleaning</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
            <span className="ml-2 text-gray-600">Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableLayoutDesigner;