import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Star,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react';
import { menuAnalyticsAPI } from '../../services/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface ProfitabilityItem {
  _id: string;
  name: string;
  nameAr?: string;
  category: string;
  image?: string;
  price: number;
  cost: number;
  quantitySold: number;
  revenue: number;
  modifierRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  available: boolean;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  category_analysis: 'star' | 'plowhorse' | 'puzzle' | 'dog';
}

interface Summary {
  totalItems: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalQuantitySold: number;
  averageProfitMargin: number;
  categoryBreakdown: {
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
  };
}

const ProfitabilityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProfitabilityItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchProfitabilityData();
  }, [dateRange, selectedCategory, sortBy, sortOrder, limit]);

  const fetchProfitabilityData = async () => {
    try {
      setLoading(true);
      const response = await menuAnalyticsAPI.getProfitability({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        category: selectedCategory,
        sortBy,
        order: sortOrder,
        limit
      });

      if (response.data.success) {
        setItems(response.data.data.items);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching profitability data:', error);
      toast.error('Failed to load profitability data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'star':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'plowhorse':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'puzzle':
        return <AlertCircle className="h-5 w-5 text-purple-500" />;
      case 'dog':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'star':
        return 'Stars';
      case 'plowhorse':
        return 'Plowhorses';
      case 'puzzle':
        return 'Puzzles';
      case 'dog':
        return 'Dogs';
      default:
        return category;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'star':
        return 'High popularity, high profit margin';
      case 'plowhorse':
        return 'High popularity, low profit margin';
      case 'puzzle':
        return 'Low popularity, high profit margin';
      case 'dog':
        return 'Low popularity, low profit margin';
      default:
        return '';
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Item Name', 'Category', 'Price', 'Cost', 'Quantity Sold', 'Revenue', 'Profit', 'Profit Margin %', 'Analysis Category'],
      ...items.map(item => [
        item.name,
        item.category,
        item.price.toFixed(2),
        item.cost.toFixed(2),
        item.quantitySold,
        item.revenue.toFixed(2),
        item.profit.toFixed(2),
        item.profitMargin.toFixed(2),
        getCategoryLabel(item.category_analysis)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profitability-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Profitability Analysis</h2>
          <p className="mt-1 text-sm text-gray-600">
            Analyze menu item performance and profitability
          </p>
        </div>
        <button
          onClick={exportData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${summary.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${summary.totalProfit.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Profit Margin</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.averageProfitMargin.toFixed(1)}%
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items Sold</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.totalQuantitySold.toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Menu Engineering Matrix</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(summary.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  {getCategoryIcon(category.slice(0, -1) as any)}
                  <span className="text-2xl font-semibold">{count}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{getCategoryLabel(category.slice(0, -1))}</p>
                <p className="text-xs text-gray-500">{getCategoryDescription(category.slice(0, -1))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="profit">Profit</option>
              <option value="profitMargin">Profit Margin</option>
              <option value="revenue">Revenue</option>
              <option value="quantitySold">Quantity Sold</option>
              <option value="cost">Cost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Show Top
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
              <option value={0}>All items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margin
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Analysis
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {item.image && (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={item.image}
                        alt={item.name}
                      />
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.nameAr && (
                        <div className="text-sm text-gray-500" dir="rtl">{item.nameAr}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ${item.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ${item.cost.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.quantitySold.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ${item.revenue.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                  <span className={item.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${item.profit.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                  <span className={item.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                    {item.profitMargin.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    {getCategoryIcon(item.category_analysis)}
                    <span className="ml-2 text-sm text-gray-500">
                      {getCategoryLabel(item.category_analysis)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfitabilityDashboard;