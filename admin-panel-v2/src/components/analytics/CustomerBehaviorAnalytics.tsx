import React, { useState, useEffect } from 'react';
import {
  Users, TrendingUp, Heart, MessageSquare,
  ShoppingBag, Clock, Calendar, MapPin,
  Star, Award, Filter, Download,
  ArrowRight, User, Coffee, Pizza,
  Utensils, Receipt, Phone, Mail
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Sankey,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

interface CustomerSegment {
  id: string;
  name: string;
  count: number;
  percentage: number;
  avgOrderValue: number;
  frequency: number;
  lastVisit: string;
  lifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
}

interface CustomerJourney {
  stage: string;
  customers: number;
  dropoffRate: number;
  avgTime: string;
  conversionRate: number;
}

interface LoyaltyMetrics {
  totalMembers: number;
  activeMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  avgPointsPerCustomer: number;
  redemptionRate: number;
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
  }[];
}

interface SentimentData {
  overall: number;
  positive: number;
  neutral: number;
  negative: number;
  trends: {
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }[];
  topIssues: {
    issue: string;
    count: number;
    sentiment: number;
  }[];
}

const CustomerBehaviorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [journeyData, setJourneyData] = useState<CustomerJourney[]>([]);
  const [loyaltyMetrics, setLoyaltyMetrics] = useState<LoyaltyMetrics | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomerData();
  }, [dateRange]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const [segmentsRes, journeyRes, loyaltyRes, sentimentRes, behaviorRes] = await Promise.all([
        analyticsAPI.getCustomerSegments({ range: dateRange }),
        analyticsAPI.getCustomerJourney({ range: dateRange }),
        analyticsAPI.getLoyaltyMetrics({ range: dateRange }),
        analyticsAPI.getSentimentAnalysis({ range: dateRange }),
        analyticsAPI.getBehaviorPatterns({ range: dateRange })
      ]);

      setSegments(segmentsRes.data.segments || mockSegments());
      setJourneyData(journeyRes.data.journey || mockJourneyData());
      setLoyaltyMetrics(loyaltyRes.data || mockLoyaltyMetrics());
      setSentimentData(sentimentRes.data || mockSentimentData());
      setBehaviorPatterns(behaviorRes.data.patterns || mockBehaviorPatterns());
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      // Use mock data as fallback
      setSegments(mockSegments());
      setJourneyData(mockJourneyData());
      setLoyaltyMetrics(mockLoyaltyMetrics());
      setSentimentData(mockSentimentData());
      setBehaviorPatterns(mockBehaviorPatterns());
    }
    setLoading(false);
  };

  // Mock data generators
  const mockSegments = (): CustomerSegment[] => [
    {
      id: '1',
      name: 'VIP Customers',
      count: 245,
      percentage: 12,
      avgOrderValue: 250,
      frequency: 8.5,
      lastVisit: '2 days ago',
      lifetimeValue: 12500,
      churnRisk: 'low'
    },
    {
      id: '2',
      name: 'Regular Customers',
      count: 580,
      percentage: 28,
      avgOrderValue: 150,
      frequency: 4.2,
      lastVisit: '1 week ago',
      lifetimeValue: 3200,
      churnRisk: 'low'
    },
    {
      id: '3',
      name: 'Occasional Visitors',
      count: 890,
      percentage: 43,
      avgOrderValue: 85,
      frequency: 1.8,
      lastVisit: '3 weeks ago',
      lifetimeValue: 450,
      churnRisk: 'medium'
    },
    {
      id: '4',
      name: 'At Risk',
      count: 350,
      percentage: 17,
      avgOrderValue: 95,
      frequency: 0.5,
      lastVisit: '2 months ago',
      lifetimeValue: 180,
      churnRisk: 'high'
    }
  ];

  const mockJourneyData = (): CustomerJourney[] => [
    {
      stage: 'Discovery',
      customers: 5000,
      dropoffRate: 0,
      avgTime: '2 min',
      conversionRate: 100
    },
    {
      stage: 'Menu Browse',
      customers: 4200,
      dropoffRate: 16,
      avgTime: '5 min',
      conversionRate: 84
    },
    {
      stage: 'Add to Cart',
      customers: 2800,
      dropoffRate: 33,
      avgTime: '3 min',
      conversionRate: 56
    },
    {
      stage: 'Checkout',
      customers: 2100,
      dropoffRate: 25,
      avgTime: '2 min',
      conversionRate: 42
    },
    {
      stage: 'Order Complete',
      customers: 1850,
      dropoffRate: 12,
      avgTime: '1 min',
      conversionRate: 37
    }
  ];

  const mockLoyaltyMetrics = (): LoyaltyMetrics => ({
    totalMembers: 1580,
    activeMembers: 1120,
    pointsIssued: 158000,
    pointsRedeemed: 95000,
    avgPointsPerCustomer: 100,
    redemptionRate: 60,
    tierDistribution: [
      { tier: 'Bronze', count: 800, percentage: 51 },
      { tier: 'Silver', count: 500, percentage: 32 },
      { tier: 'Gold', count: 220, percentage: 14 },
      { tier: 'Platinum', count: 60, percentage: 3 }
    ]
  });

  const mockSentimentData = (): SentimentData => ({
    overall: 4.2,
    positive: 68,
    neutral: 22,
    negative: 10,
    trends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      positive: 60 + Math.random() * 20,
      neutral: 20 + Math.random() * 10,
      negative: 5 + Math.random() * 10
    })),
    topIssues: [
      { issue: 'Wait time', count: 45, sentiment: -0.6 },
      { issue: 'Food temperature', count: 32, sentiment: -0.4 },
      { issue: 'Portion size', count: 28, sentiment: -0.3 },
      { issue: 'Service quality', count: 22, sentiment: 0.2 },
      { issue: 'Menu variety', count: 18, sentiment: 0.1 }
    ]
  });

  const mockBehaviorPatterns = () => [
    { time: '10:00', weekday: 15, weekend: 12 },
    { time: '11:00', weekday: 25, weekend: 20 },
    { time: '12:00', weekday: 80, weekend: 65 },
    { time: '13:00', weekday: 95, weekend: 85 },
    { time: '14:00', weekday: 70, weekend: 60 },
    { time: '15:00', weekday: 40, weekend: 45 },
    { time: '16:00', weekday: 35, weekend: 40 },
    { time: '17:00', weekday: 45, weekend: 50 },
    { time: '18:00', weekday: 70, weekend: 75 },
    { time: '19:00', weekday: 85, weekend: 95 },
    { time: '20:00', weekday: 90, weekend: 100 },
    { time: '21:00', weekday: 60, weekend: 80 },
    { time: '22:00', weekday: 30, weekend: 50 }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const renderJourneyFunnel = () => {
    const maxCustomers = Math.max(...journeyData.map(d => d.customers));
    
    return (
      <div className="space-y-4">
        {journeyData.map((stage, index) => {
          const width = (stage.customers / maxCustomers) * 100;
          const isLast = index === journeyData.length - 1;
          
          return (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <span className="text-xs text-gray-500">{stage.avgTime}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">{stage.customers.toLocaleString()} customers</span>
                  {stage.dropoffRate > 0 && (
                    <span className="text-red-500">-{stage.dropoffRate}%</span>
                  )}
                </div>
              </div>
              <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-500"
                  style={{ width: `${width}%` }}
                />
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white mix-blend-difference">
                    {stage.conversionRate}% conversion
                  </span>
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center mt-2">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
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
          <h2 className="text-2xl font-bold text-gray-900">Customer Behavior Analytics</h2>
          <p className="text-gray-500">Understand your customers' journey and preferences</p>
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
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {segments.map((segment) => (
            <div key={segment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{segment.name}</h4>
                <span className={`text-sm font-medium ${getChurnRiskColor(segment.churnRisk)}`}>
                  {segment.churnRisk} risk
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customers</span>
                  <span className="font-medium">{segment.count} ({segment.percentage}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Order</span>
                  <span className="font-medium">AED {segment.avgOrderValue}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequency</span>
                  <span className="font-medium">{segment.frequency}/month</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">LTV</span>
                  <span className="font-medium">AED {segment.lifetimeValue.toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t">
                  <span className="text-xs text-gray-500">Last visit: {segment.lastVisit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Journey Funnel */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Journey Funnel</h3>
        {renderJourneyFunnel()}
      </div>

      {/* Loyalty Program */}
      {loyaltyMetrics && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Program Performance</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500">Total Members</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loyaltyMetrics.totalMembers.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-500">
                    {loyaltyMetrics.activeMembers} active
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Points Activity</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {loyaltyMetrics.redemptionRate}%
                  </div>
                  <div className="text-sm text-gray-500">redemption rate</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Points Issued</span>
                  <span className="font-medium">{loyaltyMetrics.pointsIssued.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Points Redeemed</span>
                  <span className="font-medium">{loyaltyMetrics.pointsRedeemed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Points/Customer</span>
                  <span className="font-medium">{loyaltyMetrics.avgPointsPerCustomer}</span>
                </div>
              </div>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={loyaltyMetrics.tierDistribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ tier, percentage }) => `${tier} ${percentage}%`}
                  >
                    {loyaltyMetrics.tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {sentimentData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Sentiment Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-gray-900">{sentimentData.overall}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.floor(sentimentData.overall)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-500 mt-1">Overall Rating</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Positive</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${sentimentData.positive}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{sentimentData.positive}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Neutral</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500"
                        style={{ width: `${sentimentData.neutral}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{sentimentData.neutral}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Negative</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${sentimentData.negative}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{sentimentData.negative}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={sentimentData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke="#6B7280"
                    fill="#6B7280"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    stackId="1"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Issues */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Customer Concerns</h4>
            <div className="space-y-2">
              {sentimentData.topIssues.map((issue) => (
                <div key={issue.issue} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{issue.issue}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{issue.count} mentions</span>
                    <div className={`text-sm font-medium ${
                      issue.sentiment < 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {issue.sentiment > 0 ? '+' : ''}{(issue.sentiment * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Behavior Patterns */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Behavior Patterns</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={behaviorPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="weekday" fill="#3B82F6" name="Weekday" />
            <Bar dataKey="weekend" fill="#10B981" name="Weekend" />
            <Line
              type="monotone"
              dataKey="weekday"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="weekend"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CustomerBehaviorAnalytics;