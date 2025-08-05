import React from 'react';
import { format } from 'date-fns';
import { Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ServiceRequest {
  _id: string;
  tableNumber: string;
  requestType: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  message?: string;
  assignedWaiter?: {
    _id: string;
    name: string;
  };
  timestamps: {
    requested: string;
    acknowledged?: string;
    completed?: string;
  };
  responseTime: {
    acknowledgement?: number;
    completion?: number;
  };
}

interface ServiceRequestCardProps {
  request: ServiceRequest;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

const ServiceRequestCard: React.FC<ServiceRequestCardProps> = ({
  request,
  onAcknowledge,
  onComplete,
  onCancel
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'acknowledged':
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600 animate-pulse" />;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      call_waiter: 'Call Waiter',
      request_bill: 'Request Bill',
      water: 'Water',
      napkins: 'Napkins',
      cutlery: 'Cutlery',
      assistance: 'Assistance',
      complaint: 'Complaint',
      compliment: 'Compliment',
      custom: 'Custom Request'
    };
    return labels[type] || type;
  };

  return (
    <div className={`rounded-lg border-2 p-4 transition-all ${getPriorityColor(request.priority)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-900">
            Table {request.tableNumber}
          </div>
          {getStatusIcon()}
        </div>
        <span className={`
          px-2 py-1 text-xs font-semibold rounded-full
          ${request.priority === 'urgent' ? 'bg-red-600 text-white' : ''}
          ${request.priority === 'high' ? 'bg-orange-600 text-white' : ''}
          ${request.priority === 'normal' ? 'bg-blue-600 text-white' : ''}
          ${request.priority === 'low' ? 'bg-gray-600 text-white' : ''}
        `}>
          {request.priority.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {getRequestTypeLabel(request.requestType)}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(request.timestamps.requested), 'HH:mm:ss')}
          </span>
        </div>

        {request.message && (
          <p className="text-sm text-gray-600 italic">"{request.message}"</p>
        )}

        {request.assignedWaiter && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{request.assignedWaiter.name}</span>
          </div>
        )}

        {request.responseTime.acknowledgement && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Acknowledged in {request.responseTime.acknowledgement}s</span>
          </div>
        )}
      </div>

      {request.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Acknowledge
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {(request.status === 'acknowledged' || request.status === 'in_progress') && (
        <div className="mt-4 flex gap-2">
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestCard;