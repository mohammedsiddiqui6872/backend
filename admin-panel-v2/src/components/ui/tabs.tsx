import * as React from 'react';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface TabsChildProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, className = '', children }) => {
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TabsChildProps>, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps extends TabsChildProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className = '', children, value, onValueChange }) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TabsChildProps>, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps extends TabsChildProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value: triggerValue, 
  className = '', 
  children, 
  value: activeValue,
  onValueChange 
}) => {
  const isActive = activeValue === triggerValue;
  
  return (
    <button
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 
        disabled:pointer-events-none disabled:opacity-50
        ${isActive ? 'bg-white text-gray-950 shadow-sm' : 'hover:bg-gray-50'}
        ${className}
      `}
      onClick={() => onValueChange?.(triggerValue)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends TabsChildProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  value: contentValue, 
  className = '', 
  children,
  value: activeValue 
}) => {
  if (activeValue !== contentValue) return null;
  
  return (
    <div className={`mt-2 ${className}`}>
      {children}
    </div>
  );
};