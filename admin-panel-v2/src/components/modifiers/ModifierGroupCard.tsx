import { Edit2, Trash2, MoreVertical, Settings, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { ModifierGroup } from '../../types/modifiers';

interface ModifierGroupCardProps {
  modifierGroup: ModifierGroup;
  onEdit: (group: ModifierGroup) => void;
  onDelete: (group: ModifierGroup) => void;
  onToggleActive: (group: ModifierGroup) => void;
  onViewAnalytics?: (group: ModifierGroup) => void;
}

const ModifierGroupCard: React.FC<ModifierGroupCardProps> = ({
  modifierGroup,
  onEdit,
  onDelete,
  onToggleActive,
  onViewAnalytics
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getTypeDisplay = () => {
    if (modifierGroup.type === 'single') {
      return 'Single Selection';
    }
    return `Multiple Selection (${modifierGroup.minSelections}-${modifierGroup.maxSelections})`;
  };

  const getTotalRevenue = () => {
    if (!modifierGroup.analytics) return 0;
    
    return modifierGroup.options.reduce((total, option) => {
      const usage = modifierGroup.analytics!.popularOptions.find(
        po => po.optionName === option.name
      );
      return total + (option.price * (usage?.count || 0));
    }, 0);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      modifierGroup.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-medium text-gray-900">{modifierGroup.name}</h3>
              {modifierGroup.required && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  Required
                </span>
              )}
              {!modifierGroup.isActive && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            {modifierGroup.nameAr && (
              <p className="text-sm text-gray-600 mt-1" dir="rtl">{modifierGroup.nameAr}</p>
            )}
            {modifierGroup.description && (
              <p className="text-sm text-gray-500 mt-2">{modifierGroup.description}</p>
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
                      onEdit(modifierGroup);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleActive(modifierGroup);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {modifierGroup.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  {onViewAnalytics && modifierGroup.analytics && modifierGroup.analytics.totalUsage > 0 && (
                    <button
                      onClick={() => {
                        onViewAnalytics(modifierGroup);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      View Analytics
                    </button>
                  )}
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete(modifierGroup);
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

        {/* Info */}
        <div className="mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-1" />
              <span>{getTypeDisplay()}</span>
            </div>
            <div>
              {modifierGroup.options.length} options
            </div>
          </div>
        </div>

        {/* Options Preview */}
        <div className="space-y-2 mb-4">
          {modifierGroup.options.slice(0, 3).map((option, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700">{option.name}</span>
                {option.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    Default
                  </span>
                )}
                {!option.available && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    Unavailable
                  </span>
                )}
              </div>
              {option.price > 0 && (
                <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
              )}
            </div>
          ))}
          {modifierGroup.options.length > 3 && (
            <p className="text-xs text-gray-500">
              ...and {modifierGroup.options.length - 3} more options
            </p>
          )}
        </div>

        {/* Stats */}
        {modifierGroup.analytics && modifierGroup.analytics.totalUsage > 0 && (
          <div className="flex items-center justify-between pt-3 border-t text-sm">
            <div className="text-gray-600">
              Used <span className="font-medium text-gray-900">{modifierGroup.analytics.totalUsage}</span> times
            </div>
            <div className="flex items-center text-green-600">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">{getTotalRevenue().toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Menu Items Count */}
        {modifierGroup.menuItems && modifierGroup.menuItems.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Used in <span className="font-medium">{modifierGroup.menuItems.length}</span> menu items
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifierGroupCard;