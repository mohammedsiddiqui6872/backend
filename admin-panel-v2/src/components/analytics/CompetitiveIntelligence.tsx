import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Target, DollarSign, Users,
  Eye, AlertTriangle, Award, Search,
  Filter, Download, ChevronUp, ChevronDown,
  Star, MapPin, Clock, Zap,
  Shield, Swords, Trophy, ArrowUpRight
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

interface Competitor {
  id: string;
  name: string;
  type: 'direct' | 'indirect' | 'substitute';
  distance: number;
  rating: number;
  priceRange: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  recentChanges: {
    type: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    date: string;
  }[];
}

interface MarketPosition {
  dimension: string;
  ourScore: number;
  marketAverage: number;
  topPerformer: number;
  percentile: number;
}

interface PricingOpportunity {
  itemId: string;
  itemName: string;
  currentPrice: number;
  marketAverage: number;
  suggestedPrice: number;
  potentialRevenue: number;
  confidence: number;
  reasoning: string;
}

interface MarketTrend {
  name: string;
  impact: 'high' | 'medium' | 'low';
  direction: 'growing' | 'declining' | 'stable';
  relevance: number;
  description: string;
  actionItems: string[];
}

const CompetitiveIntelligence: React.FC = () => {
  const handleExportReport = () => {
    try {
      const csvData = [];
      
      // Header
      csvData.push(['Competitive Intelligence Report']);
      csvData.push(['Generated on:', new Date().toLocaleDateString()]);
      csvData.push(['Period:', dateRange]);
      csvData.push(['']);
      
      // Market Position
      csvData.push(['Market Position Analysis']);
      csvData.push(['Dimension', 'Our Score', 'Market Average', 'Top Performer', 'Percentile']);
      marketPosition.forEach(pos => {
        csvData.push([
          pos.dimension,
          pos.ourScore,
          pos.marketAverage,
          pos.topPerformer,
          `${pos.percentile}%`
        ]);
      });
      csvData.push(['']);
      
      // Competitors
      csvData.push(['Competitor Analysis']);
      csvData.push(['Name', 'Type', 'Distance', 'Rating', 'Price Range', 'Market Share', 'Strengths']);
      competitors.forEach(comp => {
        csvData.push([
          comp.name,
          comp.type,
          `${comp.distance} km`,
          comp.rating,
          comp.priceRange,
          `${comp.marketShare}%`,
          comp.strengths.join('; ')
        ]);
      });
      csvData.push(['']);
      
      // Pricing Opportunities
      csvData.push(['Pricing Opportunities']);
      csvData.push(['Item', 'Current Price', 'Market Avg', 'Suggested Price', 'Potential Revenue', 'Reasoning']);
      pricingOpportunities.forEach(opp => {
        csvData.push([
          opp.itemName,
          `AED ${opp.currentPrice}`,
          `AED ${opp.marketAverage}`,
          `AED ${opp.suggestedPrice}`,
          `AED ${opp.potentialRevenue}`,
          opp.reasoning
        ]);
      });
      csvData.push(['']);
      
      // Market Trends
      csvData.push(['Market Trends']);
      csvData.push(['Trend', 'Impact', 'Direction', 'Relevance', 'Description']);
      marketTrends.forEach(trend => {
        csvData.push([
          trend.name,
          trend.impact,
          trend.direction,
          `${trend.relevance}%`,
          trend.description
        ]);
      });
      csvData.push(['']);
      
      // Benchmark Data
      csvData.push(['Performance Benchmarks']);
      csvData.push(['Category', 'Us', 'Market Leader', 'Market Average']);
      benchmarkData.forEach(bench => {
        csvData.push([
          bench.category,
          `${bench.us.toFixed(1)}%`,
          `${bench.marketLeader.toFixed(1)}%`,
          `${bench.marketAverage.toFixed(1)}%`
        ]);
      });
      
      // Convert to CSV
      const csv = csvData.map(row => row.join(',')).join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `competitive-intelligence-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };
  const [loading, setLoading] = useState(true);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [marketPosition, setMarketPosition] = useState<MarketPosition[]>([]);
  const [pricingOpportunities, setPricingOpportunities] = useState<PricingOpportunity[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);

  useEffect(() => {
    fetchCompetitiveData();
  }, [dateRange]);

  const fetchCompetitiveData = async () => {
    setLoading(true);
    try {
      const [competitorsRes, positionRes, pricingRes, trendsRes, benchmarkRes] = await Promise.all([
        analyticsAPI.getCompetitors({ range: dateRange }),
        analyticsAPI.getMarketPosition({ range: dateRange }),
        analyticsAPI.getPricingOpportunities({ range: dateRange }),
        analyticsAPI.getMarketTrends({ range: dateRange }),
        analyticsAPI.getBenchmarkData({ range: dateRange })
      ]);

      setCompetitors(competitorsRes.data.competitors || mockCompetitors());
      setMarketPosition(positionRes.data.position || mockMarketPosition());
      setPricingOpportunities(pricingRes.data.opportunities || mockPricingOpportunities());
      setMarketTrends(trendsRes.data.trends || mockMarketTrends());
      setBenchmarkData(benchmarkRes.data.benchmark || mockBenchmarkData());
    } catch (error) {
      console.error('Failed to fetch competitive data:', error);
      // Use mock data as fallback
      setCompetitors(mockCompetitors());
      setMarketPosition(mockMarketPosition());
      setPricingOpportunities(mockPricingOpportunities());
      setMarketTrends(mockMarketTrends());
      setBenchmarkData(mockBenchmarkData());
    }
    setLoading(false);
  };

  // Mock data generators
  const mockCompetitors = (): Competitor[] => [
    {
      id: '1',
      name: 'Spice Garden Restaurant',
      type: 'direct',
      distance: 0.8,
      rating: 4.3,
      priceRange: '$$-$$$',
      marketShare: 22,
      strengths: ['Authentic cuisine', 'Fast delivery', 'Large portions'],
      weaknesses: ['Limited parking', 'No online ordering', 'Higher prices'],
      recentChanges: [
        {
          type: 'menu',
          description: 'Added 15 new vegan dishes',
          impact: 'negative',
          date: '2025-07-25'
        },
        {
          type: 'pricing',
          description: 'Reduced lunch prices by 15%',
          impact: 'negative',
          date: '2025-07-20'
        }
      ]
    },
    {
      id: '2',
      name: 'Quick Bites Cafe',
      type: 'indirect',
      distance: 1.2,
      rating: 4.1,
      priceRange: '$-$$',
      marketShare: 18,
      strengths: ['Fast service', 'Budget friendly', 'Good location'],
      weaknesses: ['Limited menu', 'Average quality', 'Small space'],
      recentChanges: [
        {
          type: 'expansion',
          description: 'Opened second location nearby',
          impact: 'negative',
          date: '2025-07-15'
        }
      ]
    },
    {
      id: '3',
      name: 'The Gourmet House',
      type: 'direct',
      distance: 2.1,
      rating: 4.6,
      priceRange: '$$$-$$$$',
      marketShare: 15,
      strengths: ['Premium quality', 'Excellent service', 'Ambiance'],
      weaknesses: ['Very expensive', 'Long wait times', 'Limited capacity'],
      recentChanges: [
        {
          type: 'service',
          description: 'Introduced reservation system',
          impact: 'neutral',
          date: '2025-07-10'
        }
      ]
    }
  ];

  const mockMarketPosition = (): MarketPosition[] => [
    {
      dimension: 'Price Competitiveness',
      ourScore: 75,
      marketAverage: 65,
      topPerformer: 85,
      percentile: 72
    },
    {
      dimension: 'Service Speed',
      ourScore: 82,
      marketAverage: 70,
      topPerformer: 90,
      percentile: 81
    },
    {
      dimension: 'Menu Variety',
      ourScore: 88,
      marketAverage: 75,
      topPerformer: 92,
      percentile: 85
    },
    {
      dimension: 'Customer Satisfaction',
      ourScore: 86,
      marketAverage: 78,
      topPerformer: 91,
      percentile: 83
    },
    {
      dimension: 'Digital Presence',
      ourScore: 90,
      marketAverage: 60,
      topPerformer: 95,
      percentile: 88
    },
    {
      dimension: 'Value for Money',
      ourScore: 80,
      marketAverage: 72,
      topPerformer: 88,
      percentile: 78
    }
  ];

  const mockPricingOpportunities = (): PricingOpportunity[] => [
    {
      itemId: '1',
      itemName: 'Chicken Biryani',
      currentPrice: 45,
      marketAverage: 52,
      suggestedPrice: 49,
      potentialRevenue: 1200,
      confidence: 85,
      reasoning: 'Your quality exceeds competitors, price below market average'
    },
    {
      itemId: '2',
      itemName: 'Vegetable Curry',
      currentPrice: 35,
      marketAverage: 32,
      suggestedPrice: 33,
      potentialRevenue: -400,
      confidence: 78,
      reasoning: 'Slightly above market, consider small reduction for volume'
    },
    {
      itemId: '3',
      itemName: 'Premium Thali',
      currentPrice: 65,
      marketAverage: 75,
      suggestedPrice: 72,
      potentialRevenue: 2100,
      confidence: 92,
      reasoning: 'Premium offering underpriced, customers willing to pay more'
    },
    {
      itemId: '4',
      itemName: 'Fresh Juice',
      currentPrice: 15,
      marketAverage: 18,
      suggestedPrice: 17,
      potentialRevenue: 800,
      confidence: 88,
      reasoning: 'High demand item, slight increase won\'t affect volume'
    }
  ];

  const mockMarketTrends = (): MarketTrend[] => [
    {
      name: 'Plant-Based Revolution',
      impact: 'high',
      direction: 'growing',
      relevance: 85,
      description: '40% increase in vegan/vegetarian searches in your area',
      actionItems: [
        'Expand vegetarian menu section',
        'Highlight vegan options prominently',
        'Create plant-based combo meals'
      ]
    },
    {
      name: 'Contactless Dining',
      impact: 'medium',
      direction: 'growing',
      relevance: 75,
      description: 'QR ordering adoption up 60% among competitors',
      actionItems: [
        'Optimize mobile ordering experience',
        'Add contactless payment options',
        'Promote QR code ordering'
      ]
    },
    {
      name: 'Health-Conscious Eating',
      impact: 'high',
      direction: 'growing',
      relevance: 80,
      description: 'Calorie-conscious options seeing 35% growth',
      actionItems: [
        'Add nutritional information to menu',
        'Create healthy meal options',
        'Offer customizable portions'
      ]
    },
    {
      name: 'Late Night Delivery',
      impact: 'medium',
      direction: 'stable',
      relevance: 65,
      description: 'After 10 PM orders growing at 25% monthly',
      actionItems: [
        'Extend delivery hours',
        'Create late-night specific menu',
        'Partner with night delivery services'
      ]
    }
  ];

  const mockBenchmarkData = () => {
    const categories = ['Revenue', 'Orders', 'Avg Order', 'Customer Return', 'Satisfaction'];
    return categories.map(category => ({
      category,
      us: 75 + Math.random() * 20,
      marketLeader: 85 + Math.random() * 10,
      marketAverage: 65 + Math.random() * 15
    }));
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const getCompetitorTypeColor = (type: string) => {
    switch (type) {
      case 'direct': return 'text-red-500';
      case 'indirect': return 'text-yellow-500';
      case 'substitute': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'neutral': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'growing': return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <ChevronDown className="w-4 h-4 text-red-500" />;
      default: return <span className="w-4 h-4 text-gray-500">—</span>;
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Competitive Intelligence</h2>
          <p className="text-gray-500">Market insights and competitor analysis</p>
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
          </select>
          <button 
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Market Position Radar */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Market Position Analysis</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Us</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Market Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Top Performer</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={marketPosition}>
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="dimension" fontSize={12} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={10} />
              <Radar
                name="Our Restaurant"
                dataKey="ourScore"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
              />
              <Radar
                name="Market Average"
                dataKey="marketAverage"
                stroke="#6B7280"
                fill="#6B7280"
                fillOpacity={0.1}
              />
              <Radar
                name="Top Performer"
                dataKey="topPerformer"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.1}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            {marketPosition.map((position) => (
              <div key={position.dimension} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{position.dimension}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${position.percentile}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {position.percentile}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {competitors.map((competitor) => (
          <div
            key={competitor.id}
            className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
              selectedCompetitor === competitor.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedCompetitor(competitor.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{competitor.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${getCompetitorTypeColor(competitor.type)}`}>
                    {competitor.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {competitor.distance} km away
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{competitor.rating}</span>
                </div>
                <span className="text-xs text-gray-500">{competitor.priceRange}</span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Market Share</span>
                <span className="font-medium">{competitor.marketShare}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${competitor.marketShare}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Strengths:</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.strengths.slice(0, 2).map((strength, index) => (
                    <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {strength}
                    </span>
                  ))}
                  {competitor.strengths.length > 2 && (
                    <span className="text-xs text-gray-500">+{competitor.strengths.length - 2}</span>
                  )}
                </div>
              </div>

              {competitor.recentChanges.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-1">Recent Activity:</p>
                  <div className="space-y-1">
                    {competitor.recentChanges.slice(0, 1).map((change, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className={`text-xs ${getImpactColor(change.impact)}`}>●</span>
                        <span className="text-xs text-gray-600">{change.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Opportunities */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Optimization Opportunities</h3>
          <div className="text-sm text-gray-500">
            Potential Monthly Impact: <span className="font-semibold text-green-600">
              +AED {pricingOpportunities.reduce((sum, opp) => sum + Math.max(0, opp.potentialRevenue), 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 font-medium text-right">Current</th>
                <th className="pb-3 font-medium text-right">Market Avg</th>
                <th className="pb-3 font-medium text-right">Suggested</th>
                <th className="pb-3 font-medium text-right">Impact</th>
                <th className="pb-3 font-medium text-center">Confidence</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pricingOpportunities.map((opportunity) => (
                <tr key={opportunity.itemId} className="text-sm">
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-gray-900">{opportunity.itemName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opportunity.reasoning}</div>
                    </div>
                  </td>
                  <td className="py-3 text-right">AED {opportunity.currentPrice}</td>
                  <td className="py-3 text-right">AED {opportunity.marketAverage}</td>
                  <td className="py-3 text-right font-medium">AED {opportunity.suggestedPrice}</td>
                  <td className="py-3 text-right">
                    <span className={opportunity.potentialRevenue > 0 ? 'text-green-600' : 'text-red-600'}>
                      {opportunity.potentialRevenue > 0 ? '+' : ''}AED {opportunity.potentialRevenue}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            opportunity.confidence > 80 ? 'bg-green-500' : 
                            opportunity.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${opportunity.confidence}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs">{opportunity.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Trends */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends & Opportunities</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketTrends.map((trend, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    trend.impact === 'high' ? 'bg-red-100' :
                    trend.impact === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <Zap className={`w-5 h-5 ${
                      trend.impact === 'high' ? 'text-red-600' :
                      trend.impact === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{trend.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getTrendIcon(trend.direction)}
                      <span className="text-xs text-gray-500 capitalize">{trend.direction}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{trend.impact} impact</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{trend.relevance}%</div>
                  <div className="text-xs text-gray-500">relevance</div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{trend.description}</p>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Recommended Actions:</p>
                {trend.actionItems.map((action, actionIndex) => (
                  <div key={actionIndex} className="flex items-start gap-2">
                    <ArrowUpRight className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmark Comparison */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Benchmark</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={benchmarkData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="us" name="Our Restaurant" fill="#3B82F6" />
            <Bar dataKey="marketAverage" name="Market Average" fill="#6B7280" />
            <Bar dataKey="marketLeader" name="Market Leader" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompetitiveIntelligence;