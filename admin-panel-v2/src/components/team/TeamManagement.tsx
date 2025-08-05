import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Search, UserCheck, UserX, 
  Phone, Mail, Calendar, Clock, Award, AlertCircle,
  Building, Users, Filter, Download, Upload, Eye, Shield, ChevronDown 
} from 'lucide-react';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AddTeamMemberModal from '../modals/AddTeamMemberModal';
import EditTeamMemberModal from '../modals/EditTeamMemberModal';
import TeamMemberDetailsModal from '../modals/TeamMemberDetailsModal';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  profile?: {
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    employeeId?: string;
    department?: string;
    position?: string;
    hireDate?: string;
    employmentType?: string;
    salary?: {
      amount?: number;
      currency?: string;
      type?: string;
    };
    contractEndDate?: string;
    supervisor?: string;
    documents?: Array<{
      type: string;
      name: string;
      url: string;
      uploadedAt: string;
      expiryDate?: string;
    }>;
  };
  metrics?: {
    totalOrdersServed?: number;
    averageRating?: number;
    totalHoursWorked?: number;
    punctualityScore?: number;
  };
  permissions?: string[];
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  roleDistribution: Array<{ _id: string; count: number }>;
  departmentDistribution: Array<{ _id: string; count: number }>;
}

const TeamManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchTeamMembers();
    fetchTeamStats();
  }, [currentPage, debouncedSearchQuery, filterRole, filterDepartment, filterStatus]);

  useEffect(() => {
    // Just set filtered members to the fetched members
    // The filtering is now done server-side
    setFilteredMembers(members);
  }, [members]);

  const fetchTeamMembers = async () => {
    try {
      const response = await teamAPI.getMembers({
        page: currentPage,
        limit: 10,
        search: debouncedSearchQuery,
        role: filterRole,
        department: filterDepartment,
        isActive: filterStatus
      });
      setMembers(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const response = await teamAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load team stats');
    }
  };

  const handleAddMember = async (data: any, documents?: any) => {
    try {
      const response = await teamAPI.addMember(data);
      const memberId = response.data.data._id;
      
      // Note: Documents will be uploaded in the edit modal after creation
      toast.success('Team member added successfully. You can now upload documents by editing the member.');
      setShowAddModal(false);
      fetchTeamMembers();
      fetchTeamStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add team member');
    }
  };

  const handleEditMember = async (data: any) => {
    if (!selectedMember) return;
    
    try {
      await teamAPI.updateMember(selectedMember._id, data);
      toast.success('Team member updated successfully');
      setShowEditModal(false);
      setSelectedMember(null);
      fetchTeamMembers();
      return Promise.resolve(); // Return resolved promise for success
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update team member');
      return Promise.reject(error); // Return rejected promise for error
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this team member?')) {
      return;
    }

    try {
      await teamAPI.deleteMember(id);
      toast.success('Team member deactivated successfully');
      fetchTeamMembers();
      fetchTeamStats();
    } catch (error) {
      toast.error('Failed to deactivate team member');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      chef: 'bg-orange-100 text-orange-800',
      waiter: 'bg-green-100 text-green-800',
      cashier: 'bg-yellow-100 text-yellow-800',
      host: 'bg-pink-100 text-pink-800',
      bartender: 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const exportTeamData = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await teamAPI.exportMembers(format);
      
      if (format === 'json') {
        // For JSON, create a blob from the JSON data
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-members-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // For CSV, the response is already a blob
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-members-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Team data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export team data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => navigate('/team/roles' + location.search)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Shield className="h-4 w-4 mr-2" />
          Manage Roles
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    exportTeamData('csv');
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    exportTeamData('json');
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Members
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.totalMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Members
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.activeMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserX className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Inactive Members
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.inactiveMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Departments
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.departmentDistribution.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Search by name, email, or employee ID..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="chef">Chef</option>
              <option value="waiter">Waiter</option>
              <option value="cashier">Cashier</option>
              <option value="host">Host</option>
              <option value="bartender">Bartender</option>
            </select>
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Service">Service</option>
              <option value="Management">Management</option>
              <option value="Bar">Bar</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <div key={member._id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
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
                      <Building className="h-4 w-4 mr-2" />
                      {member.profile.department}
                    </div>
                  )}
                  {member.profile?.employeeId && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Award className="h-4 w-4 mr-2" />
                      ID: {member.profile.employeeId}
                    </div>
                  )}
                </div>

                {member.metrics && (
                  <div className="mt-4 grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {member.metrics.totalOrdersServed || 0}
                      </p>
                      <p className="text-xs text-gray-500">Orders Served</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {member.metrics.averageRating?.toFixed(1) || '0.0'}
                      </p>
                      <p className="text-xs text-gray-500">Avg Rating</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowDetailsModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 text-sm font-medium flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowEditModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500">
              {searchQuery || filterRole || filterDepartment || filterStatus 
                ? 'No team members found matching your filters.' 
                : 'No team members yet. Add your first team member.'}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddModal && (
        <AddTeamMemberModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMember}
          supervisors={members.filter(m => ['admin', 'manager'].includes(m.role))}
        />
      )}

      {/* Edit Team Member Modal */}
      {showEditModal && selectedMember && (
        <EditTeamMemberModal
          isOpen={showEditModal}
          member={selectedMember}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMember(null);
          }}
          onEdit={handleEditMember}
          supervisors={members.filter(m => ['admin', 'manager'].includes(m.role))}
        />
      )}

      {/* Team Member Details Modal */}
      {showDetailsModal && selectedMember && (
        <TeamMemberDetailsModal
          isOpen={showDetailsModal}
          member={selectedMember}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

export default TeamManagement;