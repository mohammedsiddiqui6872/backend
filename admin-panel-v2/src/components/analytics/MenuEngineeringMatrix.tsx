import { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  AlertCircle, 
  TrendingDown,
  Info,
  Download
} from 'lucide-react';
import { menuAnalyticsAPI } from '../../services/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface MatrixItem {
  _id: string;
  name: string;
  popularity: number;
  profitability: number;
  revenue: number;
  profit: number;
  recommendations: string[];
}

interface MatrixData {
  stars: MatrixItem[];
  plowhorses: MatrixItem[];
  puzzles: MatrixItem[];
  dogs: MatrixItem[];
}

interface Thresholds {
  popularityThreshold: number;
  profitabilityThreshold: number;
}

const MenuEngineeringMatrix = () => {
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<keyof MatrixData | null>(null);

  useEffect(() => {
    fetchMatrixData();
  }, [dateRange, selectedCategory]);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const response = await menuAnalyticsAPI.getMenuEngineering({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        category: selectedCategory
      });

      if (response.data.success) {
        setMatrixData(response.data.data.matrix);
        setThresholds(response.data.data.thresholds);
      }
    } catch (error) {
      console.error('Error fetching matrix data:', error);
      toast.error('Failed to load menu engineering data');
    } finally {
      setLoading(false);
    }
  };

  const getQuadrantInfo = (quadrant: keyof MatrixData) => {
    switch (quadrant) {
      case 'stars':
        return {
          title: 'Stars',
          description: 'High Popularity + High Profitability',
          icon: <Star className="h-6 w-6 text-yellow-500" />,
          color: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-900',
          strategy: 'Maintain quality, feature prominently, never run out of stock'
        };
      case 'plowhorses':
        return {
          title: 'Plowhorses',
          description: 'High Popularity + Low Profitability',
          icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
          color: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-900',
          strategy: 'Increase prices slightly or reduce costs without affecting quality'
        };
      case 'puzzles':
        return {
          title: 'Puzzles',
          description: 'Low Popularity + High Profitability',
          icon: <AlertCircle className="h-6 w-6 text-purple-500" />,
          color: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-900',
          strategy: 'Promote more, reposition on menu, or rename to increase appeal'
        };
      case 'dogs':
        return {
          title: 'Dogs',
          description: 'Low Popularity + Low Profitability',
          icon: <TrendingDown className="h-6 w-6 text-red-500" />,
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-900',
          strategy: 'Consider removing or replacing with more profitable items'
        };
      default:
        return null;
    }
  };

  const exportRecommendations = () => {
    if (!matrixData) return;

    let content = `Menu Engineering Analysis - ${format(new Date(), 'yyyy-MM-dd')}\n\n`;
    
    (Object.entries(matrixData) as [keyof MatrixData, MatrixItem[]][]).forEach(([quadrant, items]) => {
      const info = getQuadrantInfo(quadrant as keyof MatrixData);
      if (!info) return;
      
      content += `${info.title} (${items.length} items)\n`;
      content += `Strategy: ${info.strategy}\n\n`;
      
      items.forEach((item: MatrixItem) => {
        content += `- ${item.name}\n`;
        content += `  Popularity: ${item.popularity} | Profit Margin: ${item.profitability.toFixed(1)}%\n`;
        content += `  Recommendations:\n`;
        item.recommendations.forEach((rec: string) => {
          content += `    • ${rec}\n`;
        });
        content += '\n';
      });
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `menu-engineering-recommendations-${format(new Date(), 'yyyy-MM-dd')}.txt`;
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

  if (!matrixData) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Menu Engineering Matrix</h2>
          <p className="mt-1 text-sm text-gray-600">
            Categorize menu items based on popularity and profitability
          </p>
        </div>
        <button
          onClick={exportRecommendations}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Recommendations
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="">All Categories</option>
              {/* Categories will be populated dynamically */}
            </select>
          </div>
        </div>
      </div>

      {/* Thresholds Info */}
      {thresholds && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-900">
              Items are categorized based on average values: 
              <span className="font-medium ml-2">
                Popularity threshold: {thresholds.popularityThreshold.toFixed(0)} sales
              </span>
              <span className="font-medium ml-2">
                Profitability threshold: {thresholds.profitabilityThreshold.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(Object.entries(matrixData) as [keyof MatrixData, MatrixItem[]][]).map(([quadrant, items]) => {
          const info = getQuadrantInfo(quadrant);
          if (!info) return null;

          return (
            <div
              key={quadrant}
              className={`rounded-lg border-2 ${info.color} p-6 cursor-pointer transition-all ${
                selectedQuadrant === quadrant ? 'ring-2 ring-offset-2 ring-primary-500' : ''
              }`}
              onClick={() => setSelectedQuadrant(selectedQuadrant === quadrant ? null : quadrant)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center">
                    {info.icon}
                    <h3 className={`text-xl font-semibold ml-2 ${info.textColor}`}>
                      {info.title}
                    </h3>
                    <span className={`ml-3 px-2 py-1 text-sm font-medium rounded-full ${
                      quadrant === 'stars' ? 'bg-yellow-200 text-yellow-800' :
                      quadrant === 'plowhorses' ? 'bg-blue-200 text-blue-800' :
                      quadrant === 'puzzles' ? 'bg-purple-200 text-purple-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {items.length} items
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    Strategy: {info.strategy}
                  </p>
                </div>
              </div>

              {/* Item Preview */}
              <div className="space-y-2">
                {items.slice(0, selectedQuadrant === quadrant ? undefined : 3).map((item, index) => (
                  <div key={item._id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-600">
                          <span>Sold: {item.popularity}</span>
                          <span className="mx-2">•</span>
                          <span>Margin: {item.profitability.toFixed(1)}%</span>
                          <span className="mx-2">•</span>
                          <span>Profit: ${item.profit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedQuadrant === quadrant && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                        {item.recommendations.map((rec, idx) => (
                          <p key={idx} className="text-xs text-gray-600 pl-3">• {rec}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {!selectedQuadrant && items.length > 3 && (
                  <p className="text-sm text-gray-600 text-center py-2">
                    Click to view all {items.length} items
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Visual Matrix</h3>
        <div className="relative h-96 border-2 border-gray-300 rounded-lg">
          {/* Axes */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 text-sm font-medium text-gray-600">
            High Profitability
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-sm font-medium text-gray-600">
            Low Profitability
          </div>
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-20 -rotate-90 text-sm font-medium text-gray-600">
            Low Popularity
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-20 rotate-90 text-sm font-medium text-gray-600">
            High Popularity
          </div>
          
          {/* Quadrants */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="border-r-2 border-b-2 border-gray-300 bg-purple-50 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="font-medium text-purple-900">Puzzles</p>
                <p className="text-sm text-purple-700">{matrixData.puzzles.length} items</p>
              </div>
            </div>
            <div className="border-b-2 border-gray-300 bg-yellow-50 flex items-center justify-center">
              <div className="text-center">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-medium text-yellow-900">Stars</p>
                <p className="text-sm text-yellow-700">{matrixData.stars.length} items</p>
              </div>
            </div>
            <div className="border-r-2 border-gray-300 bg-red-50 flex items-center justify-center">
              <div className="text-center">
                <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-medium text-red-900">Dogs</p>
                <p className="text-sm text-red-700">{matrixData.dogs.length} items</p>
              </div>
            </div>
            <div className="bg-blue-50 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="font-medium text-blue-900">Plowhorses</p>
                <p className="text-sm text-blue-700">{matrixData.plowhorses.length} items</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuEngineeringMatrix;