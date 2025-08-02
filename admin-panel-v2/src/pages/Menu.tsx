import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Upload, Loader2, AlertCircle, Package2, Settings, BarChart3, Globe } from 'lucide-react';
import { menuAPI, combosAPI, modifiersAPI, channelsAPI } from '../services/api';
import CategoryCard from '../components/menu/CategoryCard';
import CategoryModal from '../components/menu/CategoryModal';
import MenuItemCard from '../components/menu/MenuItemCard';
import MenuItemModal from '../components/menu/MenuItemModal';
import ImportExportModal from '../components/menu/ImportExportModal';
import ComboCard from '../components/combos/ComboCard';
import ComboModal from '../components/combos/ComboModal';
import ModifierGroupModal from '../components/modifiers/ModifierGroupModal';
import ModifierGroupCard from '../components/modifiers/ModifierGroupCard';
import ProfitabilityDashboard from '../components/analytics/ProfitabilityDashboard';
import SalesVelocityTracker from '../components/analytics/SalesVelocityTracker';
import MenuEngineeringMatrix from '../components/analytics/MenuEngineeringMatrix';
import ChannelCard from '../components/channels/ChannelCard';
import ChannelModal from '../components/channels/ChannelModal';
import SchedulesTab from '../components/menu/SchedulesTab';
import { Category, MenuItem, CategoryInput, MenuItemInput } from '../types/menu';
import { Combo } from '../types/combo';
import { ModifierGroup } from '../types/modifiers';
import { MenuChannel } from '../types/channel';
import toast from 'react-hot-toast';
import { Calendar } from 'lucide-react';

const Menu = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'profitability' | 'velocity' | 'matrix'>('profitability');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [channels, setChannels] = useState<MenuChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<ModifierGroup | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<MenuChannel | null>(null);
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
      
      const [categoriesRes, itemsRes, combosRes, modifiersRes, channelsRes] = await Promise.all([
        menuAPI.getCategories(),
        menuAPI.getItems(),
        combosAPI.getCombos(),
        modifiersAPI.getModifierGroups(),
        channelsAPI.getChannels()
      ]);
      
      console.log('Menu API Response:', itemsRes.data);
      console.log('Sample menu item:', itemsRes.data.items?.[0] || itemsRes.data[0]);
      console.log('Items with images:', (itemsRes.data.items || itemsRes.data).filter((item: MenuItem) => item.image));
      
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data.items || itemsRes.data);
      setCombos(combosRes.data.combos || combosRes.data || []);
      setModifierGroups(modifiersRes.data.data || modifiersRes.data || []);
      setChannels(channelsRes.data.data || channelsRes.data || []);
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

  const handleSaveCategory = async (categoryData: CategoryInput) => {
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

  const handleSaveItem = async (itemData: MenuItemInput) => {
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

  // Combo handlers
  const handleAddCombo = () => {
    setSelectedCombo(null);
    setShowComboModal(true);
  };

  const handleEditCombo = (combo: Combo) => {
    setSelectedCombo(combo);
    setShowComboModal(true);
  };

  const handleSaveCombo = async (comboData: any) => {
    try {
      setModalLoading(true);
      
      if (selectedCombo) {
        await combosAPI.updateCombo(selectedCombo._id, comboData);
        toast.success('Combo updated successfully');
      } else {
        await combosAPI.createCombo(comboData);
        toast.success('Combo created successfully');
      }
      
      await fetchData();
      setShowComboModal(false);
    } catch (err: any) {
      console.error('Error saving combo:', err);
      toast.error(err.response?.data?.error || 'Failed to save combo');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCombo = async (combo: Combo) => {
    if (window.confirm(`Are you sure you want to delete "${combo.name}"?`)) {
      try {
        await combosAPI.deleteCombo(combo._id);
        toast.success('Combo deleted successfully');
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting combo:', err);
        toast.error(err.response?.data?.error || 'Failed to delete combo');
      }
    }
  };

  const handleToggleComboActive = async (combo: Combo) => {
    try {
      await combosAPI.updateCombo(combo._id, {
        ...combo,
        isActive: !combo.isActive
      });
      toast.success(`Combo ${combo.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating combo:', err);
      toast.error('Failed to update combo status');
    }
  };

  // Modifier handlers
  const handleAddModifier = () => {
    setSelectedModifier(null);
    setShowModifierModal(true);
  };

  // Channel handlers
  const handleAddChannel = () => {
    setSelectedChannel(null);
    setShowChannelModal(true);
  };

  const handleEditChannel = (channel: MenuChannel) => {
    setSelectedChannel(channel);
    setShowChannelModal(true);
  };

  const handleSaveChannel = async (channelData: any) => {
    try {
      setModalLoading(true);
      
      if (selectedChannel) {
        await channelsAPI.updateChannel(selectedChannel._id, channelData);
        toast.success('Channel updated successfully');
      } else {
        await channelsAPI.createChannel(channelData);
        toast.success('Channel created successfully');
      }
      
      await fetchData();
      setShowChannelModal(false);
    } catch (err: any) {
      console.error('Error saving channel:', err);
      toast.error(err.response?.data?.error || 'Failed to save channel');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteChannel = async (channel: MenuChannel) => {
    if (window.confirm(`Are you sure you want to delete "${channel.displayName}"?`)) {
      try {
        await channelsAPI.deleteChannel(channel._id);
        toast.success('Channel deleted successfully');
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting channel:', err);
        toast.error(err.response?.data?.error || 'Failed to delete channel');
      }
    }
  };

  const handleToggleChannelActive = async (channel: MenuChannel) => {
    try {
      await channelsAPI.updateChannel(channel._id, {
        ...channel,
        isActive: !channel.isActive
      });
      toast.success(`Channel ${channel.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating channel:', err);
      toast.error('Failed to update channel status');
    }
  };

  const handleEditModifier = (modifier: ModifierGroup) => {
    setSelectedModifier(modifier);
    setShowModifierModal(true);
  };

  const handleSaveModifier = async (modifierData: Partial<ModifierGroup>) => {
    try {
      setModalLoading(true);
      
      if (selectedModifier) {
        await modifiersAPI.updateModifierGroup(selectedModifier._id, modifierData);
        toast.success('Modifier group updated successfully');
      } else {
        await modifiersAPI.createModifierGroup(modifierData);
        toast.success('Modifier group created successfully');
      }
      
      await fetchData();
      setShowModifierModal(false);
    } catch (err: any) {
      console.error('Error saving modifier group:', err);
      toast.error(err.response?.data?.error || 'Failed to save modifier group');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteModifier = async (modifier: ModifierGroup) => {
    if (window.confirm(`Are you sure you want to delete "${modifier.name}"?`)) {
      try {
        await modifiersAPI.deleteModifierGroup(modifier._id);
        toast.success('Modifier group deleted successfully');
        await fetchData();
      } catch (err: any) {
        console.error('Error deleting modifier group:', err);
        toast.error(err.response?.data?.error || 'Failed to delete modifier group');
      }
    }
  };

  const handleToggleModifierActive = async (modifier: ModifierGroup) => {
    try {
      await modifiersAPI.updateModifierGroup(modifier._id, {
        ...modifier,
        isActive: !modifier.isActive
      });
      toast.success(`Modifier group ${modifier.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating modifier group:', err);
      toast.error('Failed to update modifier group status');
    }
  };

  // Import/Export handlers
  const handleImport = async (data: any, type: 'categories' | 'items', format: 'csv' | 'json' | 'zip') => {
    try {
      setModalLoading(true);
      
      if (format === 'zip') {
        // Handle ZIP file upload
        const formData = new FormData();
        formData.append('file', data);
        formData.append('type', type);
        
        await menuAPI.bulkImportZip(formData);
      } else {
        // Handle CSV/JSON data
        if (type === 'categories') {
          await menuAPI.bulkImportCategories(data, format);
        } else {
          await menuAPI.bulkImportItems(data, format);
        }
      }
      
      await fetchData();
      setShowImportExportModal(false);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Import failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleExport = async (type: 'categories' | 'items', format: 'csv' | 'json') => {
    try {
      const response = type === 'categories' 
        ? await menuAPI.exportCategories(format)
        : await menuAPI.exportItems(format);
      
      // Create download link
      const blob = new Blob([format === 'csv' ? response.data : JSON.stringify(response.data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Export failed');
    }
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
          <button 
            onClick={() => setShowImportExportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import/Export
          </button>
          {activeTab !== 'analytics' && activeTab !== 'schedules' && (
            <button 
              onClick={() => {
                if (activeTab === 'items') handleAddItem();
                else if (activeTab === 'categories') handleAddCategory();
                else if (activeTab === 'combos') handleAddCombo();
                else if (activeTab === 'modifiers') handleAddModifier();
                else if (activeTab === 'channels') handleAddChannel();
                else if (activeTab === 'schedules') toast('Use the Add Schedule button in the Schedules tab', { icon: 'ℹ️' });
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {activeTab === 'items' ? 'Item' : activeTab === 'categories' ? 'Category' : activeTab === 'combos' ? 'Combo' : activeTab === 'modifiers' ? 'Modifier Group' : activeTab === 'channels' ? 'Channel' : 'Schedule'}
            </button>
          )}
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
          <button
            onClick={() => setActiveTab('combos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'combos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Combos ({combos.length})
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
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'channels'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="h-4 w-4 mr-1" />
            Channels ({channels.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'schedules'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
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
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="pl-3 pr-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  onUpdate={fetchData}
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

      {/* Combos Tab */}
      {activeTab === 'combos' && (
        <div className="space-y-4">
          {/* Search and Filter for Combos */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Combos
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search combos..."
                    className="pl-3 pr-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
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
                  <option value="all">All Combos</option>
                  <option value="available">Active</option>
                  <option value="unavailable">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort by
                </label>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Default</option>
                  <option value="asc">Price: Low to High</option>
                  <option value="desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Combos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No combos found</p>
                <button
                  onClick={handleAddCombo}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Combo
                </button>
              </div>
            ) : (
              combos
                .filter(combo => {
                  const matchesSearch = combo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                       combo.description?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesAvailability = availabilityFilter === 'all' ||
                                             (availabilityFilter === 'available' && combo.isActive) ||
                                             (availabilityFilter === 'unavailable' && !combo.isActive);
                  return matchesSearch && matchesAvailability;
                })
                .sort((a, b) => {
                  if (priceSort === 'asc') return a.price - b.price;
                  if (priceSort === 'desc') return b.price - a.price;
                  return 0;
                })
                .map((combo) => (
                  <ComboCard
                    key={combo._id}
                    combo={combo}
                    onEdit={handleEditCombo}
                    onDelete={handleDeleteCombo}
                    onToggleActive={handleToggleComboActive}
                  />
                ))
            )}
          </div>
        </div>
      )}

      {/* Modifiers Tab */}
      {activeTab === 'modifiers' && (
        <div className="space-y-4">
          {/* Search and Filter for Modifiers */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Modifiers
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search modifier groups..."
                    className="pl-3 pr-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="single">Single Selection</option>
                  <option value="multiple">Multiple Selection</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modifiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modifierGroups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No modifier groups found</p>
                <button
                  onClick={handleAddModifier}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Modifier Group
                </button>
              </div>
            ) : (
              modifierGroups
                .filter(modifier => {
                  const matchesSearch = modifier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                       modifier.description?.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesType = availabilityFilter === 'all' || modifier.type === availabilityFilter;
                  const matchesStatus = priceSort === '' || 
                                       (priceSort === 'active' && modifier.isActive) ||
                                       (priceSort === 'inactive' && !modifier.isActive);
                  return matchesSearch && matchesType && matchesStatus;
                })
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((modifier) => (
                  <ModifierGroupCard
                    key={modifier._id}
                    modifierGroup={modifier}
                    onEdit={handleEditModifier}
                    onDelete={handleDeleteModifier}
                    onToggleActive={handleToggleModifierActive}
                  />
                ))
            )}
          </div>
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          {channels.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No channels configured</p>
              <button
                onClick={handleAddChannel}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Channel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((channel) => (
                  <ChannelCard
                    key={channel._id}
                    channel={channel}
                    onEdit={handleEditChannel}
                    onDelete={handleDeleteChannel}
                    onToggleActive={handleToggleChannelActive}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <SchedulesTab 
          menuItems={menuItems}
          modifierGroups={modifierGroups}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Sub-tabs */}
          <div className="bg-white rounded-lg shadow p-1">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveAnalyticsTab('profitability')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeAnalyticsTab === 'profitability'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Profitability Analysis
              </button>
              <button
                onClick={() => setActiveAnalyticsTab('velocity')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeAnalyticsTab === 'velocity'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Sales Velocity
              </button>
              <button
                onClick={() => setActiveAnalyticsTab('matrix')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeAnalyticsTab === 'matrix'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Menu Engineering
              </button>
            </nav>
          </div>

          {/* Analytics Content */}
          {activeAnalyticsTab === 'profitability' && <ProfitabilityDashboard />}
          {activeAnalyticsTab === 'velocity' && <SalesVelocityTracker />}
          {activeAnalyticsTab === 'matrix' && <MenuEngineeringMatrix />}
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

      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onImport={handleImport}
        onExport={handleExport}
        type={activeTab === 'items' ? 'items' : 'categories'}
      />

      {showComboModal && (
        <ComboModal
          isOpen={showComboModal}
          onClose={() => {
            setShowComboModal(false);
            setSelectedCombo(null);
          }}
          combo={selectedCombo}
          menuItems={menuItems}
          onSave={handleSaveCombo}
        />
      )}

      {showModifierModal && (
        <ModifierGroupModal
          isOpen={showModifierModal}
          onClose={() => {
            setShowModifierModal(false);
            setSelectedModifier(null);
          }}
          modifierGroup={selectedModifier}
          onSave={handleSaveModifier}
        />
      )}

      {showChannelModal && (
        <ChannelModal
          isOpen={showChannelModal}
          onClose={() => {
            setShowChannelModal(false);
            setSelectedChannel(null);
          }}
          channel={selectedChannel}
          onSave={handleSaveChannel}
        />
      )}
    </div>
  );
};

export default Menu;