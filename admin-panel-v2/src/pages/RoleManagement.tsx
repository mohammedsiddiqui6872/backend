import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  ChevronDown,
  ChevronRight,
  Lock,
  Users,
  Settings,
  AlertCircle,
  Save
} from 'lucide-react';
import { teamAPI } from '../services/api';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

interface Role {
  _id?: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  uiAccess: {
    dashboard: boolean;
    orders: boolean;
    menu: boolean;
    tables: boolean;
    customers: boolean;
    analytics: boolean;
    inventory: boolean;
    staff: boolean;
    settings: boolean;
  };
  level: number;
  isActive: boolean;
  isSystem?: boolean;
  userCount?: number;
  reportsTo?: string;
}

interface Permission {
  code: string;
  name: string;
  description: string;
}

interface PermissionCategory {
  [key: string]: Permission[];
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionCategory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [savingRole, setSavingRole] = useState(false);

  // Load roles and permissions
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([
        teamAPI.getRoles(),
        teamAPI.getPermissions()
      ]);
      
      // Ensure roles is always an array
      const rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data?.data || []);
      setRoles(rolesData);
      
      // Ensure permissions is always an object with arrays
      const permissionsData = permissionsRes.data?.data || permissionsRes.data || {};
      setPermissions(permissionsData);
      
      // Expand all permission categories by default
      const categories = Object.keys(permissionsData);
      const expanded: Record<string, boolean> = {};
      categories.forEach(cat => expanded[cat] = true);
      setExpandedCategories(expanded);
    } catch (err) {
      setError('Failed to load roles and permissions');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleCreateRole = () => {
    setEditingRole({
      name: '',
      code: '',
      description: '',
      permissions: [],
      uiAccess: {
        dashboard: true,
        orders: true,
        menu: false,
        tables: false,
        customers: false,
        analytics: false,
        inventory: false,
        staff: false,
        settings: false
      },
      level: 1,
      isActive: true
    });
    setShowCreateModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setShowCreateModal(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      await teamAPI.deleteRole(roleId);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete role: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole || !editingRole.name || !editingRole.code) {
      alert('Please fill in all required fields');
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole._id) {
        await teamAPI.updateRole(editingRole._id, editingRole);
      } else {
        await teamAPI.createRole(editingRole);
      }
      setShowCreateModal(false);
      setEditingRole(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to save role: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingRole(false);
    }
  };

  const togglePermission = (permission: string) => {
    if (!editingRole) return;
    
    const permissions = editingRole.permissions || [];
    const hasPermission = permissions.includes(permission);
    
    setEditingRole({
      ...editingRole,
      permissions: hasPermission 
        ? permissions.filter(p => p !== permission)
        : [...permissions, permission]
    });
  };

  const toggleUIAccess = (section: keyof Role['uiAccess']) => {
    if (!editingRole) return;
    
    setEditingRole({
      ...editingRole,
      uiAccess: {
        ...editingRole.uiAccess,
        [section]: !editingRole.uiAccess[section]
      }
    });
  };

  const selectAllPermissions = (category: string) => {
    if (!editingRole || !permissions[category]) return;
    
    // Ensure permissions[category] is an array
    const categoryPerms = Array.isArray(permissions[category]) ? permissions[category] : [];
    const categoryPermissions = categoryPerms.map(p => p.code);
    const currentPermissions = editingRole.permissions || [];
    const hasAll = categoryPermissions.every(p => currentPermissions.includes(p));
    
    if (hasAll) {
      // Remove all
      setEditingRole({
        ...editingRole,
        permissions: currentPermissions.filter(p => !categoryPermissions.includes(p))
      });
    } else {
      // Add all
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions])];
      setEditingRole({
        ...editingRole,
        permissions: newPermissions
      });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            Role Management
          </h1>
          <p className="text-gray-600 mt-1">Manage roles and permissions for your team</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.length === 0 ? (
          <EmptyState 
            icon={Shield} 
            title="No roles found" 
            message="Create your first role to get started"
          />
        ) : (
          roles.map(role => (
            <div 
              key={role._id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-mono">
                      {role.code}
                    </span>
                    {role.isSystem && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                        <Lock className="w-3 h-3" />
                        System Role
                      </span>
                    )}
                    {!role.isActive && (
                      <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  {role.description && (
                    <p className="text-gray-600 text-sm mb-3">{role.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{role.userCount || 0} users</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>{role.permissions?.length || 0} permissions</span>
                    </div>
                    {role.level && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <span>Level {role.level}</span>
                      </div>
                    )}
                  </div>

                  {/* UI Access Summary */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(role.uiAccess || {}).map(([section, hasAccess]) => (
                      hasAccess && (
                        <span 
                          key={section}
                          className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded capitalize"
                        >
                          {section}
                        </span>
                      )
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit Role"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => role._id && handleDeleteRole(role._id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRole._id ? 'Edit Role' : 'Create New Role'}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Basic Info */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g. Kitchen Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingRole.code}
                      onChange={(e) => setEditingRole({...editingRole, code: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      placeholder="e.g. KITCHEN_MANAGER"
                      disabled={!!(editingRole._id && editingRole.isSystem)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingRole.description || ''}
                    onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="Brief description of this role's responsibilities"
                  />
                </div>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hierarchy Level
                    </label>
                    <input
                      type="number"
                      value={editingRole.level || 1}
                      onChange={(e) => setEditingRole({...editingRole, level: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower number = higher authority</p>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRole.isActive || false}
                        onChange={(e) => setEditingRole({...editingRole, isActive: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* UI Access */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">UI Access Control</h3>
                <p className="text-sm text-gray-600 mb-4">Select which sections this role can access</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {Object.entries({
                    dashboard: 'Dashboard',
                    orders: 'Orders',
                    menu: 'Menu Management',
                    tables: 'Table Management',
                    customers: 'Customers',
                    analytics: 'Analytics',
                    inventory: 'Inventory',
                    staff: 'Staff Management',
                    settings: 'Settings'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRole.uiAccess?.[key as keyof Role['uiAccess']] || false}
                        onChange={() => toggleUIAccess(key as keyof Role['uiAccess'])}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
                <p className="text-sm text-gray-600 mb-4">Select specific permissions for this role</p>
                
                {Object.entries(permissions).map(([category, perms]) => {
                  // Ensure perms is an array
                  const permArray = Array.isArray(perms) ? perms : [];
                  return (
                  <div key={category} className="mb-4 border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedCategories[category] ? 
                          <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        }
                        <h4 className="font-medium text-gray-900 capitalize">{category}</h4>
                        <span className="text-sm text-gray-500">
                          ({permArray.filter(p => editingRole.permissions?.includes(p.code)).length}/{permArray.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllPermissions(category);
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        {permArray.every(p => editingRole.permissions?.includes(p.code)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    
                    {expandedCategories[category] && (
                      <div className="p-4 grid md:grid-cols-2 gap-3">
                        {permArray.map(permission => (
                          <label key={permission.code} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingRole.permissions?.includes(permission.code) || false}
                              onChange={() => togglePermission(permission.code)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">{permission.name}</span>
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                disabled={savingRole}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={savingRole || !editingRole.name || !editingRole.code}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingRole ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;