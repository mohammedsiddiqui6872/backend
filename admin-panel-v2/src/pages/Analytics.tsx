import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SessionAnalytics from '../components/analytics/SessionAnalytics';
import PredictiveAnalytics from '../components/analytics/PredictiveAnalytics';
import RealTimePerformance from '../components/analytics/RealTimePerformance';
import CustomerBehaviorAnalytics from '../components/analytics/CustomerBehaviorAnalytics';
import CompetitiveIntelligence from '../components/analytics/CompetitiveIntelligence';
import FinancialDeepDive from '../components/analytics/FinancialDeepDive';
import EmployeePerformanceMatrix from '../components/analytics/EmployeePerformanceMatrix';
import { BarChart3, Activity, Brain, Zap, Users, Target, Trophy } from 'lucide-react';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('real-time');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your restaurant's performance and insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 max-w-6xl">
          <TabsTrigger value="real-time" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Real-Time
          </TabsTrigger>
          <TabsTrigger value="competitive" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Competitive
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="real-time" className="mt-6">
          <RealTimePerformance />
        </TabsContent>

        <TabsContent value="competitive" className="mt-6">
          <CompetitiveIntelligence />
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <CustomerBehaviorAnalytics />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionAnalytics />
        </TabsContent>

        <TabsContent value="predictive" className="mt-6">
          <PredictiveAnalytics />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <FinancialDeepDive />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeePerformanceMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;