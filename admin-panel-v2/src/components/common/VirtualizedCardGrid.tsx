import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, CircularProgress, Typography } from '@mui/material';

interface VirtualizedCardGridProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  columns?: number;
  gap?: number;
  cardHeight?: number;
  containerHeight?: number | string;
  loading?: boolean;
  emptyMessage?: string;
  getItemId?: (item: T) => string;
}

export function VirtualizedCardGrid<T>({
  items,
  renderCard,
  columns = 3,
  gap = 16,
  cardHeight = 300,
  containerHeight = 600,
  loading = false,
  emptyMessage = 'No items found',
  getItemId = (item: any) => item.id || item._id
}: VirtualizedCardGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate rows from items
  const rows = useMemo(() => {
    const rowsArray = [];
    for (let i = 0; i < items.length; i += columns) {
      rowsArray.push(items.slice(i, i + columns));
    }
    return rowsArray;
  }, [items, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cardHeight + gap,
    overscan: 2,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={containerHeight}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={containerHeight}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        width: '100%',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: gap / 8, // Convert px to spacing units
                  height: '100%',
                }}
              >
                {row.map((item, colIndex) => {
                  const itemIndex = virtualRow.index * columns + colIndex;
                  return (
                    <Box key={getItemId(item)} sx={{ height: cardHeight }}>
                      {renderCard(item, itemIndex)}
                    </Box>
                  );
                })}
                {/* Fill empty cells in the last row */}
                {row.length < columns && Array.from({ length: columns - row.length }).map((_, i) => (
                  <Box key={`empty-${i}`} />
                ))}
              </Box>
            </div>
          );
        })}
      </div>
    </div>
  );
}