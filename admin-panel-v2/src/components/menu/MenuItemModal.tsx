import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react';

interface MenuItem {
  _id?: string;
  id?: number;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  cost?: number;
  description: string;
  descriptionAr?: string;
  image?: string;
  images?: string[];
  available: boolean;
  inStock: boolean;
  stockQuantity?: number;
  allergens?: string[];
  dietary?: string[];
  prepTime?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isSpecial?: boolean;
  discount?: number;
  recommended?: boolean;
  featured?: boolean;
  customizations?: any;
  tags?: string[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
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
  const [formData, setFormData] = useState<MenuItem>({
    name: '',
    nameAr: '',
    category: '',
    price: 0,
    cost: 0,
    description: '',
    descriptionAr: '',
    available: true,
    inStock: true,
    stockQuantity: -1,
    prepTime: 15,
    discount: 0,
    allergens: [],
    dietary: [],
    tags: []
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('basic');
  const [newAllergen, setNewAllergen] = useState('');
  const [newDietaryTag, setNewDietaryTag] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (item) {
      setFormData(item);
      if (item.image) {
        setImagePreview(item.image);
      }
    } else {
      setFormData({
        name: '',
        nameAr: '',
        category: categories[0]?.slug || '',
        price: 0,
        cost: 0,
        description: '',
        descriptionAr: '',
        available: true,
        inStock: true,
        stockQuantity: -1,
        prepTime: 15,
        discount: 0,
        allergens: [],
        dietary: [],
        tags: []
      });
      setImagePreview('');
    }
    setImageFile(null);
  }, [item, categories]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      uploadImage: imageFile ? imagePreview.split(',')[1] : undefined
    };
    
    onSave(dataToSave);
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
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr || ''}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English) *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Arabic)
                </label>
                <textarea
                  value={formData.descriptionAr || ''}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  dir="rtl"
                />
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
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                    step="0.01"
                    required
                  />
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
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Additional image gallery functionality coming soon. You'll be able to upload multiple images for each menu item.
                </p>
              </div>
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
              disabled={isLoading}
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