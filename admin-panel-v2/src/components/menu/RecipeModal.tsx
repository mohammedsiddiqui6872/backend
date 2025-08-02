import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, ChefHat, Package, Calculator, Clock, FileText } from 'lucide-react';
import { MenuItem } from '../../types/menu';
import { recipesAPI, ingredientsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem;
  onUpdate?: () => void;
}

interface Ingredient {
  _id: string;
  name: string;
  baseUnit: string;
  currentStock: number;
  costPerUnit: number;
}

interface RecipeIngredient {
  ingredient: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  _id?: string;
  menuItem: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  yieldAmount: number;
  yieldUnit: string;
  totalPrepTime: number;
  totalCookTime: number;
  notes?: string;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, onClose, menuItem, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [instruction, setInstruction] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchRecipe();
      fetchIngredients();
    }
  }, [isOpen, menuItem._id]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipesAPI.getRecipeByMenuItem(menuItem._id);
      
      if (response.data.recipe) {
        // Map populated ingredients to just IDs
        const recipeData = {
          ...response.data.recipe,
          ingredients: response.data.recipe.ingredients.map((ing: any) => ({
            ingredient: ing.ingredient._id || ing.ingredient,
            quantity: ing.quantity,
            unit: ing.unit
          }))
        };
        setRecipe(recipeData);
        setCalculatedCost(response.data.calculatedCost || 0);
        setProfitMargin(response.data.profitMargin || 0);
      } else {
        // Initialize empty recipe
        setRecipe({
          menuItem: menuItem._id,
          ingredients: [],
          instructions: [],
          yieldAmount: 1,
          yieldUnit: 'serving',
          totalPrepTime: 15,
          totalCookTime: 30,
          notes: ''
        });
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch recipe');
        console.error('Error fetching recipe:', error);
      } else {
        // Initialize empty recipe for 404
        setRecipe({
          menuItem: menuItem._id,
          ingredients: [],
          instructions: [],
          yieldAmount: 1,
          yieldUnit: 'serving',
          totalPrepTime: 15,
          totalCookTime: 30,
          notes: ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await ingredientsAPI.getIngredients();
      setIngredients(response.data);
    } catch (error) {
      toast.error('Failed to fetch ingredients');
      console.error('Error fetching ingredients:', error);
    }
  };

  const addIngredient = () => {
    if (!selectedIngredient || !quantity || !unit) {
      toast.error('Please fill all ingredient fields');
      return;
    }

    if (!recipe) return;

    const newIngredient: RecipeIngredient = {
      ingredient: selectedIngredient,
      quantity: parseFloat(quantity),
      unit
    };

    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, newIngredient]
    });

    // Reset form
    setSelectedIngredient('');
    setQuantity('');
    setUnit('');

    // Recalculate cost
    calculateRecipeCost([...recipe.ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    if (!recipe) return;

    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    setRecipe({
      ...recipe,
      ingredients: newIngredients
    });

    // Recalculate cost
    calculateRecipeCost(newIngredients);
  };

  const addInstruction = () => {
    if (!instruction.trim()) {
      toast.error('Please enter an instruction');
      return;
    }

    if (!recipe) return;

    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, instruction.trim()]
    });

    setInstruction('');
  };

  const removeInstruction = (index: number) => {
    if (!recipe) return;

    setRecipe({
      ...recipe,
      instructions: recipe.instructions.filter((_, i) => i !== index)
    });
  };

  const calculateRecipeCost = (recipeIngredients: RecipeIngredient[]) => {
    let totalCost = 0;
    
    recipeIngredients.forEach(ing => {
      const ingredient = ingredients.find(i => i._id === ing.ingredient);
      if (ingredient) {
        totalCost += (ingredient.costPerUnit || 0) * ing.quantity;
      }
    });

    setCalculatedCost(totalCost);
    setProfitMargin(menuItem.price - totalCost);
  };

  const saveRecipe = async () => {
    if (!recipe) return;

    if (recipe.ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    try {
      setSaving(true);
      await recipesAPI.createOrUpdateRecipe(recipe);
      toast.success('Recipe saved successfully');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to save recipe');
      console.error('Error saving recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecipe = async () => {
    if (!recipe?._id) return;

    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      setSaving(true);
      await recipesAPI.deleteRecipe(recipe._id);
      toast.success('Recipe deleted successfully');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to delete recipe');
      console.error('Error deleting recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!recipe || !isOpen) return null;

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
                <ChefHat className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Recipe for {menuItem.name}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
              <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Recipe Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yield Amount
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={recipe.yieldAmount}
                    onChange={(e) => setRecipe({ ...recipe, yieldAmount: parseFloat(e.target.value) || 1 })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="1"
                    step="0.5"
                  />
                  <input
                    type="text"
                    value={recipe.yieldUnit}
                    onChange={(e) => setRecipe({ ...recipe, yieldUnit: e.target.value })}
                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Unit"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Prep Time
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={recipe.totalPrepTime}
                    onChange={(e) => setRecipe({ ...recipe, totalPrepTime: parseInt(e.target.value) || 0 })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">minutes</span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Cook Time
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={recipe.totalCookTime}
                    onChange={(e) => setRecipe({ ...recipe, totalCookTime: parseInt(e.target.value) || 0 })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                  />
                  <span className="text-sm text-gray-500">minutes</span>
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Recipe Cost</p>
                  <p className="text-lg font-semibold text-gray-900">${calculatedCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Selling Price</p>
                  <p className="text-lg font-semibold text-gray-900">${menuItem.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className={`text-lg font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profitMargin.toFixed(2)} ({((profitMargin / menuItem.price) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Ingredients Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Ingredients
              </h3>

              {/* Add Ingredient Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <select
                      value={selectedIngredient}
                      onChange={(e) => setSelectedIngredient(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select Ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing._id} value={ing._id}>
                          {ing.name} (${ing.costPerUnit}/{ing.baseUnit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Quantity"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Unit"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      onClick={addIngredient}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2">
                {recipe.ingredients.map((ing, index) => {
                  const ingredient = ingredients.find(i => i._id === ing.ingredient);
                  return (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <span className="font-medium">{ingredient?.name || 'Unknown'}</span>
                        <span className="text-gray-500 ml-2">
                          {ing.quantity} {ing.unit}
                        </span>
                        {ingredient && (
                          <span className="text-gray-400 ml-2">
                            (${((ingredient.costPerUnit || 0) * ing.quantity).toFixed(2)})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                {recipe.ingredients.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No ingredients added yet
                  </div>
                )}
              </div>
            </div>

            {/* Instructions Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Instructions
              </h3>

              {/* Add Instruction Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                    placeholder="Enter cooking instruction"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    onClick={addInstruction}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Instructions List */}
              <div className="space-y-2">
                {recipe.instructions.map((inst, index) => (
                  <div key={index} className="flex items-start space-x-3 bg-white p-3 rounded-lg border border-gray-200">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="flex-1">{inst}</span>
                    <button
                      onClick={() => removeInstruction(index)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {recipe.instructions.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No instructions added yet
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={recipe.notes || ''}
                onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Additional notes or tips..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {recipe._id && (
                  <button
                    onClick={deleteRecipe}
                    disabled={saving}
                    className="px-4 py-2 text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete Recipe
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRecipe}
                  disabled={saving || recipe.ingredients.length === 0}
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
                      Save Recipe
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecipeModal;