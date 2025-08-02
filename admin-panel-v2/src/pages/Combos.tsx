import { useState, useEffect } from 'react';
import { Plus, Search, Package2, DollarSign, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { combosAPI, menuAPI } from '../services/api';
import ComboCard from '../components/combos/ComboCard';
import ComboModal from '../components/combos/ComboModal';
import { Combo, ComboMenuItem } from '../types/combo';
import { MenuItem } from '../types/menu';
import toast from 'react-hot-toast';

const Combos = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [showComboModal, setShowComboModal] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [combosRes, menuRes] = await Promise.all([
        combosAPI.getCombos(),
        menuAPI.getItems()
      ]);
      
      setCombos(combosRes.data);
      setMenuItems(menuRes.data.items || menuRes.data);
    } catch (err: any) {
      console.error('Error fetching combos:', err);
      setError(err.response?.data?.error || 'Failed to load combos');
    } finally {
      setLoading(false);
    }
  };

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
      if (selectedCombo) {
        await combosAPI.updateCombo(selectedCombo._id, comboData);
        toast.success('Combo updated successfully');
      } else {
        await combosAPI.createCombo(comboData);
        toast.success('Combo created successfully');
      }
      
      setShowComboModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving combo:', err);
      toast.error(err.response?.data?.error || 'Failed to save combo');
    }
  };

  const handleDeleteCombo = async (combo: Combo) => {
    if (!window.confirm(`Are you sure you want to delete "${combo.name}"?`)) {
      return;
    }

    try {
      await combosAPI.deleteCombo(combo._id);
      toast.success('Combo deleted successfully');
      fetchData();
    } catch (err: any) {
      console.error('Error deleting combo:', err);
      toast.error(err.response?.data?.error || 'Failed to delete combo');
    }
  };

  const handleToggleActive = async (combo: Combo) => {
    try {
      await combosAPI.toggleActive(combo._id);
      toast.success(`Combo ${combo.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (err: any) {
      console.error('Error toggling combo:', err);
      toast.error(err.response?.data?.error || 'Failed to toggle combo status');
    }
  };

  // Filter combos
  const filteredCombos = combos.filter(combo => {
    const matchesSearch = combo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (combo.nameAr && combo.nameAr.includes(searchQuery));
    
    const matchesActive = filterActive === 'all' ||
      (filterActive === 'active' && combo.isActive) ||
      (filterActive === 'inactive' && !combo.isActive);
    
    return matchesSearch && matchesActive;
  });

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
            <h3 className="text-sm font-medium text-red-800">Error loading combos</h3>
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
          <h1 className="text-2xl font-semibold text-gray-900">Combo Meals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage combo meal offers
          </p>
        </div>
        <button
          onClick={handleAddCombo}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Combo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Combos</p>
              <p className="text-2xl font-semibold text-gray-900">{combos.length}</p>
            </div>
            <Package2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Combos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {combos.filter(c => c.isActive).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {combos.reduce((sum, c) => sum + c.totalOrders, 0)}
              </p>
            </div>
            <Package2 className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${combos.reduce((sum, c) => sum + c.totalRevenue, 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
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
              Status
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Combos</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Combos Grid */}
      {filteredCombos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterActive !== 'all' ? 'No combos found' : 'No combos yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterActive !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first combo meal to get started'
            }
          </p>
          {!searchQuery && filterActive === 'all' && (
            <button
              onClick={handleAddCombo}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Combo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCombos.map((combo) => (
            <ComboCard
              key={combo._id}
              combo={combo}
              onEdit={handleEditCombo}
              onDelete={handleDeleteCombo}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Combo Modal */}
      {showComboModal && (
        <ComboModal
          isOpen={showComboModal}
          onClose={() => setShowComboModal(false)}
          combo={selectedCombo}
          menuItems={menuItems}
          onSave={handleSaveCombo}
        />
      )}
    </div>
  );
};

export default Combos;