import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, FileText, Clock, Users, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { shiftTemplatesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ShiftTemplateModal from './ShiftTemplateModal';

interface ShiftTemplate {
  _id: string;
  name: string;
  description?: string;
  pattern: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  shifts: Array<{
    dayOfWeek: number;
    shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
    scheduledTimes: {
      start: string;
      end: string;
    };
    department?: string;
    position?: string;
    minStaff?: number;
    maxStaff?: number;
  }>;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
}

interface ShiftTemplatesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate?: (templateId: string) => void;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ShiftTemplatesListModal = ({ isOpen, onClose, onApplyTemplate }: ShiftTemplatesListModalProps) => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchPopularTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await shiftTemplatesAPI.getTemplates();
      setTemplates(response.data.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularTemplates = async () => {
    try {
      const response = await shiftTemplatesAPI.getPopularTemplates();
      setPopularTemplates(response.data.data);
    } catch (error) {
      console.error('Failed to load popular templates');
    }
  };

  const handleCreateTemplate = async (template: any) => {
    try {
      await shiftTemplatesAPI.createTemplate(template);
      toast.success('Template created successfully');
      setShowCreateModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (template: any) => {
    if (!selectedTemplate) return;
    
    try {
      await shiftTemplatesAPI.updateTemplate(selectedTemplate._id, template);
      toast.success('Template updated successfully');
      setSelectedTemplate(null);
      setShowCreateModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await shiftTemplatesAPI.deleteTemplate(templateId);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setApplyingTemplate(templateId);
    try {
      const startDate = new Date().toISOString();
      await shiftTemplatesAPI.applyTemplate(templateId, { startDate });
      toast.success('Template applied successfully');
      if (onApplyTemplate) {
        onApplyTemplate(templateId);
      }
      onClose();
    } catch (error) {
      toast.error('Failed to apply template');
    } finally {
      setApplyingTemplate(null);
    }
  };

  const getShiftsSummary = (shifts: any[]) => {
    const dayGroups = shifts.reduce((acc, shift) => {
      if (!acc[shift.dayOfWeek]) acc[shift.dayOfWeek] = 0;
      acc[shift.dayOfWeek]++;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(dayGroups)
      .map(([day, count]) => `${daysOfWeek[parseInt(day)]} (${count})`)
      .join(', ');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Shift Templates</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Popular Templates */}
            {popularTemplates.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Popular Templates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {popularTemplates.map(template => (
                    <div key={template._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{template.name}</h5>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          {template.usageCount} uses
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        {template.lastUsed && `Last used ${format(new Date(template.lastUsed), 'MMM d, yyyy')}`}
                      </div>
                      <button
                        onClick={() => handleApplyTemplate(template._id)}
                        disabled={applyingTemplate === template._id}
                        className="w-full px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
                      >
                        {applyingTemplate === template._id ? 'Applying...' : 'Apply This Week'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Templates */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-900">All Templates</h4>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No templates found</p>
                  <p className="text-sm text-gray-400 mt-1">Create a template to reuse shift patterns</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map(template => (
                    <div key={template._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h5 className="font-medium text-gray-900">{template.name}</h5>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {template.pattern}
                            </span>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          )}
                          <div className="mt-2 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {getShiftsSummary(template.shifts)}
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              {template.shifts.length} shift{template.shifts.length !== 1 ? 's' : ''} total
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleApplyTemplate(template._id)}
                            disabled={applyingTemplate === template._id}
                            className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            {applyingTemplate === template._id ? 'Applying...' : 'Apply'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowCreateModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template._id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Template Modal */}
      {showCreateModal && (
        <ShiftTemplateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSave={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}
          template={selectedTemplate}
        />
      )}
    </>
  );
};

export default ShiftTemplatesListModal;