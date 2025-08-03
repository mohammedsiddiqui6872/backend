import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Users, Clock, Calendar, Coffee } from 'lucide-react';
import { Shift } from '../../types/shift';
import { detectAllConflicts, ShiftConflict } from '../../utils/conflictDetection';
import { format } from 'date-fns';

interface ConflictDetectionWidgetProps {
  shifts: Shift[];
  onShiftClick?: (shiftId: string) => void;
}

const ConflictDetectionWidget: React.FC<ConflictDetectionWidgetProps> = ({ 
  shifts, 
  onShiftClick 
}) => {
  const [conflicts, setConflicts] = useState<ShiftConflict[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [settings, setSettings] = useState({
    maxDailyHours: 10,
    maxWeeklyHours: 48,
    minRestHours: 8
  });

  useEffect(() => {
    const detectedConflicts = detectAllConflicts(
      shifts,
      settings.maxDailyHours,
      settings.maxWeeklyHours,
      settings.minRestHours
    );
    setConflicts(detectedConflicts);
  }, [shifts, settings]);

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const getConflictIcon = (type: ShiftConflict['type']) => {
    switch (type) {
      case 'double-booking':
        return <Users className="h-4 w-4" />;
      case 'overtime':
      case 'max-hours-exceeded':
        return <Clock className="h-4 w-4" />;
      case 'insufficient-rest':
        return <Coffee className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictTypeLabel = (type: ShiftConflict['type']) => {
    switch (type) {
      case 'double-booking':
        return 'Double Booking';
      case 'overtime':
        return 'Daily Overtime';
      case 'max-hours-exceeded':
        return 'Weekly Hours Exceeded';
      case 'insufficient-rest':
        return 'Insufficient Rest';
      default:
        return 'Conflict';
    }
  };

  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">
              No scheduling conflicts detected
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      {/* Summary Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className={`h-5 w-5 mr-2 ${errorCount > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
            <h4 className="text-sm font-medium text-gray-900">
              Scheduling Conflicts Detected
            </h4>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        <div className="mt-2 flex items-center space-x-4 text-sm">
          {errorCount > 0 && (
            <span className="text-red-700">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-yellow-700">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Detailed Conflicts List */}
      {showDetails && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          {/* Settings */}
          <div className="mb-4 p-3 bg-white rounded-lg">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Conflict Detection Settings</h5>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 mb-1">Max Daily Hours</label>
                <input
                  type="number"
                  value={settings.maxDailyHours}
                  onChange={(e) => setSettings({ ...settings, maxDailyHours: parseInt(e.target.value) || 10 })}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Max Weekly Hours</label>
                <input
                  type="number"
                  value={settings.maxWeeklyHours}
                  onChange={(e) => setSettings({ ...settings, maxWeeklyHours: parseInt(e.target.value) || 48 })}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Min Rest Hours</label>
                <input
                  type="number"
                  value={settings.minRestHours}
                  onChange={(e) => setSettings({ ...settings, minRestHours: parseInt(e.target.value) || 8 })}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Conflicts */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  conflict.severity === 'error' 
                    ? 'bg-red-100 border-red-300' 
                    : 'bg-yellow-100 border-yellow-300'
                }`}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 mt-0.5 ${
                    conflict.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {getConflictIcon(conflict.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {getConflictTypeLabel(conflict.type)}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {conflict.message}
                    </p>
                    {onShiftClick && conflict.affectedShifts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {conflict.affectedShifts.map(shiftId => {
                          const shift = shifts.find(s => s._id === shiftId);
                          if (!shift) return null;
                          return (
                            <button
                              key={shiftId}
                              onClick={() => onShiftClick(shiftId)}
                              className="text-xs text-primary-600 hover:text-primary-700 underline"
                            >
                              {format(new Date(shift.date), 'MMM d')} {shift.scheduledTimes.start}-{shift.scheduledTimes.end}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictDetectionWidget;