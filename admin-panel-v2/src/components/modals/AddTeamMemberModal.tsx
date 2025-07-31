import { useState } from 'react';
import { X, User, Mail, Phone, Briefcase, Building, Calendar } from 'lucide-react';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}

const AddTeamMemberModal = ({ isOpen, onClose, onAdd }: AddTeamMemberModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter',
    phone: '',
    isActive: true,
    profile: {
      employeeId: '',
      department: '',
      position: '',
      hireDate: new Date().toISOString().split('T')[0],
      employmentType: 'full-time',
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
      salary: {
        amount: '',
        currency: 'AED',
        type: 'monthly'
      }
    }
  });

  const [activeTab, setActiveTab] = useState('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty profile fields
    const cleanedData = {
      ...formData,
      profile: {
        ...formData.profile,
        salary: formData.profile.salary.amount ? {
          ...formData.profile.salary,
          amount: parseFloat(formData.profile.salary.amount)
        } : undefined
      }
    };
    
    onAdd(cleanedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Basic Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('employment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'employment'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Employment Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'personal'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('emergency')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'emergency'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Emergency Contact
              </button>
            </nav>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <User className="inline h-4 w-4 mr-1" />
                      Name *
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
                      <Mail className="inline h-4 w-4 mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <Phone className="inline h-4 w-4 mr-1" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="chef">Chef</option>
                      <option value="waiter">Waiter</option>
                      <option value="cashier">Cashier</option>
                      <option value="host">Host</option>
                      <option value="bartender">Bartender</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center h-10">
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
                </div>
              </div>
            )}

            {/* Employment Details Tab */}
            {activeTab === 'employment' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <Building className="inline h-4 w-4 mr-1" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <Briefcase className="inline h-4 w-4 mr-1" />
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <Calendar className="inline h-4 w-4 mr-1" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Salary Information</h4>
                  <div className="grid grid-cols-3 gap-4">
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
                            salary: { ...formData.profile.salary, amount: e.target.value }
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
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
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
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
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

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Address</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Street Address
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

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-2 gap-4">
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
              </div>
            )}

            {/* Emergency Contact Tab */}
            {activeTab === 'emergency' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
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
              Add Team Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeamMemberModal;