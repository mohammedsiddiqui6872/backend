import { Edit2, Trash2, MoreVertical, Package2, DollarSign, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Combo, ComboItem } from '../../types/combo';

interface ComboCardProps {
  combo: Combo;
  onEdit: (combo: Combo) => void;
  onDelete: (combo: Combo) => void;
  onToggleActive: (combo: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo, onEdit, onDelete, onToggleActive }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getItemName = (item: ComboItem): string => {
    if (typeof item.menuItem === 'string') {
      return 'Unknown Item';
    }
    return item.menuItem.name;
  };

  const getDaysDisplay = () => {
    if (!combo.availableDays || combo.availableDays.length === 0) {
      return 'All days';
    }
    if (combo.availableDays.length === 7) {
      return 'All days';
    }
    return combo.availableDays.map(d => d.slice(0, 3)).join(', ');
  };

  const getTimeDisplay = () => {
    if (!combo.availableStartTime || !combo.availableEndTime) {
      return 'All day';
    }
    return `${combo.availableStartTime} - ${combo.availableEndTime}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      combo.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">{combo.name}</h3>
              {!combo.isActive && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              )}
              {combo.isActive && !combo.isCurrentlyAvailable && (
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                  Not Available Now
                </span>
              )}
            </div>
            {combo.nameAr && (
              <p className="text-sm text-gray-600 mt-1" dir="rtl">{combo.nameAr}</p>
            )}
            {combo.description && (
              <p className="text-sm text-gray-500 mt-2">{combo.description}</p>
            )}
          </div>
          
          <div className="relative ml-4">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <button
                    onClick={() => {
                      onEdit(combo);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleActive(combo);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {combo.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete(combo);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Image */}
        {combo.image && (
          <img
            src={combo.image}
            alt={combo.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        {/* Items */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
          <div className="space-y-1">
            {combo.items.map((item, index) => (
              <div key={index} className="text-sm text-gray-600">
                • {item.quantity}x {getItemName(item)}
                {item.choiceGroup && (
                  <span className="text-xs text-gray-500 ml-1">({item.choiceGroup})</span>
                )}
                {!item.isRequired && (
                  <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-semibold text-gray-900">${combo.price.toFixed(2)}</span>
              {combo.originalPrice && combo.originalPrice > combo.price && (
                <span className="text-sm text-gray-500 line-through">
                  ${combo.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            {combo.savings && combo.savings > 0 && (
              <div className="text-sm text-green-600">
                Save ${combo.savings.toFixed(2)}
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {combo.totalOrders} orders
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{getDaysDisplay()}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{getTimeDisplay()}</span>
          </div>
          {combo.maxDailyQuantity > 0 && (
            <div className="flex items-center text-gray-600">
              <Package2 className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>
                {combo.currentDailyQuantity}/{combo.maxDailyQuantity} sold today
              </span>
            </div>
          )}
        </div>

        {/* Warnings */}
        {combo.isActive && combo.maxDailyQuantity > 0 && 
         combo.currentDailyQuantity >= combo.maxDailyQuantity && (
          <div className="mt-3 flex items-center text-sm text-orange-600 bg-orange-50 p-2 rounded">
            <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
            Daily limit reached
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboCard;