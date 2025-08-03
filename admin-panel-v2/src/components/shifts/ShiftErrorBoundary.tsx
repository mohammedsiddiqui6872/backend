import React from 'react';
import ErrorBoundary from '../common/ErrorBoundary';
import { AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

interface ShiftErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

const ShiftErrorFallback = ({ onReset }: { onReset?: () => void }) => (
  <div className="min-h-[400px] flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full">
        <Calendar className="w-6 h-6 text-orange-600" />
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Shift Management Error
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          We encountered an issue loading the shift management system. This might be due to a temporary connection problem or data sync issue.
        </p>
        <div className="mt-4 space-y-2 text-left">
          <p className="text-sm text-gray-700 font-medium">Try these steps:</p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• Refresh the page to reload shift data</li>
            <li>• Check your internet connection</li>
            <li>• Clear browser cache if the issue persists</li>
            <li>• Contact support if you continue to experience problems</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-center space-x-3">
          <button
            onClick={onReset || (() => window.location.reload())}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Shifts
          </button>
          <button
            onClick={() => window.location.href = '/team'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back to Team
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ShiftErrorBoundary: React.FC<ShiftErrorBoundaryProps> = ({ children, onReset }) => {
  return (
    <ErrorBoundary
      fallbackComponent={<ShiftErrorFallback onReset={onReset} />}
      onError={(error, errorInfo) => {
        // Log shift-specific errors with additional context
        console.error('Shift Management Error:', {
          error: error.toString(),
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ShiftErrorBoundary;