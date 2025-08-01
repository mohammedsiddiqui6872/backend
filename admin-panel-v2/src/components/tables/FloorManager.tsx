import { useState, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Layers, Save, Loader2, Upload, Image } from 'lucide-react';
import { TableLayout, Floor, Section } from '../../types/table';
import { tableAPI } from '../../services/tableAPI';

interface FloorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  layout: TableLayout;
  onUpdate: () => Promise<void>;
}

interface FloorFormData {
  name: string;
  displayOrder: number;
  dimensions: {
    width: number;
    height: number;
  };
  backgroundImage?: string;
}

interface SectionFormData {
  name: string;
  color: string;
}

const FloorManager: React.FC<FloorManagerProps> = ({
  isOpen,
  onClose,
  layout,
  onUpdate
}) => {
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [floorForm, setFloorForm] = useState<FloorFormData>({
    name: '',
    displayOrder: 0,
    dimensions: { width: 1000, height: 800 }
  });

  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    name: '',
    color: '#6B7280'
  });

  const predefinedColors = [
    '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFloorForm({ ...floorForm, backgroundImage: base64String });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeBackgroundImage = () => {
    setFloorForm({ ...floorForm, backgroundImage: undefined });
  };

  const handleAddFloor = async () => {
    try {
      setLoading(true);
      await tableAPI.addFloor({
        ...floorForm,
        sections: []
      });
      await onUpdate();
      setShowFloorForm(false);
      setFloorForm({ name: '', displayOrder: 0, dimensions: { width: 1000, height: 800 } });
    } catch (error) {
      console.error('Error adding floor:', error);
      alert('Failed to add floor');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFloor = async () => {
    if (!editingFloor) return;

    try {
      setLoading(true);
      await tableAPI.updateFloor(editingFloor.id, {
        name: floorForm.name,
        displayOrder: floorForm.displayOrder,
        dimensions: floorForm.dimensions,
        backgroundImage: floorForm.backgroundImage
      });
      await onUpdate();
      setEditingFloor(null);
      setFloorForm({ name: '', displayOrder: 0, dimensions: { width: 1000, height: 800 } });
    } catch (error) {
      console.error('Error updating floor:', error);
      alert('Failed to update floor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    if (!window.confirm('Are you sure you want to delete this floor? All tables on this floor will need to be reassigned.')) {
      return;
    }

    try {
      setLoading(true);
      await tableAPI.deleteFloor(floorId);
      await onUpdate();
      if (selectedFloor?.id === floorId) {
        setSelectedFloor(null);
      }
    } catch (error) {
      console.error('Error deleting floor:', error);
      alert('Failed to delete floor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async () => {
    if (!selectedFloor) return;

    try {
      setLoading(true);
      await tableAPI.addSection(selectedFloor.id, {
        ...sectionForm,
        tables: []
      });
      await onUpdate();
      setShowSectionForm(false);
      setSectionForm({ name: '', color: '#6B7280' });
    } catch (error) {
      console.error('Error adding section:', error);
      alert('Failed to add section');
    } finally {
      setLoading(false);
    }
  };

  const startEditFloor = (floor: Floor) => {
    setEditingFloor(floor);
    setFloorForm({
      name: floor.name,
      displayOrder: floor.displayOrder,
      dimensions: floor.dimensions,
      backgroundImage: floor.backgroundImage
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Floor & Section Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Floors */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Floors</h3>
              <button
                onClick={() => setShowFloorForm(true)}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Floor
              </button>
            </div>

            <div className="space-y-2">
              {layout.floors.map((floor) => (
                <div
                  key={floor.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedFloor?.id === floor.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedFloor(floor)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{floor.name}</h4>
                      <p className="text-sm text-gray-500">
                        {floor.dimensions.width} × {floor.dimensions.height}px
                      </p>
                      <p className="text-sm text-gray-500">
                        {floor.sections.length} sections
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditFloor(floor);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {layout.floors.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFloor(floor.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Floor Form */}
            {(showFloorForm || editingFloor) && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">
                  {editingFloor ? 'Edit Floor' : 'New Floor'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Name
                    </label>
                    <input
                      type="text"
                      value={floorForm.name}
                      onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Ground Floor"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        value={floorForm.dimensions.width}
                        onChange={(e) => setFloorForm({
                          ...floorForm,
                          dimensions: { ...floorForm.dimensions, width: parseInt(e.target.value) || 1000 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        value={floorForm.dimensions.height}
                        onChange={(e) => setFloorForm({
                          ...floorForm,
                          dimensions: { ...floorForm.dimensions, height: parseInt(e.target.value) || 800 }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  {/* Background Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Plan Image
                    </label>
                    <div className="space-y-2">
                      {floorForm.backgroundImage ? (
                        <div className="relative">
                          <img 
                            src={floorForm.backgroundImage} 
                            alt="Floor plan" 
                            className="w-full h-32 object-cover rounded-md border border-gray-300"
                          />
                          <button
                            onClick={removeBackgroundImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-gray-400"
                        >
                          {uploadingImage ? (
                            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-500">Click to upload floor plan</p>
                              <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowFloorForm(false);
                        setEditingFloor(null);
                        setFloorForm({ name: '', displayOrder: 0, dimensions: { width: 1000, height: 800 } });
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingFloor ? handleUpdateFloor : handleAddFloor}
                      disabled={loading || !floorForm.name}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {editingFloor ? 'Update' : 'Add'} Floor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedFloor ? `${selectedFloor.name} Sections` : 'Sections'}
              </h3>
              {selectedFloor && (
                <button
                  onClick={() => setShowSectionForm(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </button>
              )}
            </div>

            {selectedFloor ? (
              <div className="space-y-2">
                {selectedFloor.sections.map((section) => (
                  <div
                    key={section.id}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded mr-3"
                          style={{ backgroundColor: section.color }}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{section.name}</h4>
                          <p className="text-sm text-gray-500">
                            {section.tables.length} tables
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedFloor.sections.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No sections added yet
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Select a floor to view its sections
              </p>
            )}

            {/* Section Form */}
            {showSectionForm && selectedFloor && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">New Section</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Name
                    </label>
                    <input
                      type="text"
                      value={sectionForm.name}
                      onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Main Dining"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSectionForm({ ...sectionForm, color })}
                          className={`w-8 h-8 rounded border-2 ${
                            sectionForm.color === color
                              ? 'border-gray-900'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowSectionForm(false);
                        setSectionForm({ name: '', color: '#6B7280' });
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSection}
                      disabled={loading || !sectionForm.name}
                      className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Add Section
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Layout Settings */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grid Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={layout.gridSize.width}
                  onChange={(e) => tableAPI.updateLayout({
                    gridSize: { ...layout.gridSize, width: parseInt(e.target.value) || 20 }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Width"
                />
                <input
                  type="number"
                  value={layout.gridSize.height}
                  onChange={(e) => tableAPI.updateLayout({
                    gridSize: { ...layout.gridSize, height: parseInt(e.target.value) || 20 }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Height"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Table Capacity
              </label>
              <input
                type="number"
                value={layout.defaultCapacity}
                onChange={(e) => tableAPI.updateLayout({
                  defaultCapacity: parseInt(e.target.value) || 4
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloorManager;