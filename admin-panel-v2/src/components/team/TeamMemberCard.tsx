import React from 'react';
import { 
  Mail, Phone, MapPin, Calendar, Award, Shield, UserCheck, Trash2, Eye, Edit 
} from 'lucide-react';
import { format } from 'date-fns';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  profile?: {
    position?: string;
    department?: string;
    dateOfBirth?: string;
    employeeId?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
  };
  permissions?: string[];
  metrics?: {
    ordersServed?: number;
    averageRating?: number;
    punctualityScore?: number;
  };
  lastLogin?: string;
  createdAt: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
  onView: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
  onToggleStatus: (member: TeamMember) => void;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onView,
  onEdit,
  onDelete,
  onToggleStatus
}) => {
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      chef: 'bg-orange-100 text-orange-800',
      waiter: 'bg-green-100 text-green-800',
      cashier: 'bg-yellow-100 text-yellow-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.default;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <img
              className="h-16 w-16 rounded-full object-cover"
              src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff`}
              alt={member.name}
            />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.profile?.position || member.role}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleBadgeColor(member.role)}`}>
                {member.role}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {member.isActive ? (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <Mail className="h-4 w-4 mr-2" />
            {member.email}
          </div>
          {member.phone && (
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="h-4 w-4 mr-2" />
              {member.phone}
            </div>
          )}
          {member.profile?.department && (
            <div className="flex items-center text-sm text-gray-500">
              <Shield className="h-4 w-4 mr-2" />
              {member.profile.department}
            </div>
          )}
          {member.profile?.employeeId && (
            <div className="flex items-center text-sm text-gray-500">
              <UserCheck className="h-4 w-4 mr-2" />
              ID: {member.profile.employeeId}
            </div>
          )}
        </div>

        {/* Metrics */}
        {member.metrics && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {member.metrics.ordersServed !== undefined && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Orders</p>
                <p className="text-sm font-semibold">{member.metrics.ordersServed}</p>
              </div>
            )}
            {member.metrics.averageRating !== undefined && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-sm font-semibold">
                  {member.metrics.averageRating.toFixed(1)}
                  <Award className="inline h-3 w-3 ml-1 text-yellow-500" />
                </p>
              </div>
            )}
            {member.metrics.punctualityScore !== undefined && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Punctuality</p>
                <p className="text-sm font-semibold">{member.metrics.punctualityScore}%</p>
              </div>
            )}
          </div>
        )}

        {/* Last Login */}
        {member.lastLogin && (
          <div className="mt-3 text-xs text-gray-500">
            Last login: {format(new Date(member.lastLogin), 'MMM dd, yyyy h:mm a')}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <button
            onClick={() => onToggleStatus(member)}
            className={`text-sm font-medium ${
              member.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
            }`}
          >
            {member.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => onView(member)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(member)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(member)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};