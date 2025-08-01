import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SessionAnalytics from '../components/analytics/SessionAnalytics';
import { BarChart3, Activity } from 'lucide-react';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your restaurant's performance and insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Session Analytics
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            General Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <SessionAnalytics />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          {/* Coming Soon */}
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">General Analytics Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">
              General analytics and insights coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;