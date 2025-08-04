import { useEffect, useRef } from 'react';

/**
 * Custom hook for setInterval with automatic cleanup
 * @param callback Function to execute
 * @param delay Delay in milliseconds (null to pause)
 * @param immediate Whether to execute immediately on start
 */
export function useInterval(
  callback: () => void,
  delay: number | null,
  immediate: boolean = false
) {
  const savedCallback = useRef<() => void>();
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }

    // Clear existing interval
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }

    if (delay !== null) {
      // Execute immediately if requested
      if (immediate) {
        tick();
      }

      // Set up new interval
      intervalId.current = setInterval(tick, delay);
      
      // Cleanup function
      return () => {
        if (intervalId.current) {
          clearInterval(intervalId.current);
          intervalId.current = null;
        }
      };
    }
  }, [delay, immediate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, []);

  // Return control functions
  return {
    start: () => {
      if (!intervalId.current && delay !== null) {
        intervalId.current = setInterval(() => {
          if (savedCallback.current) {
            savedCallback.current();
          }
        }, delay);
      }
    },
    stop: () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    },
    restart: () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
      if (delay !== null) {
        if (immediate && savedCallback.current) {
          savedCallback.current();
        }
        intervalId.current = setInterval(() => {
          if (savedCallback.current) {
            savedCallback.current();
          }
        }, delay);
      }
    }
  };
}