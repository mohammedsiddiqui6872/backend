import { useState } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

const Analytics = () => {
  const [period, setPeriod] = useState('week');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your restaurant's performance and insights
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Dashboard</h3>
        <p className="mt-1 text-sm text-gray-500">
          Detailed analytics and insights coming soon.
        </p>
      </div>
    </div>
  );
};

export default Analytics;