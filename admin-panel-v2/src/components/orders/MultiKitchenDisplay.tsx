import React, { useState, useEffect } from 'react';
import {
  Monitor, Clock, ChefHat, Flame, Salad, IceCream,
  Coffee, Package, Settings, Plus, X, Edit2,
  Trash2, Save, RefreshCw, AlertTriangle, CheckCircle,
  Activity, Users, MapPin, Timer, Eye, Maximize2
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { differenceInMinutes } from 'date-fns';
import KitchenDisplay from './KitchenDisplay';

interface KitchenConfig {
  id: string;
  name: string;
  type: 'main' | 'cold' | 'hot' | 'dessert' | 'beverage' | 'custom';
  stations: string[];
  color: string;
  icon: any;
  isActive: boolean;
  displayOrder: number;
  showUrgentOnly?: boolean;
  maxOrders?: number;
  autoRefreshInterval?: number;
}

interface OrderSummary {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
  urgent: number;
  avgPrepTime: number;
}

const MultiKitchenDisplay = () => {
  const [kitchens, setKitchens] = useState<KitchenConfig[]>([
    {
      id: 'hot-kitchen',
      name: 'Hot Kitchen',
      type: 'hot',
      stations: ['grill', 'main'],
      color: 'orange',
      icon: Flame,
      isActive: true,
      displayOrder: 1,
      autoRefreshInterval: 30
    },
    {
      id: 'cold-kitchen',
      name: 'Cold Kitchen',
      type: 'cold',
      stations: ['salad'],
      color: 'green',
      icon: Salad,
      isActive: true,
      displayOrder: 2,
      autoRefreshInterval: 45
    },
    {
      id: 'dessert-station',
      name: 'Dessert Station',
      type: 'dessert',
      stations: ['dessert'],
      color: 'pink',
      icon: IceCream,
      isActive: true,
      displayOrder: 3,
      autoRefreshInterval: 60
    },
    {
      id: 'beverage-bar',
      name: 'Beverage Bar',
      type: 'beverage',
      stations: ['beverage'],
      color: 'brown',
      icon: Coffee,
      isActive: true,
      displayOrder: 4,
      autoRefreshInterval: 30
    }
  ]);

  const [orderSummaries, setOrderSummaries] = useState<Record<string, OrderSummary>>({});
  const [selectedKitchen, setSelectedKitchen] = useState<string | null>(null);
  const [fullscreenKitchen, setFullscreenKitchen] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<KitchenConfig | null>(null);
  const [gridLayout, setGridLayout] = useState<'2x2' | '1x4' | '2x1'>('2x2');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderSummaries();
    const interval = setInterval(fetchOrderSummaries, 30000); // Update summaries every 30 seconds
    return () => clearInterval(interval);
  }, [kitchens]);

  const fetchOrderSummaries = async () => {
    try {
      const response = await ordersAPI.getOrders({
        status: ['confirmed', 'preparing']
      });
      const orders = response.data || [];

      const summaries: Record<string, OrderSummary> = {};

      kitchens.forEach(kitchen => {
        if (!kitchen.isActive) return;

        const kitchenOrders = orders.filter((order: any) =>
          order.items.some((item: any) =>
            kitchen.stations.includes(item.station || 'main')
          )
        );

        const pendingCount = kitchenOrders.filter((o: any) =>
          o.items.some((i: any) => i.status === 'pending' && kitchen.stations.includes(i.station || 'main'))
        ).length;

        const preparingCount = kitchenOrders.filter((o: any) =>
          o.items.some((i: any) => i.status === 'preparing' && kitchen.stations.includes(i.station || 'main'))
        ).length;

        const readyCount = kitchenOrders.filter((o: any) =>
          o.items.some((i: any) => i.status === 'ready' && kitchen.stations.includes(i.station || 'main'))
        ).length;

        const urgentCount = kitchenOrders.filter((o: any) => {
          const minutesSinceCreated = differenceInMinutes(new Date(), new Date(o.createdAt));
          return minutesSinceCreated > 20;
        }).length;

        summaries[kitchen.id] = {
          total: kitchenOrders.length,
          pending: pendingCount,
          preparing: preparingCount,
          ready: readyCount,
          urgent: urgentCount,
          avgPrepTime: 12.5 // This would be calculated from actual data
        };
      });

      setOrderSummaries(summaries);
    } catch (error) {
      toast.error('Failed to fetch order summaries');
    } finally {
      setLoading(false);
    }
  };

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'hot': return Flame;
      case 'cold': return Salad;
      case 'dessert': return IceCream;
      case 'beverage': return Coffee;
      case 'main': return ChefHat;
      default: return Package;
    }
  };

  const handleAddKitchen = () => {
    const newKitchen: KitchenConfig = {
      id: `kitchen-${Date.now()}`,
      name: 'New Kitchen',
      type: 'custom',
      stations: [],
      color: 'gray',
      icon: Package,
      isActive: false,
      displayOrder: kitchens.length + 1
    };
    setEditingKitchen(newKitchen);
  };

  const handleSaveKitchen = () => {
    if (!editingKitchen) return;

    const exists = kitchens.find(k => k.id === editingKitchen.id);
    if (exists) {
      setKitchens(kitchens.map(k => k.id === editingKitchen.id ? editingKitchen : k));
    } else {
      setKitchens([...kitchens, editingKitchen]);
    }

    setEditingKitchen(null);
    toast.success('Kitchen configuration saved');
  };

  const handleDeleteKitchen = (kitchenId: string) => {
    if (window.confirm('Are you sure you want to delete this kitchen display?')) {
      setKitchens(kitchens.filter(k => k.id !== kitchenId));
      toast.success('Kitchen display removed');
    }
  };

  const toggleKitchenActive = (kitchenId: string) => {
    setKitchens(kitchens.map(k =>
      k.id === kitchenId ? { ...k, isActive: !k.isActive } : k
    ));
  };

  const getGridClass = () => {
    switch (gridLayout) {
      case '2x2': return 'grid-cols-1 md:grid-cols-2';
      case '1x4': return 'grid-cols-1 md:grid-cols-4';
      case '2x1': return 'grid-cols-1';
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  };

  const activeKitchens = kitchens.filter(k => k.isActive).sort((a, b) => a.displayOrder - b.displayOrder);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Full screen view for a single kitchen
  if (fullscreenKitchen) {
    return (
      <div className="fixed inset-0 bg-white z-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {kitchens.find(k => k.id === fullscreenKitchen)?.name}
            </h2>
            <button
              onClick={() => setFullscreenKitchen(null)}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <KitchenDisplay />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <Monitor className="h-6 w-6 mr-2 text-primary-600" />
              Multi-Kitchen Display System
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage multiple kitchen displays for different stations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={gridLayout}
              onChange={(e) => setGridLayout(e.target.value as any)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="2x2">2x2 Grid</option>
              <option value="1x4">1x4 Grid</option>
              <option value="2x1">Single Column</option>
            </select>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </button>
            <button
              onClick={fetchOrderSummaries}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Kitchen Display Configuration</h3>
          
          <div className="space-y-4">
            {kitchens.map(kitchen => (
              <div key={kitchen.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={kitchen.isActive}
                    onChange={() => toggleKitchenActive(kitchen.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                  />
                  {React.createElement(kitchen.icon, { className: `h-5 w-5 text-${kitchen.color}-500 mr-3` })}
                  <div>
                    <h4 className="font-medium">{kitchen.name}</h4>
                    <p className="text-sm text-gray-600">
                      Stations: {kitchen.stations.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingKitchen(kitchen)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteKitchen(kitchen.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddKitchen}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              <Plus className="h-5 w-5 mx-auto mb-1" />
              Add Kitchen Display
            </button>
          </div>
        </div>
      )}

      {/* Kitchen Grid */}
      <div className={`grid ${getGridClass()} gap-6`}>
        {activeKitchens.map(kitchen => {
          const summary = orderSummaries[kitchen.id] || {
            total: 0,
            pending: 0,
            preparing: 0,
            ready: 0,
            urgent: 0,
            avgPrepTime: 0
          };

          return (
            <div key={kitchen.id} className="bg-white rounded-lg shadow">
              {/* Kitchen Header */}
              <div className={`p-4 border-b bg-${kitchen.color}-50 border-t-4 border-${kitchen.color}-500`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {React.createElement(kitchen.icon, { className: `h-6 w-6 text-${kitchen.color}-600 mr-2` })}
                    <h3 className="text-lg font-medium">{kitchen.name}</h3>
                  </div>
                  <button
                    onClick={() => setFullscreenKitchen(kitchen.id)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{summary.preparing}</p>
                    <p className="text-sm text-gray-600">Preparing</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{summary.ready}</p>
                    <p className="text-sm text-gray-600">Ready</p>
                  </div>
                </div>

                {/* Alerts */}
                {summary.urgent > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-red-800">
                        {summary.urgent} urgent orders need attention
                      </span>
                    </div>
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Timer className="h-4 w-4 mr-1" />
                    Avg: {summary.avgPrepTime}m
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Activity className="h-4 w-4 mr-1" />
                    {Math.round((summary.preparing / (summary.total || 1)) * 100)}% active
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => setSelectedKitchen(kitchen.id)}
                  className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  View Kitchen Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kitchen Detail Modal */}
      {selectedKitchen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedKitchen(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {kitchens.find(k => k.id === selectedKitchen)?.name} - Detailed View
                  </h2>
                  <button
                    onClick={() => setSelectedKitchen(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                  <KitchenDisplay />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Kitchen Modal */}
      {editingKitchen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setEditingKitchen(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">
                  {kitchens.find(k => k.id === editingKitchen.id) ? 'Edit' : 'Add'} Kitchen Display
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingKitchen.name}
                      onChange={(e) => setEditingKitchen({ ...editingKitchen, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={editingKitchen.type}
                      onChange={(e) => setEditingKitchen({ 
                        ...editingKitchen, 
                        type: e.target.value as any,
                        icon: getStationIcon(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="hot">Hot Kitchen</option>
                      <option value="cold">Cold Kitchen</option>
                      <option value="dessert">Dessert Station</option>
                      <option value="beverage">Beverage Bar</option>
                      <option value="main">Main Kitchen</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stations
                    </label>
                    <div className="space-y-2">
                      {['grill', 'salad', 'dessert', 'beverage', 'main'].map(station => (
                        <label key={station} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editingKitchen.stations.includes(station)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingKitchen({
                                  ...editingKitchen,
                                  stations: [...editingKitchen.stations, station]
                                });
                              } else {
                                setEditingKitchen({
                                  ...editingKitchen,
                                  stations: editingKitchen.stations.filter(s => s !== station)
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                          />
                          {station.charAt(0).toUpperCase() + station.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto Refresh Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={editingKitchen.autoRefreshInterval || 30}
                      onChange={(e) => setEditingKitchen({ 
                        ...editingKitchen, 
                        autoRefreshInterval: parseInt(e.target.value) 
                      })}
                      min="10"
                      max="300"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setEditingKitchen(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveKitchen}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Save className="h-4 w-4 inline mr-2" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiKitchenDisplay;