import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Activity,
  ChevronRight
} from 'lucide-react';
import ProfitabilityDashboard from '../components/analytics/ProfitabilityDashboard';
import SalesVelocityTracker from '../components/analytics/SalesVelocityTracker';
import MenuEngineeringMatrix from '../components/analytics/MenuEngineeringMatrix';

const MenuAnalytics = () => {
  const [activeTab, setActiveTab] = useState<'profitability' | 'velocity' | 'matrix'>('profitability');

  const tabs = [
    {
      id: 'profitability',
      name: 'Profitability Analysis',
      description: 'Analyze menu item costs, revenues, and profit margins',
      icon: DollarSign,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'velocity',
      name: 'Sales Velocity',
      description: 'Track how fast items are selling and identify trends',
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'matrix',
      name: 'Menu Engineering',
      description: 'Categorize items by popularity and profitability',
      icon: BarChart3,
      color: 'text-purple-600 bg-purple-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Menu Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Comprehensive analysis tools to optimize your menu performance
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-6 text-left transition-all ${
                  isActive 
                    ? 'bg-gray-50 ring-2 ring-inset ring-primary-500' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <div className={`p-3 rounded-lg ${tab.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {tab.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {tab.description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Performer</p>
              <p className="text-lg font-semibold text-gray-900">Chicken Biryani</p>
              <p className="text-xs text-gray-500">$450 profit/day</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fastest Mover</p>
              <p className="text-lg font-semibold text-gray-900">Samosas</p>
              <p className="text-xs text-gray-500">45 sales/day</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Highest Margin</p>
              <p className="text-lg font-semibold text-gray-900">Mango Lassi</p>
              <p className="text-xs text-gray-500">78% profit margin</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Opportunity</p>
              <p className="text-lg font-semibold text-gray-900">Dal Makhani</p>
              <p className="text-xs text-gray-500">High margin, low sales</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'profitability' && <ProfitabilityDashboard />}
        {activeTab === 'velocity' && <SalesVelocityTracker />}
        {activeTab === 'matrix' && <MenuEngineeringMatrix />}
      </div>
    </div>
  );
};

export default MenuAnalytics;