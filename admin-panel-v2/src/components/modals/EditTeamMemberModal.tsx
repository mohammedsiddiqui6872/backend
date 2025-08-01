import { useState, useEffect } from 'react';
import { X, Calendar, User, Phone, Mail, Building, MapPin, CreditCard, FileText, AlertCircle, Upload, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamAPI } from '../../services/api';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

interface Salary {
  amount?: number;
  currency?: string;
  type?: string;
}

interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
}

interface Document {
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
  expiryDate?: string;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  profile?: {
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    address?: Address;
    emergencyContact?: EmergencyContact;
    employeeId?: string;
    department?: string;
    position?: string;
    hireDate?: string;
    contractEndDate?: string;
    employmentType?: string;
    supervisor?: string;
    salary?: Salary;
    bankDetails?: BankDetails;
    notes?: string;
    documents?: Document[];
  };
  shiftPreferences?: {
    preferredShifts?: string[];
    maxHoursPerWeek?: number;
  };
}

interface EditTeamMemberModalProps {
  isOpen: boolean;
  member: TeamMember;
  onClose: () => void;
  onEdit: (data: any) => void;
  supervisors?: Array<{ _id: string; name: string; role: string }>;
}

const EditTeamMemberModal = ({ isOpen, member, onClose, onEdit, supervisors = [] }: EditTeamMemberModalProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    email: '',
    role: 'waiter',
    phone: '',
    isActive: true,
    password: '',
    
    // Profile Information
    profile: {
      dateOfBirth: '',
      gender: '',
      nationality: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      },
      employeeId: '',
      department: '',
      position: '',
      hireDate: '',
      contractEndDate: '',
      employmentType: 'full-time',
      supervisor: '',
      salary: {
        amount: 0,
        currency: 'AED',
        type: 'monthly'
      },
      bankDetails: {
        accountName: '',
        accountNumber: '',
        bankName: '',
        iban: ''
      },
      notes: ''
    },
    
    // Shift Preferences
    shiftPreferences: {
      preferredShifts: [] as string[],
      maxHoursPerWeek: 40
    }
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        phone: member.phone || '',
        isActive: member.isActive,
        password: '',
        profile: {
          dateOfBirth: member.profile?.dateOfBirth ? new Date(member.profile.dateOfBirth).toISOString().split('T')[0] : '',
          gender: member.profile?.gender || '',
          nationality: member.profile?.nationality || '',
          address: {
            street: member.profile?.address?.street || '',
            city: member.profile?.address?.city || '',
            state: member.profile?.address?.state || '',
            country: member.profile?.address?.country || '',
            postalCode: member.profile?.address?.postalCode || ''
          },
          emergencyContact: {
            name: member.profile?.emergencyContact?.name || '',
            relationship: member.profile?.emergencyContact?.relationship || '',
            phone: member.profile?.emergencyContact?.phone || '',
            email: member.profile?.emergencyContact?.email || ''
          },
          employeeId: member.profile?.employeeId || '',
          department: member.profile?.department || '',
          position: member.profile?.position || '',
          hireDate: member.profile?.hireDate ? new Date(member.profile.hireDate).toISOString().split('T')[0] : '',
          contractEndDate: member.profile?.contractEndDate ? new Date(member.profile.contractEndDate).toISOString().split('T')[0] : '',
          employmentType: member.profile?.employmentType || 'full-time',
          supervisor: member.profile?.supervisor || '',
          salary: {
            amount: member.profile?.salary?.amount || 0,
            currency: member.profile?.salary?.currency || 'AED',
            type: member.profile?.salary?.type || 'monthly'
          },
          bankDetails: {
            accountName: member.profile?.bankDetails?.accountName || '',
            accountNumber: member.profile?.bankDetails?.accountNumber || '',
            bankName: member.profile?.bankDetails?.bankName || '',
            iban: member.profile?.bankDetails?.iban || ''
          },
          notes: member.profile?.notes || ''
        },
        shiftPreferences: {
          preferredShifts: member.shiftPreferences?.preferredShifts || [],
          maxHoursPerWeek: member.shiftPreferences?.maxHoursPerWeek || 40
        }
      });
    }
  }, [member]);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const response = await teamAPI.uploadDocuments(member._id, e.target.files!, type);
      toast.success('Document uploaded successfully');
      // Refresh member data to show new documents
      window.location.reload();
    } catch (error) {
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentDelete = async (doc: Document) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // TODO: Implement document deletion API
      toast.success('Document deleted successfully');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Only include password if it's been changed
    const updateData: any = { ...formData };
    if (!updateData.password) {
      delete updateData.password;
    }
    
    onEdit(updateData);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'personal', label: 'Personal Info', icon: Calendar },
    { id: 'employment', label: 'Employment', icon: Building },
    { id: 'emergency', label: 'Emergency', icon: AlertCircle },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: FileText },
    { id: 'documents', label: 'Documents', icon: Upload },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Edit Team Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    mr-2 h-5 w-5
                    ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.profile.employeeId}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, employeeId: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="waiter">Waiter</option>
                      <option value="chef">Chef</option>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="host">Host</option>
                      <option value="bartender">Bartender</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Password (Leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Enter new password if changing"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
            )}

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.profile.dateOfBirth}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, dateOfBirth: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      value={formData.profile.gender}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, gender: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.profile.nationality}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, nationality: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Address</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Street
                    </label>
                    <input
                      type="text"
                      value={formData.profile.address.street}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          address: { ...formData.profile.address, street: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.profile.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            address: { ...formData.profile.address, city: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={formData.profile.address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            address: { ...formData.profile.address, state: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.profile.address.country}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            address: { ...formData.profile.address, country: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={formData.profile.address.postalCode}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            address: { ...formData.profile.address, postalCode: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {activeTab === 'employment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <select
                      value={formData.profile.department}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, department: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select Department</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Service">Service</option>
                      <option value="Management">Management</option>
                      <option value="Bar">Bar</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.profile.position}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, position: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      value={formData.profile.hireDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, hireDate: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employment Type
                    </label>
                    <select
                      value={formData.profile.employmentType}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, employmentType: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={formData.profile.contractEndDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, contractEndDate: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Leave empty for permanent employees"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <UserCheck className="inline h-4 w-4 mr-1" />
                      Reports To (Supervisor)
                    </label>
                    <select
                      value={formData.profile.supervisor}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: { ...formData.profile, supervisor: e.target.value }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Select Supervisor</option>
                      {supervisors.map(sup => (
                        <option key={sup._id} value={sup._id}>
                          {sup.name} - {sup.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Salary Information</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={formData.profile.salary.amount}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            salary: { ...formData.profile.salary, amount: parseFloat(e.target.value) || 0 }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        value={formData.profile.salary.currency}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            salary: { ...formData.profile.salary, currency: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="AED">AED</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pay Type
                      </label>
                      <select
                        value={formData.profile.salary.type}
                        onChange={(e) => setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            salary: { ...formData.profile.salary, type: e.target.value }
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="hourly">Hourly</option>
                        <option value="weekly">Weekly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.profile.notes}
                    onChange={(e) => setFormData({
                      ...formData,
                      profile: { ...formData.profile, notes: e.target.value }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Emergency Contact Tab */}
            {activeTab === 'emergency' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Emergency Contact Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.profile.emergencyContact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          emergencyContact: { ...formData.profile.emergencyContact, name: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={formData.profile.emergencyContact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          emergencyContact: { ...formData.profile.emergencyContact, relationship: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.profile.emergencyContact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          emergencyContact: { ...formData.profile.emergencyContact, phone: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.profile.emergencyContact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          emergencyContact: { ...formData.profile.emergencyContact, email: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Banking Tab */}
            {activeTab === 'banking' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Bank Account Information</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={formData.profile.bankDetails.accountName}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          bankDetails: { ...formData.profile.bankDetails, accountName: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.profile.bankDetails.accountNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          bankDetails: { ...formData.profile.bankDetails, accountNumber: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.profile.bankDetails.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          bankDetails: { ...formData.profile.bankDetails, bankName: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={formData.profile.bankDetails.iban}
                      onChange={(e) => setFormData({
                        ...formData,
                        profile: {
                          ...formData.profile,
                          bankDetails: { ...formData.profile.bankDetails, iban: e.target.value }
                        }
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Shifts
                  </label>
                  <div className="space-y-2">
                    {['morning', 'afternoon', 'evening', 'night'].map(shift => (
                      <label key={shift} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftPreferences.preferredShifts.includes(shift)}
                          onChange={(e) => {
                            const preferredShifts = e.target.checked
                              ? [...formData.shiftPreferences.preferredShifts, shift]
                              : formData.shiftPreferences.preferredShifts.filter(s => s !== shift);
                            setFormData({
                              ...formData,
                              shiftPreferences: { ...formData.shiftPreferences, preferredShifts }
                            });
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{shift}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Maximum Hours Per Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.shiftPreferences.maxHoursPerWeek}
                    onChange={(e) => setFormData({
                      ...formData,
                      shiftPreferences: {
                        ...formData.shiftPreferences,
                        maxHoursPerWeek: parseInt(e.target.value) || 40
                      }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4 min-h-[400px]">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <p className="text-sm text-gray-600">Upload and manage employee documents</p>
                </div>

                {/* Current Documents */}
                {member.profile?.documents && member.profile.documents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Current Documents</h4>
                    <div className="space-y-2">
                      {member.profile.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                Type: {doc.type} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                {doc.expiryDate && ` • Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDocumentDelete(doc)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Documents */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Upload New Documents</h4>
                  
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CreditCard className="inline h-4 w-4 mr-1" />
                        Emirates ID
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="emirates-id-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                              <span>Upload file</span>
                              <input
                                id="emirates-id-upload"
                                name="emirates-id-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload(e, 'id')}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Passport
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="passport-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                              <span>Upload file</span>
                              <input
                                id="passport-upload"
                                name="passport-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload(e, 'passport')}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Visa / Work Permit
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="visa-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                              <span>Upload file</span>
                              <input
                                id="visa-upload"
                                name="visa-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload(e, 'visa')}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="inline h-4 w-4 mr-1" />
                        Other Documents
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="other-upload" className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                              <span>Upload file</span>
                              <input
                                id="other-upload"
                                name="other-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload(e, 'other')}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTeamMemberModal;