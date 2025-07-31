import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, UserCheck, UserX } from 'lucide-react';
import { teamAPI } from '../services/api';
import toast from 'react-hot-toast';
import AddTeamMemberModal from '../components/modals/AddTeamMemberModal';
import EditTeamMemberModal from '../components/modals/EditTeamMemberModal';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'waiter' | 'kitchen';
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const Team = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    // Filter members based on search query
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  const fetchTeamMembers = async () => {
    try {
      const response = await teamAPI.getMembers();
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (data: any) => {
    try {
      await teamAPI.addMember(data);
      toast.success('Team member added successfully');
      setShowAddModal(false);
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add team member');
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update team member');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    try {
      await teamAPI.deleteMember(id);
      toast.success('Team member deleted successfully');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Failed to delete team member');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'waiter':
        return 'bg-green-100 text-green-800';
      case 'kitchen':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your restaurant staff and their roles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Search by name, email, or role..."
          />
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.isActive ? (
                        <>
                          <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-sm text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{member.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowEditModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {searchQuery ? 'No team members found matching your search.' : 'No team members yet. Add your first team member.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Team Member Modal */}
      {showAddModal && (
        <AddTeamMemberModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMember}
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
        />
      )}
    </div>
  );
};

export default Team;