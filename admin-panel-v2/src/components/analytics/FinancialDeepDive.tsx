import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Calculator,
  PieChart as PieChartIcon, BarChart3, FileText, Download,
  Calendar, Filter, ChevronRight, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Info
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Treemap,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

interface PLStatement {
  category: string;
  subcategories: {
    name: string;
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    variance: number;
  }[];
  total: number;
  percentageOfRevenue: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  subcategories?: {
    name: string;
    amount: number;
    percentage: number;
  }[];
  color: string;
}

interface ROIMetric {
  id: string;
  name: string;
  investment: number;
  returns: number;
  roi: number;
  paybackPeriod: string;
  status: 'excellent' | 'good' | 'average' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
}

interface CashFlow {
  date: string;
  inflow: number;
  outflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

interface FinancialRatio {
  name: string;
  value: number;
  benchmark: number;
  status: 'above' | 'at' | 'below';
  description: string;
}

const FinancialDeepDive: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [plStatement, setPlStatement] = useState<PLStatement[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [roiMetrics, setRoiMetrics] = useState<ROIMetric[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow[]>([]);
  const [financialRatios, setFinancialRatios] = useState<FinancialRatio[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<any>(null);

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [plRes, costRes, roiRes, cashFlowRes, ratiosRes, summaryRes] = await Promise.all([
        analyticsAPI.getPLStatement({ range: dateRange }),
        analyticsAPI.getCostBreakdown({ range: dateRange }),
        analyticsAPI.getROIMetrics({ range: dateRange }),
        analyticsAPI.getCashFlow({ range: dateRange }),
        analyticsAPI.getFinancialRatios({ range: dateRange }),
        analyticsAPI.getFinancialSummary({ range: dateRange })
      ]);

      setPlStatement(plRes.data.statement || mockPLStatement());
      setCostBreakdown(costRes.data.breakdown || mockCostBreakdown());
      setRoiMetrics(roiRes.data.metrics || mockROIMetrics());
      setCashFlow(cashFlowRes.data.cashFlow || mockCashFlow());
      setFinancialRatios(ratiosRes.data.ratios || mockFinancialRatios());
      setSummaryMetrics(summaryRes.data || mockSummaryMetrics());
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      // Use mock data as fallback
      setPlStatement(mockPLStatement());
      setCostBreakdown(mockCostBreakdown());
      setRoiMetrics(mockROIMetrics());
      setCashFlow(mockCashFlow());
      setFinancialRatios(mockFinancialRatios());
      setSummaryMetrics(mockSummaryMetrics());
    }
    setLoading(false);
  };

  // Mock data generators
  const mockPLStatement = (): PLStatement[] => [
    {
      category: 'Revenue',
      subcategories: [
        { name: 'Food Sales', amount: 285000, percentage: 75, trend: 'up', variance: 12 },
        { name: 'Beverage Sales', amount: 85000, percentage: 22, trend: 'up', variance: 8 },
        { name: 'Delivery Fees', amount: 12000, percentage: 3, trend: 'stable', variance: 0 }
      ],
      total: 382000,
      percentageOfRevenue: 100
    },
    {
      category: 'Cost of Goods Sold',
      subcategories: [
        { name: 'Food Costs', amount: 95000, percentage: 68, trend: 'up', variance: -5 },
        { name: 'Beverage Costs', amount: 25000, percentage: 18, trend: 'stable', variance: -2 },
        { name: 'Packaging', amount: 8000, percentage: 6, trend: 'down', variance: 3 },
        { name: 'Other COGS', amount: 12000, percentage: 8, trend: 'stable', variance: 0 }
      ],
      total: 140000,
      percentageOfRevenue: 36.6
    },
    {
      category: 'Operating Expenses',
      subcategories: [
        { name: 'Labor Costs', amount: 95000, percentage: 52, trend: 'stable', variance: -1 },
        { name: 'Rent', amount: 35000, percentage: 19, trend: 'stable', variance: 0 },
        { name: 'Utilities', amount: 12000, percentage: 7, trend: 'up', variance: -8 },
        { name: 'Marketing', amount: 15000, percentage: 8, trend: 'up', variance: 15 },
        { name: 'Other OpEx', amount: 25000, percentage: 14, trend: 'down', variance: 5 }
      ],
      total: 182000,
      percentageOfRevenue: 47.6
    }
  ];

  const mockCostBreakdown = (): CostBreakdown[] => [
    {
      category: 'Food & Beverage',
      amount: 120000,
      percentage: 35,
      color: '#3B82F6',
      subcategories: [
        { name: 'Proteins', amount: 45000, percentage: 37.5 },
        { name: 'Vegetables', amount: 25000, percentage: 20.8 },
        { name: 'Dairy', amount: 20000, percentage: 16.7 },
        { name: 'Beverages', amount: 20000, percentage: 16.7 },
        { name: 'Others', amount: 10000, percentage: 8.3 }
      ]
    },
    {
      category: 'Labor',
      amount: 95000,
      percentage: 28,
      color: '#10B981',
      subcategories: [
        { name: 'Kitchen Staff', amount: 40000, percentage: 42.1 },
        { name: 'Service Staff', amount: 30000, percentage: 31.6 },
        { name: 'Management', amount: 20000, percentage: 21.1 },
        { name: 'Support Staff', amount: 5000, percentage: 5.2 }
      ]
    },
    {
      category: 'Overhead',
      amount: 72000,
      percentage: 21,
      color: '#F59E0B',
      subcategories: [
        { name: 'Rent', amount: 35000, percentage: 48.6 },
        { name: 'Utilities', amount: 12000, percentage: 16.7 },
        { name: 'Insurance', amount: 8000, percentage: 11.1 },
        { name: 'Maintenance', amount: 10000, percentage: 13.9 },
        { name: 'Others', amount: 7000, percentage: 9.7 }
      ]
    },
    {
      category: 'Marketing',
      amount: 15000,
      percentage: 4,
      color: '#EF4444'
    },
    {
      category: 'Technology',
      amount: 10000,
      percentage: 3,
      color: '#8B5CF6'
    },
    {
      category: 'Other',
      amount: 30000,
      percentage: 9,
      color: '#6B7280'
    }
  ];

  const mockROIMetrics = (): ROIMetric[] => [
    {
      id: '1',
      name: 'Digital Marketing Campaign',
      investment: 15000,
      returns: 45000,
      roi: 200,
      paybackPeriod: '2 months',
      status: 'excellent',
      trend: 'improving'
    },
    {
      id: '2',
      name: 'Kitchen Equipment Upgrade',
      investment: 50000,
      returns: 65000,
      roi: 30,
      paybackPeriod: '8 months',
      status: 'good',
      trend: 'stable'
    },
    {
      id: '3',
      name: 'Staff Training Program',
      investment: 8000,
      returns: 12000,
      roi: 50,
      paybackPeriod: '6 months',
      status: 'good',
      trend: 'improving'
    },
    {
      id: '4',
      name: 'Loyalty Program',
      investment: 20000,
      returns: 35000,
      roi: 75,
      paybackPeriod: '4 months',
      status: 'excellent',
      trend: 'stable'
    },
    {
      id: '5',
      name: 'Delivery Service Expansion',
      investment: 30000,
      returns: 28000,
      roi: -7,
      paybackPeriod: 'Not yet',
      status: 'poor',
      trend: 'improving'
    }
  ];

  const mockCashFlow = () => {
    const data: CashFlow[] = [];
    let cumulative = 0;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const inflow = (isWeekend ? 15000 : 12000) + Math.random() * 3000;
      const outflow = (isWeekend ? 10000 : 9000) + Math.random() * 2000;
      const netCashFlow = inflow - outflow;
      cumulative += netCashFlow;
      
      data.push({
        date: date.toISOString().split('T')[0],
        inflow,
        outflow,
        netCashFlow,
        cumulativeCashFlow: cumulative
      });
    }
    
    return data;
  };

