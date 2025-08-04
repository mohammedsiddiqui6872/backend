import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell,
  Paper,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';

interface Column<T> {
  id: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  containerHeight?: number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  getRowId?: (item: T) => string;
  stickyHeader?: boolean;
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 52,
  containerHeight = 600,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  getRowId = (item) => item.id || item._id,
  stickyHeader = true
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={containerHeight}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={containerHeight}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <div
        ref={parentRef}
        style={{
          height: containerHeight,
          overflow: 'auto',
        }}
      >
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {items.map((virtualItem) => {
                const item = data[virtualItem.index];
                const rowId = getRowId(item);

                return (
                  <TableRow
                    key={rowId}
                    hover
                    onClick={() => onRowClick?.(item)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align || 'left'}
                        style={{ width: column.width }}
                      >
                        {column.render ? column.render(item) : item[column.id]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </div>
          </TableBody>
        </Table>
      </div>
    </Paper>
  );
}