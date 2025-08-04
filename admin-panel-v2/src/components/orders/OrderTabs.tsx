import React from 'react';
import {
  ShoppingBag, Activity, ChefHat, BarChart3, TrendingUp
} from 'lucide-react';

export type OrderTab = 'orders' | 'flow' | 'performance' | 'heatmap' | 'trends' | 'loadbalancer' | 'multikitchen';

interface OrderTabsProps {
  activeTab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
}

interface TabConfig {
  id: OrderTab;
  label: string;
  icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { id: 'orders', label: 'Order Management', icon: ShoppingBag },
  { id: 'flow', label: 'Order Flow Pipeline', icon: Activity },
  { id: 'performance', label: 'Chef Performance', icon: ChefHat },
  { id: 'heatmap', label: 'Heat Maps', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'loadbalancer', label: 'Station Load Balancer', icon: Activity },
  { id: 'multikitchen', label: 'Multi-Kitchen', icon: ChefHat }
];

export const OrderTabs: React.FC<OrderTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap
                  ${isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center">
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};