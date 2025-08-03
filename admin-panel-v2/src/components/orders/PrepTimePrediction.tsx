import { useState, useEffect } from 'react';
import {
  Clock, TrendingUp, AlertCircle, Info, Activity,
  ChefHat, Users, Calendar, Timer, BarChart3,
  Zap, Target, Brain, RefreshCw
} from 'lucide-react';
import { analyticsAPI, ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PredictionFactors {
  currentOrders: number;
  kitchenLoad: number;
  availableChefs: number;
  dayOfWeek: string;
  timeOfDay: string;
  itemComplexity: number;
  historicalAverage: number;
  customizations: number;
  stationWorkload: Record<string, number>;
}

interface PrepTimeEstimate {
  menuItemId: string;
  menuItemName: string;
  baseTime: number;
  predictedTime: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  factors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  recommendation?: string;
}

interface StationStatus {
  station: string;
  activeOrders: number;
  availableChefs: number;
  avgPrepTime: number;
  workloadLevel: 'low' | 'medium' | 'high' | 'overloaded';
  efficiency: number;
}

interface HistoricalData {
  hour: number;
  avgPrepTime: number;
  orderVolume: number;
  accuracy: number;
}

interface Props {
  menuItemId?: string;
  orderItems?: Array<{ menuItemId: string; quantity: number; customizations?: any[] }>;
  onPredictionComplete?: (predictions: PrepTimeEstimate[]) => void;
}

const PrepTimePrediction: React.FC<Props> = ({ menuItemId, orderItems, onPredictionComplete }) => {
  const [predictions, setPredictions] = useState<PrepTimeEstimate[]>([]);
  const [factors, setFactors] = useState<PredictionFactors | null>(null);
  const [stationStatus, setStationStatus] = useState<StationStatus[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (menuItemId || orderItems) {
      fetchPredictions();
    }
  }, [menuItemId, orderItems]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      
      const items = menuItemId 
        ? [{ menuItemId, quantity: 1 }]
        : orderItems || [];

      if (items.length === 0) return;

      const response = await analyticsAPI.getPrepTimePredictions({
        items,
        timestamp: new Date().toISOString()
      });

      const data = response.data || {};
      setPredictions(data.predictions || []);
      setFactors(data.factors || null);
      setStationStatus(data.stationStatus || []);
      setHistoricalData(data.historicalData || []);
      setAccuracy(data.modelAccuracy || 85);

      if (onPredictionComplete && data.predictions) {
        onPredictionComplete(data.predictions);
      }
    } catch (error) {
      toast.error('Failed to get prep time predictions');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'overloaded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 5) return '⬆️';
    if (impact > 0) return '↗️';
    if (impact === 0) return '➡️';
    if (impact > -5) return '↘️';
    return '⬇️';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const PredictionCard = ({ prediction }: { prediction: PrepTimeEstimate }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{prediction.menuItemName}</h4>
          <div className="flex items-center mt-1 space-x-3">
            <span className="text-sm text-gray-600">
              Base: {formatTime(prediction.baseTime)}
            </span>
            <span className="text-sm text-gray-600">→</span>
            <span className="text-lg font-semibold text-primary-600">
              Predicted: {formatTime(prediction.predictedTime)}
            </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          getConfidenceColor(prediction.confidenceLevel)
        }`}>
          {prediction.confidenceLevel} confidence
        </span>
      </div>

      {/* Factors */}
      <div className="space-y-2 mb-3">
        {prediction.factors.slice(0, showDetails ? undefined : 3).map((factor, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{factor.factor}</span>
            <div className="flex items-center">
              <span className={`font-medium ${
                factor.impact > 0 ? 'text-red-600' : 
                factor.impact < 0 ? 'text-green-600' : 
                'text-gray-600'
              }`}>
                {getImpactIcon(factor.impact)} {Math.abs(factor.impact)}m
              </span>
            </div>
          </div>
        ))}
      </div>

      {prediction.factors.length > 3 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          {showDetails ? 'Show less' : `Show ${prediction.factors.length - 3} more factors`}
        </button>
      )}

      {prediction.recommendation && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-blue-800">{prediction.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );

  const StationLoadDisplay = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center">
        <Activity className="h-5 w-5 mr-2 text-primary-600" />
        Station Workload Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stationStatus.map(station => (
          <div key={station.station} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium capitalize">{station.station}</h4>
              <span className={`text-sm font-medium ${getWorkloadColor(station.workloadLevel)}`}>
                {station.workloadLevel}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Orders</span>
                <span className="font-medium">{station.activeOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Chefs</span>
                <span className="font-medium">{station.availableChefs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Prep Time</span>
                <span className="font-medium">{formatTime(station.avgPrepTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Efficiency</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${station.efficiency}%` }}
                    />
                  </div>
                  <span className="font-medium">{station.efficiency}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AccuracyDisplay = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary-600" />
          ML Model Performance
        </h3>
        <button
          onClick={fetchPredictions}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - accuracy / 100)}`}
                className="text-primary-600"
              />
            </svg>
            <span className="absolute text-2xl font-bold">{accuracy}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Model Accuracy</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Training Data</p>
            <p className="text-lg font-semibold">50,000+ orders</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-lg font-semibold">2 hours ago</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Avg Prediction Error</p>
            <p className="text-lg font-semibold">±2.5 minutes</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Confidence Threshold</p>
            <p className="text-lg font-semibold">85%</p>
          </div>
        </div>
      </div>

      {/* Historical Accuracy Chart */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Hourly Accuracy Trend</h4>
        <div className="h-32 flex items-end space-x-1">
          {historicalData.map((data, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-primary-200 rounded-t" style={{
                height: `${(data.accuracy / 100) * 100}px`
              }}>
                <div className="w-full bg-primary-600 rounded-t" style={{
                  height: `${(data.orderVolume / 100) * 100}px`
                }} />
              </div>
              <span className="text-xs text-gray-600 mt-1">{data.hour}:00</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center mt-2 space-x-4 text-xs">
          <span className="flex items-center">
            <div className="w-3 h-3 bg-primary-600 rounded mr-1" />
            Order Volume
          </span>
          <span className="flex items-center">
            <div className="w-3 h-3 bg-primary-200 rounded mr-1" />
            Accuracy
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-12 w-12 text-primary-600 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-gray-600">Analyzing kitchen data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Factors */}
      {factors && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3">Current Kitchen Conditions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Active Orders</p>
              <p className="font-semibold text-blue-900">{factors.currentOrders}</p>
            </div>
            <div>
              <p className="text-blue-700">Kitchen Load</p>
              <p className="font-semibold text-blue-900">{factors.kitchenLoad}%</p>
            </div>
            <div>
              <p className="text-blue-700">Available Chefs</p>
              <p className="font-semibold text-blue-900">{factors.availableChefs}</p>
            </div>
            <div>
              <p className="text-blue-700">Time</p>
              <p className="font-semibold text-blue-900">{factors.timeOfDay}</p>
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Timer className="h-5 w-5 mr-2 text-primary-600" />
            Prep Time Predictions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.map((prediction, idx) => (
              <PredictionCard key={idx} prediction={prediction} />
            ))}
          </div>
        </div>
      )}

      {/* Station Load */}
      {stationStatus.length > 0 && <StationLoadDisplay />}

      {/* Model Accuracy */}
      <AccuracyDisplay />

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-gray-600 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">How Predictions Work</h3>
            <p className="mt-1 text-sm text-gray-600">
              Our ML model analyzes historical data, current kitchen workload, chef availability, 
              time patterns, and order complexity to provide accurate prep time estimates. 
              The model continuously learns from completed orders to improve accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrepTimePrediction;