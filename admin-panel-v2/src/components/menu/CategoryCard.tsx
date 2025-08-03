import { useState } from 'react';
import { Edit2, Trash2, MoreVertical, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Category } from '../../types/menu';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleActive: (category: Category) => void;
  isDragging?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  isDragging = false
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border ${
        isDragging ? 'opacity-50' : ''
      } ${category.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="cursor-move">
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            
            {category.image ? (
              <img 
                src={category.image} 
                alt={category.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {category.name}
                </h3>
                {!category.isActive && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              
              
              {category.description && (
                <p className="text-sm text-gray-500 mt-2">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                <span>Slug: {category.slug}</span>
                <span>Order: {category.displayOrder}</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
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
                      onEdit(category);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => {
                      onToggleActive(category);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <hr className="my-1" />
                  
                  <button
                    onClick={() => {
                      onDelete(category);
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
      </div>
    </div>
  );
};

export default CategoryCard;