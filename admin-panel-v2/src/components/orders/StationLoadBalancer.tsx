import { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle,
  ChefHat, Clock, Flame, Info, RefreshCw,
  Salad, Coffee, IceCream, Zap, Target,
  TrendingUp, Users, BarChart3, Settings
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Station {
  id: string;
  name: string;
  icon: any;
  color: string;
  currentLoad: number;
  maxCapacity: number;
  availableChefs: number;
  activeOrders: number;
  avgPrepTime: number;
  efficiency: number;
  queuedItems: QueuedItem[];
}

interface QueuedItem {
  _id: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  quantity: number;
  station: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedTime: number;
  waitTime: number;
  canReassign: boolean;
}

interface LoadBalancingRule {
  id: string;
  name: string;
  type: 'threshold' | 'efficiency' | 'time' | 'manual';
  enabled: boolean;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=';
    value: number;
  };
  action: {
    type: 'redistribute' | 'alert' | 'block';
    targetStation?: string;
  };
}

interface RebalanceRecommendation {
  item: QueuedItem;
  fromStation: string;
  toStation: string;
  reason: string;
  impact: {
    timeReduction: number;
    loadImprovement: number;
  };
}

const StationLoadBalancer = () => {
  const [stations, setStations] = useState<Station[]>([
    {
      id: 'grill',
      name: 'Grill Station',
      icon: Flame,
      color: 'orange',
      currentLoad: 0,
      maxCapacity: 100,
      availableChefs: 0,
      activeOrders: 0,
      avgPrepTime: 0,
      efficiency: 0,
      queuedItems: []
    },
    {
      id: 'salad',
      name: 'Salad Station',
      icon: Salad,
      color: 'green',
      currentLoad: 0,
      maxCapacity: 100,
      availableChefs: 0,
      activeOrders: 0,
      avgPrepTime: 0,
      efficiency: 0,
      queuedItems: []
    },
    {
      id: 'dessert',
      name: 'Dessert Station',
      icon: IceCream,
      color: 'pink',
      currentLoad: 0,
      maxCapacity: 100,
      availableChefs: 0,
      activeOrders: 0,
      avgPrepTime: 0,
      efficiency: 0,
      queuedItems: []
    },
    {
      id: 'beverage',
      name: 'Beverage Station',
      icon: Coffee,
      color: 'brown',
      currentLoad: 0,
      maxCapacity: 100,
      availableChefs: 0,
      activeOrders: 0,
      avgPrepTime: 0,
      efficiency: 0,
      queuedItems: []
    }
  ]);

  const [rules, setRules] = useState<LoadBalancingRule[]>([
    {
      id: '1',
      name: 'High Load Redistribution',
      type: 'threshold',
      enabled: true,
      condition: {
        metric: 'load',
        operator: '>',
        value: 80
      },
      action: {
        type: 'redistribute'
      }
    },
    {
      id: '2',
      name: 'Efficiency Alert',
      type: 'efficiency',
      enabled: true,
      condition: {
        metric: 'efficiency',
        operator: '<',
        value: 70
      },
      action: {
        type: 'alert'
      }
    }
  ]);

  const [recommendations, setRecommendations] = useState<RebalanceRecommendation[]>([]);
  const [autoBalance, setAutoBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchStationData();
    const interval = setInterval(fetchStationData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoBalance) {
      applyRecommendations();
    }
  }, [recommendations, autoBalance]);

  const fetchStationData = async () => {
    try {
      const response = await analyticsAPI.getStationLoadData();
      const data = response.data || {};
      
      // Update stations with real data
      const updatedStations = stations.map(station => ({
        ...station,
        currentLoad: data.stations?.[station.id]?.load || 0,
        availableChefs: data.stations?.[station.id]?.chefs || 0,
        activeOrders: data.stations?.[station.id]?.orders || 0,
        avgPrepTime: data.stations?.[station.id]?.avgTime || 0,
        efficiency: data.stations?.[station.id]?.efficiency || 0,
        queuedItems: data.stations?.[station.id]?.queue || []
      }));

      setStations(updatedStations);
      generateRecommendations(updatedStations);
      checkRules(updatedStations);
    } catch (error) {
      toast.error('Failed to fetch station data');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (stationData: Station[]) => {
    const newRecommendations: RebalanceRecommendation[] = [];

    stationData.forEach(station => {
      if (station.currentLoad > 80) {
        // Find stations with lower load
        const targetStations = stationData.filter(s => 
          s.id !== station.id && s.currentLoad < 60 && s.availableChefs > 0
        );

        station.queuedItems.forEach(item => {
          if (item.canReassign && targetStations.length > 0) {
            const bestTarget = targetStations.reduce((best, current) => 
              current.currentLoad < best.currentLoad ? current : best
            );

            newRecommendations.push({
              item,
              fromStation: station.id,
              toStation: bestTarget.id,
              reason: `${station.name} is overloaded (${station.currentLoad}%)`,
              impact: {
                timeReduction: Math.round(item.waitTime * 0.3),
                loadImprovement: Math.round((station.currentLoad - bestTarget.currentLoad) / 2)
              }
            });
          }
        });
      }
    });

    setRecommendations(newRecommendations);
  };

  const checkRules = (stationData: Station[]) => {
    rules.forEach(rule => {
      if (!rule.enabled) return;

      stationData.forEach(station => {
        let metricValue = 0;
        switch (rule.condition.metric) {
          case 'load':
            metricValue = station.currentLoad;
            break;
          case 'efficiency':
            metricValue = station.efficiency;
            break;
          case 'time':
            metricValue = station.avgPrepTime;
            break;
        }

        let conditionMet = false;
        switch (rule.condition.operator) {
          case '>':
            conditionMet = metricValue > rule.condition.value;
            break;
          case '<':
            conditionMet = metricValue < rule.condition.value;
            break;
          case '>=':
            conditionMet = metricValue >= rule.condition.value;
            break;
          case '=':
            conditionMet = metricValue === rule.condition.value;
            break;
        }

        if (conditionMet) {
          handleRuleAction(rule, station);
        }
      });
    });
  };

  const handleRuleAction = (rule: LoadBalancingRule, station: Station) => {
    switch (rule.action.type) {
      case 'alert':
        toast.error(`Alert: ${station.name} - ${rule.name}`, {
          duration: 5000,
          icon: '⚠️'
        });
        break;
      case 'redistribute':
        if (autoBalance) {
          // Auto redistribution is handled by recommendations
        }
        break;
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      try {
        // Find the item being moved
        const sourceStation = stations.find(s => s.id === source.droppableId);
        const item = sourceStation?.queuedItems.find(i => i._id === draggableId);
        
        if (!item) return;

        // Call API to reassign item
        await analyticsAPI.reassignStationItem({
          itemId: item._id,
          orderId: item.orderId,
          fromStation: source.droppableId,
          toStation: destination.droppableId
        });

        // Update local state
        const newStations = [...stations];
        const srcStation = newStations.find(s => s.id === source.droppableId);
        const destStation = newStations.find(s => s.id === destination.droppableId);
        
        if (srcStation && destStation) {
          // Remove from source
          const [movedItem] = srcStation.queuedItems.splice(source.index, 1);
          // Add to destination
          destStation.queuedItems.splice(destination.index, 0, {
            ...movedItem,
            station: destination.droppableId
          });
          
          // Update loads
          srcStation.currentLoad = Math.max(0, srcStation.currentLoad - 10);
          destStation.currentLoad = Math.min(100, destStation.currentLoad + 10);
        }

        setStations(newStations);
        toast.success('Item reassigned successfully');
      } catch (error) {
        toast.error('Failed to reassign item');
      }
    }
  };

  const applyRecommendations = async () => {
    if (recommendations.length === 0) return;

    try {
      const reassignments = recommendations.map(rec => ({
        itemId: rec.item._id,
        orderId: rec.item.orderId,
        fromStation: rec.fromStation,
        toStation: rec.toStation
      }));

      await analyticsAPI.batchReassignItems(reassignments);
      toast.success(`${reassignments.length} items rebalanced automatically`);
      
      // Refresh data
      fetchStationData();
    } catch (error) {
      toast.error('Failed to apply rebalancing');
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return 'bg-green-500';
    if (load < 70) return 'bg-yellow-500';
    if (load < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <Activity className="h-6 w-6 mr-2 text-primary-600" />
              Station Load Balancer
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Optimize kitchen workflow with intelligent load distribution
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoBalance}
                onChange={(e) => setAutoBalance(e.target.checked)}
                className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm">Auto-balance</span>
            </label>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={fetchStationData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Load Overview */}
        <div className="grid grid-cols-4 gap-4">
          {stations.map(station => {
            const Icon = station.icon;
            return (
              <div key={station.id} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className={`h-6 w-6 text-${station.color}-500`} />
                  <span className="ml-2 font-medium">{station.name}</span>
                </div>
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${getLoadColor(station.currentLoad)}`}
                    style={{ width: `${station.currentLoad}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {station.currentLoad}% • {station.activeOrders} orders • {station.availableChefs} chefs
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Load Balancing Recommendations
              </h3>
              <div className="mt-2 space-y-2">
                {recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="flex items-center text-sm text-yellow-700">
                    <span>Move "{rec.item.itemName}" from {rec.fromStation} to {rec.toStation}</span>
                    <span className="ml-2 text-xs">
                      (Save {rec.impact.timeReduction}m, improve load by {rec.impact.loadImprovement}%)
                    </span>
                  </div>
                ))}
              </div>
              {!autoBalance && (
                <button
                  onClick={applyRecommendations}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                >
                  Apply Recommendations
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Station Boards */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stations.map(station => {
            const Icon = station.icon;
            return (
              <div key={station.id} className="bg-white rounded-lg shadow">
                <div className={`p-4 border-b bg-${station.color}-50 border-t-4 border-${station.color}-500`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 text-${station.color}-600 mr-2`} />
                      <h3 className="font-medium">{station.name}</h3>
                    </div>
                    <div className="text-sm text-gray-600">
                      {station.efficiency}% eff
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Avg time: {station.avgPrepTime}m
                  </div>
                </div>

                <Droppable droppableId={station.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2 min-h-[200px] max-h-[400px] overflow-y-auto ${
                        snapshot.isDraggingOver ? 'bg-gray-50' : ''
                      }`}
                    >
                      {station.queuedItems.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-8">
                          No items in queue
                        </p>
                      ) : (
                        station.queuedItems.map((item, index) => (
                          <Draggable
                            key={item._id}
                            draggableId={item._id}
                            index={index}
                            isDragDisabled={!item.canReassign}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 p-3 bg-white border rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                                } ${!item.canReassign ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">
                                    {item.quantity}x {item.itemName}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    getPriorityColor(item.priority)
                                  }`}>
                                    {item.priority}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>Order #{item.orderNumber}</span>
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {item.estimatedTime}m
                                  </span>
                                </div>
                                {item.waitTime > 10 && (
                                  <div className="mt-1 text-xs text-red-600">
                                    Waiting: {item.waitTime}m
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Load Balancing Rules</h3>
          <div className="space-y-4">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => {
                      setRules(rules.map(r => 
                        r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                      ));
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                  />
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-gray-600">
                      When {rule.condition.metric} {rule.condition.operator} {rule.condition.value}, 
                      {' '}{rule.action.type}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {rule.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How Load Balancing Works</h3>
            <p className="mt-1 text-sm text-blue-700">
              The system monitors station loads in real-time and suggests redistributing items to optimize 
              preparation times. Enable auto-balance to automatically apply recommendations, or manually 
              drag items between stations. Items marked as "locked" cannot be reassigned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationLoadBalancer;