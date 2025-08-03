import { useState, useEffect } from 'react';
import {
  X, ChefHat, Plus, Minus, AlertTriangle, Info,
  Flame, Salad, Package, Coffee, CheckCircle,
  Edit, Save, AlertCircle, Clock, ThermometerSun
} from 'lucide-react';
import { recipesAPI, ingredientsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Ingredient {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  canSubstitute: boolean;
  substitutes?: string[];
  allergens?: string[];
}

interface CookingStep {
  stepNumber: number;
  instruction: string;
  duration: number;
  temperature?: number;
  equipment?: string[];
  tips?: string;
}

interface Recipe {
  _id: string;
  menuItemId: string;
  menuItemName: string;
  category: string;
  ingredients: Ingredient[];
  cookingSteps: CookingStep[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  station: string;
  allergens: string[];
  dietary: string[];
  customizations: RecipeCustomization[];
}

interface RecipeCustomization {
  _id: string;
  name: string;
  type: 'spice' | 'cooking' | 'ingredient' | 'portion';
  options: CustomizationOption[];
  impact: {
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    allergens?: string[];
  };
}

interface CustomizationOption {
  _id: string;
  label: string;
  value: string;
  modifyIngredients?: Array<{
    ingredientId: string;
    action: 'add' | 'remove' | 'modify';
    quantity?: number;
    substitute?: string;
  }>;
  modifySteps?: Array<{
    stepNumber: number;
    action: 'add' | 'remove' | 'modify';
    instruction?: string;
    duration?: number;
  }>;
  priceModifier?: number;
}

interface Props {
  menuItemId: string;
  isOpen: boolean;
  onClose: () => void;
  onCustomizationSelected: (customizations: any[]) => void;
  existingCustomizations?: any[];
}

const RecipeCustomization: React.FC<Props> = ({ 
  menuItemId, 
  isOpen, 
  onClose, 
  onCustomizationSelected,
  existingCustomizations = []
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string>>({});
  const [customInstructions, setCustomInstructions] = useState('');
  const [showRecipeDetails, setShowRecipeDetails] = useState(false);
  const [modifiedRecipe, setModifiedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && menuItemId) {
      fetchRecipe();
    }
  }, [isOpen, menuItemId]);

  useEffect(() => {
    // Apply existing customizations
    if (existingCustomizations.length > 0) {
      const customMap: Record<string, string> = {};
      existingCustomizations.forEach(custom => {
        customMap[custom.customizationId] = custom.optionId;
      });
      setSelectedCustomizations(customMap);
    }
  }, [existingCustomizations]);

  const fetchRecipe = async () => {
    try {
      setLoading(true);
      const response = await recipesAPI.getRecipeByMenuItem(menuItemId);
      setRecipe(response.data);
      setModifiedRecipe(response.data);
    } catch (error) {
      toast.error('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const getStationIcon = (station: string) => {
    switch (station) {
      case 'grill': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'salad': return <Salad className="h-4 w-4 text-green-500" />;
      case 'dessert': return <Package className="h-4 w-4 text-pink-500" />;
      case 'beverage': return <Coffee className="h-4 w-4 text-yellow-600" />;
      default: return <ChefHat className="h-4 w-4 text-blue-500" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCustomizationChange = (customizationId: string, optionId: string) => {
    const newCustomizations = { ...selectedCustomizations };
    
    if (newCustomizations[customizationId] === optionId) {
      delete newCustomizations[customizationId];
    } else {
      newCustomizations[customizationId] = optionId;
    }
    
    setSelectedCustomizations(newCustomizations);
    applyCustomizations(newCustomizations);
  };

  const applyCustomizations = (customizations: Record<string, string>) => {
    if (!recipe) return;

    let modifiedRecipe = JSON.parse(JSON.stringify(recipe)); // Deep clone
    let totalPrepTimeModifier = 0;
    let totalCookTimeModifier = 0;
    let additionalAllergens: string[] = [];

    Object.entries(customizations).forEach(([customizationId, optionId]) => {
      const customization = recipe.customizations.find(c => c._id === customizationId);
      if (!customization) return;

      const option = customization.options.find(o => o._id === optionId);
      if (!option) return;

      // Apply ingredient modifications
      if (option.modifyIngredients) {
        option.modifyIngredients.forEach(mod => {
          if (mod.action === 'add') {
            // Add new ingredient
            const newIngredient: Ingredient = {
              _id: `custom-${Date.now()}`,
              name: mod.substitute || 'Custom ingredient',
              quantity: mod.quantity || 0,
              unit: 'unit',
              isOptional: true,
              canSubstitute: false
            };
            modifiedRecipe.ingredients.push(newIngredient);
          } else if (mod.action === 'remove') {
            // Remove ingredient
            modifiedRecipe.ingredients = modifiedRecipe.ingredients.filter(
              (ing: Ingredient) => ing._id !== mod.ingredientId
            );
          } else if (mod.action === 'modify') {
            // Modify ingredient
            const ingredient = modifiedRecipe.ingredients.find((ing: Ingredient) => ing._id === mod.ingredientId);
            if (ingredient) {
              if (mod.quantity !== undefined) ingredient.quantity = mod.quantity;
              if (mod.substitute) ingredient.name = mod.substitute;
            }
          }
        });
      }

      // Apply step modifications
      if (option.modifySteps) {
        option.modifySteps.forEach(mod => {
          if (mod.action === 'add') {
            // Add new step
            const newStep: CookingStep = {
              stepNumber: mod.stepNumber,
              instruction: mod.instruction || '',
              duration: mod.duration || 0
            };
            modifiedRecipe.cookingSteps.push(newStep);
            modifiedRecipe.cookingSteps.sort((a: CookingStep, b: CookingStep) => a.stepNumber - b.stepNumber);
          } else if (mod.action === 'remove') {
            // Remove step
            modifiedRecipe.cookingSteps = modifiedRecipe.cookingSteps.filter(
              (step: CookingStep) => step.stepNumber !== mod.stepNumber
            );
          } else if (mod.action === 'modify') {
            // Modify step
            const step = modifiedRecipe.cookingSteps.find((s: CookingStep) => s.stepNumber === mod.stepNumber);
            if (step) {
              if (mod.instruction) step.instruction = mod.instruction;
              if (mod.duration !== undefined) step.duration = mod.duration;
            }
          }
        });
      }

      // Apply time and allergen impacts
      if (customization.impact) {
        if (customization.impact.prepTime) totalPrepTimeModifier += customization.impact.prepTime;
        if (customization.impact.cookTime) totalCookTimeModifier += customization.impact.cookTime;
        if (customization.impact.allergens) {
          additionalAllergens.push(...customization.impact.allergens);
        }
      }
    });

    // Update times and allergens
    modifiedRecipe.prepTime += totalPrepTimeModifier;
    modifiedRecipe.cookTime += totalCookTimeModifier;
    modifiedRecipe.totalTime = modifiedRecipe.prepTime + modifiedRecipe.cookTime;
    modifiedRecipe.allergens = [...new Set([...modifiedRecipe.allergens, ...additionalAllergens])];

    setModifiedRecipe(modifiedRecipe);
  };

  const handleConfirmCustomizations = () => {
    const customizationData = Object.entries(selectedCustomizations).map(([customizationId, optionId]) => {
      const customization = recipe?.customizations.find(c => c._id === customizationId);
      const option = customization?.options.find(o => o._id === optionId);
      
      return {
        customizationId,
        customizationName: customization?.name,
        optionId,
        optionLabel: option?.label,
        priceModifier: option?.priceModifier || 0,
        modifiedRecipe: modifiedRecipe
      };
    });

    if (customInstructions.trim()) {
      customizationData.push({
        customizationId: 'special-instructions',
        customizationName: 'Special Instructions',
        optionId: 'custom',
        optionLabel: customInstructions,
        priceModifier: 0,
        modifiedRecipe: modifiedRecipe
      });
    }

    onCustomizationSelected(customizationData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChefHat className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-semibold">Recipe Customization</h2>
              </div>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : recipe ? (
              <div className="space-y-6">
                {/* Recipe Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg flex items-center">
                        {recipe.menuItemName}
                        {getStationIcon(recipe.station)}
                      </h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-500" />
                          Prep: {modifiedRecipe?.prepTime || recipe.prepTime}m
                        </span>
                        <span className="flex items-center">
                          <ThermometerSun className="h-4 w-4 mr-1 text-gray-500" />
                          Cook: {modifiedRecipe?.cookTime || recipe.cookTime}m
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getDifficultyColor(recipe.difficulty)
                        }`}>
                          {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRecipeDetails(!showRecipeDetails)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      {showRecipeDetails ? 'Hide' : 'Show'} Recipe Details
                    </button>
                  </div>

                  {/* Allergen Warnings */}
                  {modifiedRecipe && modifiedRecipe.allergens.length > 0 && (
                    <div className="mt-3 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-red-700">Allergens: </span>
                        <span className="text-red-600">
                          {modifiedRecipe.allergens.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recipe Details */}
                {showRecipeDetails && modifiedRecipe && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Ingredients */}
                    <div>
                      <h4 className="font-medium mb-2">Ingredients</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {modifiedRecipe.ingredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                            <span>
                              {ing.quantity} {ing.unit} {ing.name}
                              {ing.isOptional && <span className="text-gray-500"> (optional)</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cooking Steps */}
                    <div>
                      <h4 className="font-medium mb-2">Cooking Steps</h4>
                      <div className="space-y-2">
                        {modifiedRecipe.cookingSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start text-sm">
                            <span className="font-medium mr-2">{step.stepNumber}.</span>
                            <div className="flex-1">
                              <p>{step.instruction}</p>
                              {step.duration > 0 && (
                                <p className="text-gray-500 text-xs">Duration: {step.duration}m</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Customization Options */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Customization Options</h3>
                  
                  {recipe.customizations.map(customization => (
                    <div key={customization._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{customization.name}</h4>
                        <span className="text-sm text-gray-500 capitalize">
                          {customization.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {customization.options.map(option => {
                          const isSelected = selectedCustomizations[customization._id] === option._id;
                          
                          return (
                            <button
                              key={option._id}
                              onClick={() => handleCustomizationChange(customization._id, option._id)}
                              className={`p-3 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{option.label}</span>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-primary-600" />
                                )}
                              </div>
                              {option.priceModifier && option.priceModifier !== 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {option.priceModifier > 0 ? '+' : ''}AED {option.priceModifier.toFixed(2)}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Impact Info */}
                      {customization.impact && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div className="text-xs text-blue-800">
                              {customization.impact.prepTime && (
                                <p>Prep time: {customization.impact.prepTime > 0 ? '+' : ''}{customization.impact.prepTime}m</p>
                              )}
                              {customization.impact.cookTime && (
                                <p>Cook time: {customization.impact.cookTime > 0 ? '+' : ''}{customization.impact.cookTime}m</p>
                              )}
                              {customization.impact.allergens && customization.impact.allergens.length > 0 && (
                                <p>May add allergens: {customization.impact.allergens.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Special Instructions */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Special Instructions</h4>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      placeholder="Any special cooking instructions or preferences..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recipe found for this item</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {Object.keys(selectedCustomizations).length > 0 && (
                  <span>{Object.keys(selectedCustomizations).length} customizations selected</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCustomizations}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Apply Customizations
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCustomization;