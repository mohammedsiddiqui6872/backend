import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { MenuItem, MenuItemInput, Category } from '../../types/menu';
import { compressImage } from '../../utils/imageUtils';
import MenuItemModifiers from './MenuItemModifiers';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItemInput) => Promise<void>;
  item: MenuItem | null;
  categories: Category[];
  isLoading?: boolean;
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item,
  categories,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<MenuItemInput>({
    name: '',
    category: '',
    price: 0,
    cost: 0,
    description: '',
    available: true,
    inStock: true,
    stockQuantity: -1,
    lowStockThreshold: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    prepTime: 15,
    discount: 0,
    allergens: [],
    dietary: [],
    tags: [],
    modifierGroups: []
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('basic');
  const [newAllergen, setNewAllergen] = useState('');
  const [newDietaryTag, setNewDietaryTag] = useState('');
  const [newTag, setNewTag] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
      if (item.image) {
        setImagePreview(item.image);
      }
    } else {
      // Set default category if categories are available
      const defaultCategory = categories.length > 0 ? categories[0].slug : '';
      setFormData({
        name: '',
        category: defaultCategory,
        price: 0,
        cost: 0,
        description: '',
        available: true,
        inStock: true,
        stockQuantity: -1,
        lowStockThreshold: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        prepTime: 15,
        discount: 0,
        allergens: [],
        dietary: [],
        tags: []
      });
      setImagePreview('');
    }
    setImageFile(null);
    setValidationErrors({});
  }, [item, categories, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          // Compress the image if it's too large
          const compressed = await compressImage(file, 1200, 1200, 0.8);
          setImagePreview(compressed);
          setImageFile(null); // We'll use the base64 string instead
        } else {
          // File is small enough, use as is
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try a smaller image.');
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    } else if (!categories.find(cat => cat.slug === formData.category)) {
      errors.category = 'Invalid category selected';
    }
    
    if (formData.price < 0) {
      errors.price = 'Price must be a positive number';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show first error tab
      if (validationErrors.name || validationErrors.category || validationErrors.description) {
        setActiveTab('basic');
      } else if (validationErrors.price) {
        setActiveTab('pricing');
      }
      return;
    }
    
    try {
      const dataToSave = {
        ...formData,
        uploadImage: imagePreview && imagePreview !== item?.image ? imagePreview : undefined
      };
      
      // Remove uploadImage if it's the same as the existing image
      if (item?.image && imagePreview === item.image) {
        delete dataToSave.uploadImage;
      }
      
      await onSave(dataToSave);
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      // Check if it's a validation error from the server
      if (error.response?.data?.errors) {
        const serverErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          if (err.param) {
            serverErrors[err.param] = err.msg;
          }
        });
        setValidationErrors(serverErrors);
        
        // Show appropriate tab based on error
        if (serverErrors.category) {
          setActiveTab('basic');
          alert(`Category error: ${serverErrors.category}. Please select a valid category.`);
        }
      }
    }
  };

  const addAllergen = () => {
    if (newAllergen.trim()) {
      setFormData({
        ...formData,
        allergens: [...(formData.allergens || []), newAllergen.trim()]
      });
      setNewAllergen('');
    }
  };

  const removeAllergen = (index: number) => {
    setFormData({
      ...formData,
      allergens: formData.allergens?.filter((_, i) => i !== index) || []
    });
  };

  const addDietaryTag = () => {
    if (newDietaryTag.trim()) {
      setFormData({
        ...formData,
        dietary: [...(formData.dietary || []), newDietaryTag.trim()]
      });
      setNewDietaryTag('');
    }
  };

  const removeDietaryTag = (index: number) => {
    setFormData({
      ...formData,
      dietary: formData.dietary?.filter((_, i) => i !== index) || []
    });
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index) || []
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {item ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pricing'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pricing & Stock
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'nutrition'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nutrition & Dietary
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'media'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('modifiers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'modifiers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Modifiers
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: '' });
                    }
                  }}
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    validationErrors.name ? 'border-red-500' : ''
                  }`}
                  required
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    if (validationErrors.category) {
                      setValidationErrors({ ...validationErrors, category: '' });
                    }
                  }}
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    validationErrors.category ? 'border-red-500' : ''
                  }`}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                )}
                {categories.length === 0 && (
                  <p className="mt-1 text-sm text-yellow-600">
                    No categories available. Please create a category first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (validationErrors.description) {
                      setValidationErrors({ ...validationErrors, description: '' });
                    }
                  }}
                  rows={3}
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                    validationErrors.description ? 'border-red-500' : ''
                  }`}
                  required
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.prepTime || 15}
                    onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags?.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Stock Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      setFormData({ ...formData, price: parseFloat(e.target.value) });
                      if (validationErrors.price) {
                        setValidationErrors({ ...validationErrors, price: '' });
                      }
                    }}
                    className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                      validationErrors.price ? 'border-red-500' : ''
                    }`}
                    min="0"
                    step="0.01"
                    required
                  />
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost
                  </label>
                  <input
                    type="number"
                    value={formData.cost || 0}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stockQuantity || -1}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  min="-1"
                />
                <p className="mt-1 text-sm text-gray-500">Set to -1 for unlimited stock</p>
              </div>

              {formData.stockQuantity !== -1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      value={formData.lowStockThreshold || 10}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      value={formData.reorderPoint || 20}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.reorderQuantity || 50}
                      onChange={(e) => setFormData({ ...formData, reorderQuantity: parseInt(e.target.value) })}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      min="1"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="available" className="ml-2 text-sm text-gray-700">
                    Available
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="inStock" className="ml-2 text-sm text-gray-700">
                    In Stock
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured || false}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                    Featured Item
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isSpecial"
                    checked={formData.isSpecial || false}
                    onChange={(e) => setFormData({ ...formData, isSpecial: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isSpecial" className="ml-2 text-sm text-gray-700">
                    Special Item
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recommended"
                    checked={formData.recommended || false}
                    onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recommended" className="ml-2 text-sm text-gray-700">
                    Recommended
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Nutrition & Dietary Tab */}
          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={formData.calories || ''}
                    onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || undefined })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={formData.protein || ''}
                    onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || undefined })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={formData.carbs || ''}
                    onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) || undefined })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={formData.fat || ''}
                    onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) || undefined })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergens
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add allergen (e.g., Nuts, Dairy)"
                  />
                  <button
                    type="button"
                    onClick={addAllergen}
                    className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.allergens?.map((allergen, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                      {allergen}
                      <button
                        type="button"
                        onClick={() => removeAllergen(index)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Tags
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newDietaryTag}
                    onChange={(e) => setNewDietaryTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietaryTag())}
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add dietary tag (e.g., Vegan, Gluten-Free)"
                  />
                  <button
                    type="button"
                    onClick={addDietaryTag}
                    className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.dietary?.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeDietaryTag(index)}
                        className="ml-1 text-green-500 hover:text-green-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Image
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="h-32 w-32 rounded-lg object-cover"
                    />
                  )}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview('');
                        setImageFile(null);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Upload a high-quality image of the menu item. Maximum file size: 5MB.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Image Upload Tips:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use high-quality images with good lighting</li>
                  <li>• Square images (1:1 ratio) work best</li>
                  <li>• Images larger than 5MB will be automatically compressed</li>
                  <li>• Supported formats: JPG, PNG, GIF, WebP</li>
                </ul>
              </div>
            </div>
          )}

          {/* Modifiers Tab */}
          {activeTab === 'modifiers' && (
            <div className="space-y-4">
              <MenuItemModifiers
                menuItemId={item?._id}
                modifierGroups={formData.modifierGroups || []}
                onChange={(modifiers) => setFormData({ ...formData, modifierGroups: modifiers })}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || categories.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Update' : 'Create'} Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemModal;