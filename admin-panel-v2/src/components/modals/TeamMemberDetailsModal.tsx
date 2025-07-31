import { X, Phone, Mail, Calendar, MapPin, Shield, Briefcase, CreditCard, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TeamMemberDetailsModalProps {
  isOpen: boolean;
  member: any;
  onClose: () => void;
}

const TeamMemberDetailsModal = ({ isOpen, member, onClose }: TeamMemberDetailsModalProps) => {
  if (!isOpen) return null;

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Team Member Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="flex items-start space-x-6">
              <img
                className="h-24 w-24 rounded-full object-cover"
                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff`}
                alt={member.name}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
                <p className="text-gray-600">{member.profile?.position || member.role}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {member.profile?.employeeId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{member.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{member.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            {member.profile && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="text-gray-900">{formatDate(member.profile.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="text-gray-900 capitalize">{member.profile.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="text-gray-900">{member.profile.nationality || 'N/A'}</p>
                  </div>
                </div>

                {member.profile.address && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 flex items-center mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      Address
                    </p>
                    <p className="text-gray-900">
                      {[
                        member.profile.address.street,
                        member.profile.address.city,
                        member.profile.address.state,
                        member.profile.address.country,
                        member.profile.address.postalCode
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Employment Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Employment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-gray-900">{member.profile?.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hire Date</p>
                  <p className="text-gray-900">{formatDate(member.profile?.hireDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employment Type</p>
                  <p className="text-gray-900 capitalize">{member.profile?.employmentType || 'N/A'}</p>
                </div>
              </div>

              {member.profile?.salary && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Salary Type</p>
                    <p className="text-gray-900 capitalize">{member.profile.salary.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="text-gray-900">
                      {member.profile.salary.currency} {member.profile.salary.amount}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            {member.metrics && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {member.metrics.totalOrdersServed || 0}
                    </p>
                    <p className="text-sm text-gray-500">Orders Served</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {member.metrics.averageRating?.toFixed(1) || '0.0'}
                    </p>
                    <p className="text-sm text-gray-500">Avg Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {member.metrics.totalHoursWorked || 0}
                    </p>
                    <p className="text-sm text-gray-500">Hours Worked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {member.metrics.punctualityScore || 100}%
                    </p>
                    <p className="text-sm text-gray-500">Punctuality</p>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {member.profile?.emergencyContact && (
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-gray-900">{member.profile.emergencyContact.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Relationship</p>
                    <p className="text-gray-900">{member.profile.emergencyContact.relationship || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{member.profile.emergencyContact.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{member.profile.emergencyContact.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            {member.profile?.documents && member.profile.documents.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documents
                </h3>
                <div className="space-y-2">
                  {member.profile.documents.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">Type: {doc.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {doc.expiryDate && (
                          <p className="text-xs text-gray-500">
                            Expires: {formatDate(doc.expiryDate)}
                          </p>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-500 text-sm"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900">{formatDate(member.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-gray-900">{formatDate(member.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDetailsModal;