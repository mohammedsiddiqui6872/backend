import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Package2, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import { Combo, ComboItem } from '../../types/combo';
import { MenuItem } from '../../types/menu';
import toast from 'react-hot-toast';

interface ComboModalProps {
  isOpen: boolean;
  onClose: () => void;
  combo: Combo | null;
  menuItems: MenuItem[];
  onSave: (data: any) => Promise<void>;
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const ComboModal: React.FC<ComboModalProps> = ({ isOpen, onClose, combo, menuItems, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Combo>>({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    price: 0,
    items: [],
    isActive: true,
    available: true,
    availableDays: [],
    availableStartTime: '',
    availableEndTime: '',
    maxDailyQuantity: -1,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Item form state
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isRequired, setIsRequired] = useState(true);
  const [choiceGroup, setChoiceGroup] = useState('');

  useEffect(() => {
    if (combo) {
      setFormData({
        ...combo,
        items: combo.items.map(item => ({
          ...item,
          menuItem: typeof item.menuItem === 'object' && item.menuItem ? (item.menuItem as any)._id : item.menuItem
        }))
      });
      if (combo.image) {
        setImagePreview(combo.image);
      }
    }
  }, [combo]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    if (!selectedMenuItem) {
      toast.error('Please select a menu item');
      return;
    }

    const newItem: ComboItem = {
      menuItem: selectedMenuItem,
      quantity,
      isRequired,
      choiceGroup: choiceGroup.trim() || undefined,
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));

    // Reset form
    setSelectedMenuItem('');
    setQuantity(1);
    setIsRequired(true);
    setChoiceGroup('');
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || []
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays?.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...(prev.availableDays || []), day]
    }));
  };

  const calculateOriginalPrice = () => {
    return formData.items?.reduce((total, item) => {
      const menuItem = menuItems.find(m => m._id === item.menuItem);
      return total + ((menuItem?.price || 0) * item.quantity);
    }, 0) || 0;
  };

  const calculateSavings = () => {
    const original = calculateOriginalPrice();
    return original - (formData.price || 0);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Please enter a combo name');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      
      const saveData: any = { ...formData };
      
      // Convert image to base64 if new image uploaded
      if (imageFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        saveData.uploadImage = base64;
      }
      
      await onSave(saveData);
    } catch (error) {
      console.error('Error saving combo:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center space-x-2">
                <Package2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {combo ? 'Edit Combo' : 'Create New Combo'}
                </h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Combo Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., Family Meal Deal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arabic Name
                      </label>
                      <input
                        type="text"
                        value={formData.nameAr}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arabic Description
                      </label>
                      <textarea
                        value={formData.descriptionAr}
                        onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        rows={3}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Combo Image
                    </label>
                    <div className="flex items-center space-x-4">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="combo-image-upload"
                        />
                        <label
                          htmlFor="combo-image-upload"
                          className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Choose Image
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Combo Items</h3>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <select
                          value={selectedMenuItem}
                          onChange={(e) => setSelectedMenuItem(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select Item</option>
                          {menuItems.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} (${item.price})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={choiceGroup}
                          onChange={(e) => setChoiceGroup(e.target.value)}
                          placeholder="Choice Group"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">Required</span>
                        </label>
                        <button
                          onClick={addItem}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {formData.items?.map((item, index) => {
                      const menuItem = menuItems.find(m => m._id === item.menuItem);
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <span className="font-medium">{menuItem?.name || 'Unknown'}</span>
                            <span className="text-gray-500 ml-2">x{item.quantity}</span>
                            {item.choiceGroup && (
                              <span className="text-sm text-gray-500 ml-2">({item.choiceGroup})</span>
                            )}
                            {!item.isRequired && (
                              <span className="text-sm text-gray-400 ml-2">(Optional)</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {(!formData.items || formData.items.length === 0) && (
                      <div className="text-center py-4 text-gray-500">
                        No items added yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Combo Price *
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Original Price
                      </label>
                      <input
                        type="text"
                        value={`$${calculateOriginalPrice().toFixed(2)}`}
                        readOnly
                        className="w-full rounded-md bg-gray-100 border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Savings
                      </label>
                      <input
                        type="text"
                        value={`$${calculateSavings().toFixed(2)}`}
                        readOnly
                        className={`w-full rounded-md border-gray-300 ${
                          calculateSavings() > 0 ? 'text-green-600 bg-green-50' : 'bg-gray-100'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Availability</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Available for ordering</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Days
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`p-2 text-xs rounded capitalize ${
                              formData.availableDays?.includes(day)
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={formData.availableStartTime}
                          onChange={(e) => setFormData({ ...formData, availableStartTime: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={formData.availableEndTime}
                          onChange={(e) => setFormData({ ...formData, availableEndTime: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Daily Quantity Limit (-1 for unlimited)
                      </label>
                      <input
                        type="number"
                        value={formData.maxDailyQuantity}
                        onChange={(e) => setFormData({ ...formData, maxDailyQuantity: parseInt(e.target.value) || -1 })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Combo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComboModal;