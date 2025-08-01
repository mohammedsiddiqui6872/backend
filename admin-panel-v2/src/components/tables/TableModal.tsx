import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Table, TableInput, Floor, TableType, TableShape } from '../../types/table';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: TableInput) => Promise<void>;
  table: Table | null;
  loading: boolean;
  floors: Floor[];
}

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  table,
  loading,
  floors
}) => {
  const [formData, setFormData] = useState<TableInput>({
    number: '',
    displayName: '',
    capacity: 4,
    minCapacity: 2,
    maxCapacity: 6,
    type: 'regular',
    shape: 'square',
    status: 'available',
    location: {
      floor: 'main',
      section: 'dining',
      x: 0,
      y: 0,
      rotation: 0
    },
    features: [],
    isCombinable: false,
    combinesWith: [],
    metadata: {},
    isActive: true
  });

  const [combinesWithText, setCombinesWithText] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tableTypes: { value: TableType; label: string; icon: string }[] = [
    { value: 'regular', label: 'Regular', icon: '🪑' },
    { value: 'vip', label: 'VIP', icon: '👑' },
    { value: 'outdoor', label: 'Outdoor', icon: '🌳' },
    { value: 'private', label: 'Private', icon: '🔒' },
    { value: 'bar', label: 'Bar', icon: '🍺' }
  ];

  const tableShapes: { value: TableShape; label: string }[] = [
    { value: 'square', label: 'Square' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'round', label: 'Round' },
    { value: 'oval', label: 'Oval' },
    { value: 'custom', label: 'Custom' }
  ];

  const availableFeatures = [
    { value: 'window_view', label: 'Window View' },
    { value: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
    { value: 'power_outlet', label: 'Power Outlet' },
    { value: 'privacy_screen', label: 'Privacy Screen' },
    { value: 'outdoor_heater', label: 'Outdoor Heater' },
    { value: 'shade_umbrella', label: 'Shade Umbrella' }
  ];

  useEffect(() => {
    if (table) {
      // Check if the table's section exists in the floor
      const tableFloor = floors.find(f => f.id === table.location.floor);
      const sectionExists = tableFloor?.sections.some(s => s.id === table.location.section);
      
      // If section doesn't exist in the floor, use the first available section
      const validSection = sectionExists 
        ? table.location.section 
        : (tableFloor?.sections[0]?.id || table.location.section);

      setFormData({
        _id: table._id,
        number: table.number,
        displayName: table.displayName || '',
        capacity: table.capacity,
        minCapacity: table.minCapacity || table.capacity,
        maxCapacity: table.maxCapacity || table.capacity,
        type: table.type,
        shape: table.shape,
        status: table.status,
        location: {
          ...table.location,
          section: validSection
        },
        features: table.features,
        isCombinable: table.isCombinable,
        combinesWith: table.combinesWith || [],
        metadata: table.metadata || {},
        isActive: table.isActive
      });
      
      // Set the combinesWith text
      setCombinesWithText(table.combinesWith?.join(', ') || '');
    }
  }, [table, floors]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.number.trim()) {
      newErrors.number = 'Table number is required';
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    if (formData.minCapacity && formData.minCapacity > formData.capacity) {
      newErrors.minCapacity = 'Min capacity cannot be greater than capacity';
    }

    if (formData.maxCapacity && formData.maxCapacity < formData.capacity) {
      newErrors.maxCapacity = 'Max capacity cannot be less than capacity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Parse combinesWith from text before saving
      const updatedFormData = {
        ...formData,
        combinesWith: combinesWithText.split(',').map(s => s.trim()).filter(Boolean)
      };
      await onSave(updatedFormData);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.includes(feature)
        ? formData.features.filter(f => f !== feature)
        : [...formData.features, feature]
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {table ? 'Edit Table' : 'Add New Table'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!table}
                />
                {errors.number && (
                  <p className="mt-1 text-sm text-red-600">{errors.number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={`Table ${formData.number}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard Capacity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Capacity
                </label>
                <input
                  type="number"
                  value={formData.minCapacity || ''}
                  onChange={(e) => setFormData({ ...formData, minCapacity: parseInt(e.target.value) || undefined })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {errors.minCapacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.minCapacity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Capacity
                </label>
                <input
                  type="number"
                  value={formData.maxCapacity || ''}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || undefined })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {errors.maxCapacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxCapacity}</p>
                )}
              </div>
            </div>
          </div>

          {/* Type and Shape */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Type & Shape</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Type
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {tableTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 border rounded-lg text-center ${
                        formData.type === type.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-xs">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Table Shape
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {tableShapes.map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, shape: shape.value })}
                      className={`p-2 border rounded-lg text-sm ${
                        formData.shape === shape.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <select
                  value={formData.location.floor}
                  onChange={(e) => {
                    const newFloor = e.target.value;
                    const newFloorData = floors.find(f => f.id === newFloor);
                    const firstSection = newFloorData?.sections[0]?.id || '';
                    
                    setFormData({
                      ...formData,
                      location: { 
                        ...formData.location, 
                        floor: newFloor,
                        section: firstSection // Reset section to first available section
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={formData.location.section}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, section: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {floors
                    .find(f => f.id === formData.location.floor)
                    ?.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
            <div className="space-y-2">
              {availableFeatures.map((feature) => (
                <label key={feature.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.features.includes(feature.value)}
                    onChange={() => handleFeatureToggle(feature.value)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Combinable */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isCombinable}
                onChange={(e) => setFormData({ ...formData, isCombinable: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                This table can be combined with other tables
              </span>
            </label>

            {formData.isCombinable && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Can combine with (comma-separated table numbers)
                </label>
                <input
                  type="text"
                  value={combinesWithText}
                  onChange={(e) => setCombinesWithText(e.target.value)}
                  placeholder="e.g., 2, 3, 4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {table ? 'Update Table' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableModal;