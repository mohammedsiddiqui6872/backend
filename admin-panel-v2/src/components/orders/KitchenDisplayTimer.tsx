import React, { useState, useEffect } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Clock } from 'lucide-react';
import { useInterval } from '../../hooks/useInterval';

interface Order {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
}

interface KitchenDisplayTimerProps {
  order: Order;
}

export const KitchenDisplayTimer: React.FC<KitchenDisplayTimerProps> = ({ order }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Calculate initial elapsed time
  useEffect(() => {
    const minutes = differenceInMinutes(new Date(), new Date(order.createdAt));
    setElapsedTime(minutes);
  }, [order.createdAt]);

  // Update every second using the custom hook with proper cleanup
  useInterval(() => {
    const minutes = differenceInMinutes(new Date(), new Date(order.createdAt));
    setElapsedTime(minutes);
  }, 1000);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTimeColor = (minutes: number): string => {
    if (minutes < 10) return 'text-green-600';
    if (minutes < 20) return 'text-yellow-600';
    if (minutes < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`flex items-center ${getTimeColor(elapsedTime)}`}>
      <Clock className="h-4 w-4 mr-1" />
      <span className="font-mono text-sm font-medium">
        {formatTime(elapsedTime)}
      </span>
    </div>
  );
};