import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import { menuAPI } from '../services/api';
import CategoryCard from '../components/menu/CategoryCard';
import CategoryModal from '../components/menu/CategoryModal';
import MenuItemCard from '../components/menu/MenuItemCard';
import MenuItemModal from '../components/menu/MenuItemModal';

interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  slug: string;
  icon: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  description?: string;
  descriptionAr?: string;
}

interface MenuItem {
  _id: string;
  id: number;
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
  rating?: number;
  calories?: number;
  isSpecial?: boolean;
  discount?: number;
  recommended?: boolean;
  featured?: boolean;
}

const Menu = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [priceSort, setPriceSort] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesRes, itemsRes] = await Promise.all([
        menuAPI.getCategories(),
        menuAPI.getItems()
      ]);
      
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data.items || itemsRes.data);
    } catch (err: any) {
      console.error('Error fetching menu data:', err);
      setError(err.response?.data?.error || 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (categoryData: Category) => {
    try {
      setModalLoading(true);
      
      if (selectedCategory) {
        await menuAPI.updateCategory(selectedCategory._id, categoryData);
      } else {
        await menuAPI.addCategory(categoryData);
      }
      
      await fetchData();
      setShowCategoryModal(false);
    } catch (err: any) {
      console.error('Error saving category:', err);
      alert(err.response?.data?.error || 'Failed to save category');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await menuAPI.deleteCategory(category._id);
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting category:', err);
        alert(err.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  const handleToggleCategoryActive = async (category: Category) => {
    try {
      await menuAPI.updateCategory(category._id, {
        ...category,
        isActive: !category.isActive
      });
      await fetchData();
    } catch (err: any) {
      console.error('Error updating category:', err);
      alert('Failed to update category status');
    }
  };

  // Menu item handlers
  const handleAddItem = () => {
    setSelectedItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const handleSaveItem = async (itemData: MenuItem) => {
    try {
      setModalLoading(true);
      
      if (selectedItem) {
        await menuAPI.updateItem(selectedItem._id, itemData);
      } else {
        await menuAPI.addItem(itemData);
      }
      
      await fetchData();
      setShowItemModal(false);
    } catch (err: any) {
      console.error('Error saving item:', err);
      alert(err.response?.data?.error || 'Failed to save menu item');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await menuAPI.deleteItem(item._id);
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting item:', err);
        alert(err.response?.data?.error || 'Failed to delete menu item');
      }
    }
  };

  const handleToggleItemAvailable = async (item: MenuItem) => {
    try {
      await menuAPI.updateItem(item._id, {
        ...item,
        available: !item.available
      });
      await fetchData();
    } catch (err: any) {
      console.error('Error updating item:', err);
      alert('Failed to update item availability');
    }
  };

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || item.category === selectedCategoryFilter;
    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'available' && item.available) ||
                               (availabilityFilter === 'unavailable' && !item.available);
    
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (priceSort === 'asc') return a.price - b.price;
    if (priceSort === 'desc') return b.price - a.price;
    return 0;
  });

  // Get category name helper
  const getCategoryName = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category?.name || slug;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading menu</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Menu Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your restaurant menu items and categories
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button 
            onClick={activeTab === 'items' ? handleAddItem : handleAddCategory}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'items' ? 'Item' : 'Category'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Menu Items ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Categories ({categories.length})
          </button>
        </nav>
      </div>

      {/* Menu Items Tab */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Items</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort by Price
                </label>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Default</option>
                  <option value="asc">Low to High</option>
                  <option value="desc">High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {sortedItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No menu items found</p>
                <button
                  onClick={handleAddItem}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </button>
              </div>
            ) : (
              sortedItems.map((item) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onToggleAvailable={handleToggleItemAvailable}
                  categoryName={getCategoryName(item.category)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No categories found</p>
              <button
                onClick={handleAddCategory}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Category
              </button>
            </div>
          ) : (
            categories
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((category) => (
                <CategoryCard
                  key={category._id}
                  category={category}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                  onToggleActive={handleToggleCategoryActive}
                />
              ))
          )}
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleSaveCategory}
        category={selectedCategory}
        isLoading={modalLoading}
      />

      <MenuItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={handleSaveItem}
        item={selectedItem}
        categories={categories}
        isLoading={modalLoading}
      />
    </div>
  );
};

export default Menu;