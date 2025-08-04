import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateTeamMember, useUploadTeamPhoto } from '../../hooks/queries/useTeamQueries';
import { PersonalInfoForm } from '../team/forms/PersonalInfoForm';
import { EmploymentInfoForm } from '../team/forms/EmploymentInfoForm';
import { AddressForm } from '../team/forms/AddressForm';
import { EmergencyContactForm } from '../team/forms/EmergencyContactForm';
import { BankDetailsForm } from '../team/forms/BankDetailsForm';
import { DocumentsForm } from '../team/forms/DocumentsForm';
import { teamAPI } from '../../services/api';

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onUpdate: () => void;
}

type TabType = 'personal' | 'employment' | 'address' | 'emergency' | 'bank' | 'documents';

export const EditTeamMemberModal: React.FC<EditTeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const updateMemberMutation = useUpdateTeamMember();
  const uploadPhotoMutation = useUploadTeamPhoto();

  useEffect(() => {
    if (member) {
      setFormData({
        ...member,
        profile: {
          ...member.profile,
          address: member.profile?.address || {},
          emergencyContact: member.profile?.emergencyContact || {},
          bankDetails: member.profile?.bankDetails || {},
          salary: member.profile?.salary || {},
          documents: member.profile?.documents || []
        }
      });
    }
  }, [member]);

  const handleFieldChange = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      setFormData({ ...formData, [field]: value });
    } else {
      const newData = { ...formData };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      setFormData(newData);
    }
    
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.role) newErrors.role = 'Role is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateMemberMutation.mutateAsync({
        id: member._id,
        data: formData
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleDocumentUpload = async (file: File, type: string, expiryDate?: string) => {
    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('document', file);
    uploadData.append('type', type);
    if (expiryDate) {
      uploadData.append('expiryDate', expiryDate);
    }

    try {
      // Create a FileList-like object
      const fileList = [file] as any;
      const response = await teamAPI.uploadDocuments(member._id, fileList, type, expiryDate);
      
      const newDocument = {
        type,
        name: file.name,
        url: response.data.url,
        uploadedAt: new Date().toISOString(),
        expiryDate
      };

      // Update documents in formData
      handleFieldChange('profile.documents', [
        ...(formData.profile?.documents || []),
        newDocument
      ]);
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentDelete = (document: any) => {
    const updatedDocs = formData.profile?.documents?.filter(
      (doc: any) => doc.url !== document.url
    ) || [];
    handleFieldChange('profile.documents', updatedDocs);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'address', label: 'Address' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'bank', label: 'Bank' },
    { id: 'documents', label: 'Documents' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'personal' && (
            <PersonalInfoForm
              formData={formData}
              onChange={handleFieldChange}
              errors={errors}
            />
          )}
          
          {activeTab === 'employment' && (
            <EmploymentInfoForm
              formData={formData}
              onChange={handleFieldChange}
              errors={errors}
            />
          )}
          
          {activeTab === 'address' && (
            <AddressForm
              formData={formData}
              onChange={handleFieldChange}
            />
          )}
          
          {activeTab === 'emergency' && (
            <EmergencyContactForm
              formData={formData}
              onChange={handleFieldChange}
            />
          )}
          
          {activeTab === 'bank' && (
            <BankDetailsForm
              formData={formData}
              onChange={handleFieldChange}
            />
          )}
          
          {activeTab === 'documents' && (
            <DocumentsForm
              documents={formData.profile?.documents || []}
              onUpload={handleDocumentUpload}
              onDelete={handleDocumentDelete}
              isUploading={isUploading}
            />
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleFieldChange('isActive', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active Employee
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={updateMemberMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};