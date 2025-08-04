import React from 'react';
import {
  ShoppingBag, Clock, CheckCircle, DollarSign, TrendingUp
} from 'lucide-react';

interface OrderStatsProps {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
}

export const OrderStats: React.FC<OrderStatsProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Completed',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Average Order',
      value: formatCurrency(stats.averageOrderValue),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};