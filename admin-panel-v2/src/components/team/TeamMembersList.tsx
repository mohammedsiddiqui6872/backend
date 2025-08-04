import React from 'react';
import { Users } from 'lucide-react';
import { VirtualizedList } from '../common/VirtualizedList';
import { TeamMemberCard, TeamMember } from './TeamMemberCard';

interface TeamMembersListProps {
  members: TeamMember[];
  loading: boolean;
  searchQuery: string;
  filterRole: string;
  filterDepartment: string;
  onViewMember: (member: TeamMember) => void;
  onEditMember: (member: TeamMember) => void;
  onDeleteMember: (member: TeamMember) => void;
  onToggleStatus: (member: TeamMember) => void;
}

export const TeamMembersList: React.FC<TeamMembersListProps> = ({
  members,
  loading,
  searchQuery,
  filterRole,
  filterDepartment,
  onViewMember,
  onEditMember,
  onDeleteMember,
  onToggleStatus
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="flex items-center">
                <div className="h-16 w-16 bg-gray-200 rounded-full" />
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchQuery || filterRole !== 'all' || filterDepartment !== 'all'
            ? 'Try adjusting your filters'
            : 'Add team members to see them here'}
        </p>
      </div>
    );
  }

  // For large teams (>50 members), use virtualization
  if (members.length > 50) {
    return (
      <div className="bg-white rounded-lg shadow">
        <VirtualizedList
          items={members}
          itemHeight={320} // Approximate height of TeamMemberCard
          containerClassName="h-[800px]"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6"
          renderItem={(member) => (
            <TeamMemberCard
              member={member}
              onView={onViewMember}
              onEdit={onEditMember}
              onDelete={onDeleteMember}
              onToggleStatus={onToggleStatus}
            />
          )}
          getItemKey={(member) => member._id}
          overscan={3}
        />
      </div>
    );
  }

  // For smaller teams, render normally
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <TeamMemberCard
          key={member._id}
          member={member}
          onView={onViewMember}
          onEdit={onEditMember}
          onDelete={onDeleteMember}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
};