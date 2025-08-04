import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = AlertCircle, title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      <p className="text-gray-500">{message}</p>
    </div>
  );
};

export default EmptyState;