import { useEffect, useRef, useCallback, useState } from 'react';

type TimeoutCallback = () => void;

export function useTimeout(callback: TimeoutCallback, delay: number | null) {
  const callbackRef = useRef<TimeoutCallback>(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Set up the timeout
  const set = useCallback(() => {
    if (delay !== null) {
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, delay);
    }
  }, [delay]);

  // Clear the timeout
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset the timeout
  const reset = useCallback(() => {
    clear();
    set();
  }, [clear, set]);

  // Set up timeout on mount and clean up on unmount
  useEffect(() => {
    set();
    return clear;
  }, [delay, set, clear]);

  return { clear, reset };
}

// Convenience hook for one-time timeouts
export function useDelayedAction(delay: number | null) {
  const [isReady, setIsReady] = useState(false);
  
  useTimeout(() => {
    setIsReady(true);
  }, delay);

  return isReady;
}

// Hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}