  const mockFinancialRatios = (): FinancialRatio[] => [
    {
      name: 'Gross Profit Margin',
      value: 63.4,
      benchmark: 60,
      status: 'above',
      description: 'Revenue minus COGS as % of revenue'
    },
    {
      name: 'Net Profit Margin',
      value: 15.8,
      benchmark: 12,
      status: 'above',
      description: 'Net profit as % of revenue'
    },
    {
      name: 'Labor Cost Ratio',
      value: 24.9,
      benchmark: 30,
      status: 'above',
      description: 'Labor costs as % of revenue'
    },
    {
      name: 'Food Cost Ratio',
      value: 31.4,
      benchmark: 35,
      status: 'above',
      description: 'Food costs as % of food revenue'
    },
    {
      name: 'Operating Expense Ratio',
      value: 47.6,
      benchmark: 50,
      status: 'above',
      description: 'Operating expenses as % of revenue'
    },
    {
      name: 'EBITDA Margin',
      value: 18.2,
      benchmark: 15,
      status: 'above',
      description: 'Earnings before interest, tax, depreciation'
    }
  ];

  const mockSummaryMetrics = () => ({
    revenue: 382000,
    revenueGrowth: 12.5,
    grossProfit: 242000,
    grossMargin: 63.4,
    netProfit: 60000,
    netMargin: 15.8,
    ebitda: 69556,
    ebitdaMargin: 18.2,
    cashOnHand: 125000,
    burnRate: 8500,
    runway: '14.7 months'
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'down':
      case 'declining':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Deep Dive</h2>
          <p className="text-gray-500">Comprehensive P&L analysis and financial insights</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last Year</option>
          </select>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 rounded ${
                viewMode === 'overview' ? 'bg-white shadow' : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 rounded ${
                viewMode === 'detailed' ? 'bg-white shadow' : ''
              }`}
            >
              Detailed
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Revenue</span>
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summaryMetrics.revenue)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">
                +{summaryMetrics.revenueGrowth}%
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Gross Margin</span>
              <PieChartIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summaryMetrics.grossMargin}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCurrency(summaryMetrics.grossProfit)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Net Profit</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summaryMetrics.netProfit)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summaryMetrics.netMargin}% margin
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Cash Runway</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summaryMetrics.runway}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCurrency(summaryMetrics.cashOnHand)} on hand
            </div>
          </div>
        </div>
      )}

      {/* P&L Statement */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
        <div className="space-y-6">
          {plStatement.map((category, index) => (
            <div key={index} className="border-b pb-4 last:border-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{category.category}</h4>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(category.total)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {category.percentageOfRevenue}% of revenue
                  </div>
                </div>
              </div>
              {viewMode === 'detailed' && (
                <div className="ml-4 space-y-2">
                  {category.subcategories.map((sub, subIndex) => (
                    <div key={subIndex} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{sub.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">
                          {sub.percentage}%
                        </span>
                        <span className="font-medium text-gray-700 w-24 text-right">
                          {formatCurrency(sub.amount)}
                        </span>
                        <div className="flex items-center gap-1 w-16">
                          {getTrendIcon(sub.trend)}
                          <span className={`text-xs ${
                            sub.variance > 0 ? 'text-green-500' : 
                            sub.variance < 0 ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {sub.variance > 0 ? '+' : ''}{sub.variance}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Net Profit */}
          <div className="pt-4 border-t-2 border-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Net Profit</h4>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summaryMetrics?.netProfit || 0)}
                </div>
                <div className="text-sm text-gray-500">
                  {summaryMetrics?.netMargin || 0}% margin
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costBreakdown}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, percentage }) => `${category} ${percentage}%`}
              >
                {costBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Financial Ratios */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Financial Ratios</h3>
          <div className="space-y-3">
            {financialRatios.map((ratio, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {ratio.name}
                    </span>
                    <div className="group relative">
                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {ratio.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          ratio.status === 'above' ? 'bg-green-500' :
                          ratio.status === 'at' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(ratio.value, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {ratio.value}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 ml-4">
                  Target: {ratio.benchmark}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROI Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Return on Investment (ROI)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 font-medium">Initiative</th>
                <th className="pb-3 font-medium text-right">Investment</th>
                <th className="pb-3 font-medium text-right">Returns</th>
                <th className="pb-3 font-medium text-right">ROI</th>
                <th className="pb-3 font-medium text-center">Payback</th>
                <th className="pb-3 font-medium text-center">Status</th>
                <th className="pb-3 font-medium text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {roiMetrics.map((metric) => (
                <tr key={metric.id} className="text-sm">
                  <td className="py-3 font-medium text-gray-900">{metric.name}</td>
                  <td className="py-3 text-right">{formatCurrency(metric.investment)}</td>
                  <td className="py-3 text-right">{formatCurrency(metric.returns)}</td>
                  <td className="py-3 text-right font-medium">
                    <span className={metric.roi > 0 ? 'text-green-600' : 'text-red-600'}>
                      {metric.roi > 0 ? '+' : ''}{metric.roi}%
                    </span>
                  </td>
                  <td className="py-3 text-center">{metric.paybackPeriod}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                      {metric.status}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    {getTrendIcon(metric.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Analysis</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={cashFlow}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar yAxisId="left" dataKey="inflow" fill="#10B981" name="Cash Inflow" />
            <Bar yAxisId="left" dataKey="outflow" fill="#EF4444" name="Cash Outflow" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeCashFlow"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Cumulative Cash"
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#000" />
            <Brush dataKey="date" height={30} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinancialDeepDive;