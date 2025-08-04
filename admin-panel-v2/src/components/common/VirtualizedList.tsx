import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  onScroll?: (scrollTop: number) => void;
  estimatedItemHeight?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  containerClassName = '',
  onScroll,
  estimatedItemHeight = 50,
  getItemKey = (_, index) => index
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  // Cache for dynamic heights
  const heightCache = useRef<Map<number, number>>(new Map());
  const measuredHeights = useRef<Map<number, number>>(new Map());

  // Calculate item height
  const getHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      // Check cache first
      if (heightCache.current.has(index)) {
        return heightCache.current.get(index)!;
      }
      
      const height = itemHeight(index);
      heightCache.current.set(index, height);
      return height;
    }
    return itemHeight;
  }, [itemHeight]);

  // Calculate total height
  const getTotalHeight = useCallback((): number => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getHeight]);

  // Calculate offset for an item
  const getItemOffset = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }
    return offset;
  }, [itemHeight, getHeight]);

  // Update visible range based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;

    let startIndex = 0;
    let endIndex = items.length - 1;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    accumulatedHeight = getItemOffset(startIndex);
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += getHeight(i);
    }

    setVisibleRange({ start: startIndex, end: endIndex });
    setScrollTop(scrollTop);
    
    if (onScroll) {
      onScroll(scrollTop);
    }
  }, [items.length, getHeight, getItemOffset, overscan, onScroll]);

  // Handle scroll events with throttling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(updateVisibleRange);
  }, [updateVisibleRange]);

  // Update container dimensions
  const updateContainerDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    const height = containerRef.current.clientHeight;
    setContainerHeight(height);
    updateVisibleRange();
  }, [updateVisibleRange]);

  // Set up resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(updateContainerDimensions);
    resizeObserver.observe(containerRef.current);

    // Initial update
    updateContainerDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateContainerDimensions]);

  // Update when items change
  useEffect(() => {
    updateVisibleRange();
  }, [items, updateVisibleRange]);

  // Clear cache when items change significantly
  useEffect(() => {
    heightCache.current.clear();
    measuredHeights.current.clear();
  }, [items]);

  // Render visible items
  const visibleItems = [];
  for (let i = visibleRange.start; i <= visibleRange.end; i++) {
    if (i >= 0 && i < items.length) {
      const item = items[i];
      const offset = getItemOffset(i);
      const height = getHeight(i);
      const key = getItemKey(item, i);

      visibleItems.push(
        <VirtualizedItem
          key={key}
          index={i}
          offset={offset}
          height={height}
          measureHeight={(measuredHeight) => {
            if (measuredHeight !== height) {
              measuredHeights.current.set(i, measuredHeight);
              // Trigger re-render if height changed
              updateVisibleRange();
            }
          }}
        >
          {renderItem(item, i)}
        </VirtualizedItem>
      );
    }
  }

  const totalHeight = getTotalHeight();

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${containerClassName}`}
      onScroll={handleScroll}
    >
      <div
        className={`relative ${className}`}
        style={{ height: totalHeight }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

interface VirtualizedItemProps {
  index: number;
  offset: number;
  height: number;
  measureHeight: (height: number) => void;
  children: React.ReactNode;
}

function VirtualizedItem({
  index,
  offset,
  height,
  measureHeight,
  children
}: VirtualizedItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [ref, inView] = useInView({
    threshold: 0,
    rootMargin: '100px'
  });

  // Measure actual height when in view
  useEffect(() => {
    if (inView && itemRef.current) {
      const actualHeight = itemRef.current.getBoundingClientRect().height;
      if (actualHeight !== height) {
        measureHeight(actualHeight);
      }
    }
  }, [inView, height, measureHeight]);

  return (
    <div
      ref={(node) => {
        (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        ref(node);
      }}
      className="absolute top-0 left-0 w-full"
      style={{
        transform: `translateY(${offset}px)`,
        height: height === 0 ? 'auto' : height
      }}
    >
      {children}
    </div>
  );
}

// Export a memoized version for better performance
export default React.memo(VirtualizedList) as typeof VirtualizedList;