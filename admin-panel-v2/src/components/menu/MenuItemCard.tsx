import { useState } from 'react';
import { Edit2, Trash2, MoreVertical, Image as ImageIcon, DollarSign, Tag, Package, AlertTriangle, ChefHat } from 'lucide-react';
import { MenuItem } from '../../types/menu';
import StockManagementModal from './StockManagementModal';
import RecipeModal from './RecipeModal';
import PricingRulesModal from './PricingRulesModal';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onToggleAvailable: (item: MenuItem) => void;
  onUpdate?: () => void;
  categoryName?: string;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleAvailable,
  onUpdate,
  categoryName
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const profit = item.cost ? item.price - item.cost : null;
  const profitMargin = item.cost ? ((profit! / item.price) * 100).toFixed(1) : null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${
      item.available ? 'border-gray-200' : 'border-red-200 bg-red-50'
    }`}>
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.name}
              className="h-24 w-24 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                console.error('Image failed to load:', item.image);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ${item.image ? 'hidden' : ''}`}>
            <ImageIcon className="h-10 w-10 text-gray-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {item.name}
                  </h3>
                  <span className="text-sm text-gray-500">#{item.id}</span>
                </div>
                
                
                <p className="text-sm text-gray-500 mt-1">
                  {categoryName || item.category}
                </p>
                
                {item.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {item.description}
                  </p>
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
                          onEdit(item);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => {
                          onToggleAvailable(item);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Mark as {item.available ? 'Unavailable' : 'Available'}
                      </button>
                      
                      {item.stockQuantity !== -1 && (
                        <button
                          onClick={() => {
                            setShowStockModal(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Manage Stock
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setShowRecipeModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <ChefHat className="h-4 w-4 mr-2" />
                        Manage Recipe
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowPricingModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Pricing Rules
                      </button>
                      
                      <hr className="my-1" />
                      
                      <button
                        onClick={() => {
                          onDelete(item);
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
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${item.price.toFixed(2)}
                  </span>
                  {item.discount && item.discount > 0 && (
                    <span className="ml-2 text-sm text-red-600">
                      -{item.discount}%
                    </span>
                  )}
                </div>
                
                {profit !== null && (
                  <div className="text-sm text-gray-500">
                    <span>Cost: ${item.cost?.toFixed(2)}</span>
                    <span className="ml-2 text-green-600">
                      +{profitMargin}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Stock Status */}
                {item.stockQuantity !== -1 && (
                  <div className="flex items-center space-x-1">
                    {item.stockQuantity === 0 ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Out of Stock
                      </span>
                    ) : item.stockQuantity <= (item.lowStockThreshold || 10) ? (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock ({item.stockQuantity})
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center">
                        <Package className="h-3 w-3 mr-1" />
                        In Stock ({item.stockQuantity})
                      </span>
                    )}
                  </div>
                )}
                
                {!item.available && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    Unavailable
                  </span>
                )}
                {item.featured && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    Featured
                  </span>
                )}
                {item.isSpecial && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Special
                  </span>
                )}
              </div>
            </div>
            
            {(item.dietary && item.dietary.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.dietary.map((tag, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stock Management Modal */}
      {showStockModal && (
        <StockManagementModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          menuItem={item}
          onUpdate={() => {
            setShowStockModal(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}
      
      {/* Recipe Management Modal */}
      {showRecipeModal && (
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          menuItem={item}
          onUpdate={() => {
            setShowRecipeModal(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}
      
      {/* Pricing Rules Modal */}
      {showPricingModal && (
        <PricingRulesModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          menuItem={item}
          onUpdate={() => {
            setShowPricingModal(false);
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default MenuItemCard;