import { useState, useEffect } from 'react';
import {
  Calendar, Clock, TrendingUp, MapPin, Activity,
  Filter, Download, Info, AlertCircle, Package,
  DollarSign, Users, ChefHat, BarChart3
} from 'lucide-react';
import { ordersAPI, analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';

interface HeatMapData {
  hour: number;
  day: number;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  peakItems: string[];
}

interface DayData {
  date: Date;
  dayName: string;
  totalOrders: number;
  totalRevenue: number;
  peakHour: number;
  hourlyData: HourlyData[];
}

interface HourlyData {
  hour: number;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  topItems: Array<{
    name: string;
    quantity: number;
  }>;
}

interface TableHeatMap {
  tableNumber: string;
  section?: string;
  totalOrders: number;
  totalRevenue: number;
  avgTurnoverTime: number;
  utilization: number;
  peakTimes: string[];
}

interface MenuItemHeatMap {
  itemId: string;
  itemName: string;
  category: string;
  totalOrders: number;
  totalQuantity: number;
  revenue: number;
  popularTimes: string[];
  trend: 'up' | 'down' | 'stable';
}

const OrderHeatMap = () => {
  const [view, setView] = useState<'hourly' | 'daily' | 'tables' | 'items'>('hourly');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');
  const [heatMapData, setHeatMapData] = useState<HeatMapData[]>([]);
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [tableData, setTableData] = useState<TableHeatMap[]>([]);
  const [itemData, setItemData] = useState<MenuItemHeatMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<HeatMapData | null>(null);
  const [maxValue, setMaxValue] = useState(0);

  useEffect(() => {
    fetchHeatMapData();
  }, [view, dateRange]);

  const fetchHeatMapData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = dateRange === 'week' 
        ? startOfWeek(now) 
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = dateRange === 'week'
        ? endOfWeek(now)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const response = await analyticsAPI.getHeatMapData({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view
      });

      const data = response.data || {};

      switch (view) {
        case 'hourly':
          processHourlyData(data.hourlyData || []);
          break;
        case 'daily':
          processDailyData(data.dailyData || []);
          break;
        case 'tables':
          setTableData(data.tableData || []);
          break;
        case 'items':
          setItemData(data.itemData || []);
          break;
      }
    } catch (error) {
      toast.error('Failed to load heat map data');
    } finally {
      setLoading(false);
    }
  };

  const processHourlyData = (data: any[]) => {
    const processedData: HeatMapData[] = [];
    let max = 0;

    // Create a 7x24 grid (days x hours)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const dataPoint = data.find(d => d.day === day && d.hour === hour) || {
          hour,
          day,
          orderCount: 0,
          revenue: 0,
          avgOrderValue: 0,
          peakItems: []
        };
        
        processedData.push(dataPoint);
        max = Math.max(max, dataPoint.orderCount);
      }
    }

    setHeatMapData(processedData);
    setMaxValue(max);
  };

  const processDailyData = (data: any[]) => {
    const days = dateRange === 'week' 
      ? eachDayOfInterval({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })
      : eachDayOfInterval({ 
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        });

    const processedDays: DayData[] = days.map(date => {
      const dayData = data.find(d => 
        format(new Date(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );

      return {
        date,
        dayName: format(date, 'EEE'),
        totalOrders: dayData?.totalOrders || 0,
        totalRevenue: dayData?.totalRevenue || 0,
        peakHour: dayData?.peakHour || 0,
        hourlyData: dayData?.hourlyData || []
      };
    });

    setDayData(processedDays);
  };

  const getHeatColor = (value: number, max: number) => {
    if (max === 0) return 'bg-gray-100';
    const intensity = value / max;
    
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 0.2) return 'bg-blue-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-300';
    if (intensity < 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const getTableUtilizationColor = (utilization: number) => {
    if (utilization < 30) return 'bg-red-100 text-red-800';
    if (utilization < 50) return 'bg-yellow-100 text-yellow-800';
    if (utilization < 70) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const HourlyHeatMap = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Order Activity Heat Map</h3>
        
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-16" /> {/* Empty space for day labels */}
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center text-xs text-gray-600">
                  {hour.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Heat map grid */}
            {days.map((day, dayIndex) => (
              <div key={day} className="flex mb-1">
                <div className="w-16 text-sm text-gray-600 flex items-center">
                  {day}
                </div>
                {hours.map(hour => {
                  const data = heatMapData.find(d => d.day === dayIndex && d.hour === hour);
                  if (!data) return null;

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`flex-1 h-8 mx-0.5 rounded cursor-pointer transition-all hover:ring-2 hover:ring-primary-500 ${
                        getHeatColor(data.orderCount, maxValue)
                      }`}
                      onClick={() => setSelectedCell(data)}
                      title={`${data.orderCount} orders`}
                    />
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Less</span>
                <div className="flex space-x-1">
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded ${
                        intensity === 0 ? 'bg-gray-100' :
                        intensity < 0.2 ? 'bg-blue-100' :
                        intensity < 0.4 ? 'bg-blue-200' :
                        intensity < 0.6 ? 'bg-blue-300' :
                        intensity < 0.8 ? 'bg-blue-400' :
                        'bg-blue-500'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">More</span>
              </div>
              <div className="text-sm text-gray-600">
                Max: {maxValue} orders/hour
              </div>
            </div>
          </div>
        </div>

        {/* Selected cell details */}
        {selectedCell && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="font-medium">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedCell.day]} {selectedCell.hour}:00
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Orders</p>
                <p className="font-medium">{selectedCell.orderCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="font-medium">AED {selectedCell.revenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Order</p>
                <p className="font-medium">AED {selectedCell.avgOrderValue.toFixed(2)}</p>
              </div>
            </div>
            {selectedCell.peakItems.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-1">Popular Items</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCell.peakItems.slice(0, 5).map((item, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white rounded text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TableHeatMap = () => {
    const maxRevenue = Math.max(...tableData.map(t => t.totalRevenue), 1);

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Table Performance Heat Map</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tableData.map(table => (
            <div
              key={table.tableNumber}
              className="relative group cursor-pointer"
            >
              <div
                className={`p-4 rounded-lg text-center transition-all hover:shadow-lg ${
                  getHeatColor(table.totalRevenue, maxRevenue)
                }`}
              >
                <h4 className="font-medium text-lg">Table {table.tableNumber}</h4>
                {table.section && (
                  <p className="text-xs text-gray-600">{table.section}</p>
                )}
                <p className="text-sm font-medium mt-2">
                  {table.totalOrders} orders
                </p>
                <p className="text-xs text-gray-600">
                  AED {table.totalRevenue.toFixed(0)}
                </p>
              </div>
              
              {/* Utilization badge */}
              <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-medium ${
                getTableUtilizationColor(table.utilization)
              }`}>
                {table.utilization}%
              </div>

              {/* Hover details */}
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 text-white p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="text-xs mb-1">Avg Turnover: {table.avgTurnoverTime}m</p>
                <p className="text-xs">Peak: {table.peakTimes.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tables Revenue</p>
                <p className="text-2xl font-bold">
                  AED {tableData.reduce((sum, t) => sum + t.totalRevenue, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Utilization</p>
                <p className="text-2xl font-bold">
                  {(tableData.reduce((sum, t) => sum + t.utilization, 0) / tableData.length).toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Performing Table</p>
                <p className="text-2xl font-bold">
                  Table {tableData.sort((a, b) => b.totalRevenue - a.totalRevenue)[0]?.tableNumber || '-'}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MenuItemHeatMap = () => {
    const categories = [...new Set(itemData.map(item => item.category))];

    return (
      <div className="space-y-6">
        {categories.map(category => {
          const categoryItems = itemData.filter(item => item.category === category);
          const maxQuantity = Math.max(...categoryItems.map(i => i.totalQuantity), 1);

          return (
            <div key={category} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">{category}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryItems.map(item => (
                  <div
                    key={item.itemId}
                    className={`p-4 rounded-lg border-2 ${
                      getHeatColor(item.totalQuantity, maxQuantity)
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.itemName}</h4>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">Orders</p>
                            <p className="font-medium">{item.totalOrders}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Quantity</p>
                            <p className="font-medium">{item.totalQuantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Revenue</p>
                            <p className="font-medium">AED {item.revenue.toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Trend</p>
                            <div className="flex items-center">
                              {item.trend === 'up' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : item.trend === 'down' ? (
                                <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.popularTimes.length > 0 && (
                          <p className="text-xs text-gray-600 mt-2">
                            Peak: {item.popularTimes.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <Activity className="h-6 w-6 mr-2 text-primary-600" />
              Analytics Heat Maps
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Visualize patterns and trends in your restaurant data
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as any)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="hourly">Hourly Activity</option>
              <option value="tables">Table Performance</option>
              <option value="items">Menu Items</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Heat Map Content */}
      {view === 'hourly' && <HourlyHeatMap />}
      {view === 'tables' && <TableHeatMap />}
      {view === 'items' && <MenuItemHeatMap />}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How to use heat maps</h3>
            <p className="mt-1 text-sm text-blue-700">
              Heat maps help identify patterns in your restaurant operations. Darker colors indicate higher activity or values.
              Use these insights to optimize staffing, table assignments, and menu planning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHeatMap;