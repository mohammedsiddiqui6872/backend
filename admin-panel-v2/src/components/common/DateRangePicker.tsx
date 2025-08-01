import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = ''
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const handleApply = () => {
    onChange(tempStart, tempEnd);
    setShowPicker(false);
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setTempStart(start);
    setTempEnd(end);
    onChange(start, end);
    setShowPicker(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        <Calendar className="h-5 w-5 text-gray-500" />
        <span className="text-sm">
          {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
        </span>
      </button>

      {showPicker && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border p-4 z-10 w-80">
          <div className="space-y-4">
            {/* Quick select buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleQuickSelect(0)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                Today
              </button>
              <button
                onClick={() => handleQuickSelect(6)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                7 days
              </button>
              <button
                onClick={() => handleQuickSelect(29)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                30 days
              </button>
              <button
                onClick={() => handleQuickSelect(89)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                90 days
              </button>
            </div>

            {/* Date inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={format(tempStart, 'yyyy-MM-dd')}
                  onChange={(e) => setTempStart(new Date(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={format(tempEnd, 'yyyy-MM-dd')}
                  onChange={(e) => setTempEnd(new Date(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;