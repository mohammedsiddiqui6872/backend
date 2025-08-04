import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Box, 
  Paper, 
  CircularProgress,
  Typography,
  Checkbox,
  IconButton,
  Chip
} from '@mui/material';
import { MoreVertical } from 'lucide-react';

interface Column<T> {
  field: string;
  headerName: string;
  width?: number;
  flex?: number;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'actions' | 'selection';
  valueGetter?: (params: { row: T }) => any;
  renderCell?: (params: { value: any; row: T }) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

interface VirtualizedDataGridProps<T> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  checkboxSelection?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  rowHeight?: number;
  headerHeight?: number;
  height?: number | string;
  width?: number | string;
  emptyMessage?: string;
  selectedRows?: string[];
}

export function VirtualizedDataGrid<T extends Record<string, any>>({
  rows,
  columns,
  loading = false,
  checkboxSelection = false,
  onSelectionChange,
  onRowClick,
  getRowId = (row) => row.id || row._id,
  rowHeight = 52,
  headerHeight = 56,
  height = 600,
  width = '100%',
  emptyMessage = 'No rows',
  selectedRows = []
}: VirtualizedDataGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Calculate column widths
  const columnWidths = useMemo(() => {
    const totalFlex = columns.reduce((sum, col) => sum + (col.flex || 0), 0);
    const fixedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const containerWidth = typeof width === 'number' ? width : 1200; // Default width
    const flexUnit = totalFlex > 0 ? (containerWidth - fixedWidth - (checkboxSelection ? 50 : 0)) / totalFlex : 0;

    return columns.map(col => ({
      ...col,
      calculatedWidth: col.width || (col.flex ? col.flex * flexUnit : 150)
    }));
  }, [columns, width, checkboxSelection]);

  const handleSelectAll = () => {
    if (selectedRows.length === rows.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(rows.map(row => getRowId(row)));
    }
  };

  const handleSelectRow = (rowId: string) => {
    if (selectedRows.includes(rowId)) {
      onSelectionChange?.(selectedRows.filter(id => id !== rowId));
    } else {
      onSelectionChange?.([...selectedRows, rowId]);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={height}>
        <CircularProgress />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={height}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width, height, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: headerHeight,
          borderBottom: 1,
          borderColor: 'divider',
          px: 2,
          bgcolor: 'grey.50',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {checkboxSelection && (
          <Box sx={{ width: 50 }}>
            <Checkbox
              checked={selectedRows.length === rows.length && rows.length > 0}
              indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
              onChange={handleSelectAll}
              size="small"
            />
          </Box>
        )}
        {columnWidths.map((column) => (
          <Box
            key={column.field}
            sx={{
              width: column.calculatedWidth,
              px: 1,
              fontWeight: 'medium',
              fontSize: '0.875rem',
            }}
          >
            {column.headerName}
          </Box>
        ))}
      </Box>

      {/* Body */}
      <div
        ref={parentRef}
        style={{
          height: `calc(100% - ${headerHeight}px)`,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const row = rows[virtualItem.index];
            const rowId = getRowId(row);
            const isSelected = selectedRows.includes(rowId);

            return (
              <Box
                key={rowId}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected ? 'action.selected' : 'action.hover',
                    cursor: onRowClick ? 'pointer' : 'default',
                  },
                }}
                onClick={() => onRowClick?.(row)}
              >
                {checkboxSelection && (
                  <Box sx={{ width: 50 }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectRow(rowId)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      size="small"
                    />
                  </Box>
                )}
                {columnWidths.map((column) => {
                  const value = column.valueGetter 
                    ? column.valueGetter({ row })
                    : row[column.field];

                  return (
                    <Box
                      key={column.field}
                      sx={{
                        width: column.calculatedWidth,
                        px: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {column.renderCell ? (
                        column.renderCell({ value, row })
                      ) : column.type === 'boolean' ? (
                        <Chip
                          label={value ? 'Yes' : 'No'}
                          size="small"
                          color={value ? 'success' : 'default'}
                        />
                      ) : column.type === 'date' ? (
                        value ? new Date(value).toLocaleDateString() : '-'
                      ) : column.type === 'actions' ? (
                        <IconButton size="small" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <MoreVertical size={16} />
                        </IconButton>
                      ) : (
                        value?.toString() || '-'
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </div>
      </div>
    </Paper>
  );
}