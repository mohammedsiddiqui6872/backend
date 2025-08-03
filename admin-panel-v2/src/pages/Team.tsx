import { useState } from 'react';
import { Users, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import TeamManagement from '../components/team/TeamManagement';
import ShiftManagement from '../components/shifts/ShiftManagement';

const Team = () => {
  const [activeTab, setActiveTab] = useState('team');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team & Shifts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your restaurant staff, shifts, and schedules
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Shifts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <ShiftManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Team;