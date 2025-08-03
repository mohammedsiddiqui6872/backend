import { useState, useEffect } from 'react';
import {
  ChefHat, Clock, Timer, ThermometerSun, Package,
  Flame, AlertTriangle, Info, CheckCircle, Eye,
  EyeOff, Printer, Share2, Search, Filter,
  BookOpen, List, Grid, ChevronRight, Users,
  Salad, IceCream, Coffee, RefreshCw
} from 'lucide-react';
import { recipesAPI, menuAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Ingredient {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
  preparation?: string;
}

interface CookingStep {
  stepNumber: number;
  instruction: string;
  duration: number;
  temperature?: number;
  equipment?: string[];
  tips?: string;
  criticalPoint?: boolean;
}

interface Recipe {
  _id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string;
  category: string;
  ingredients: Ingredient[];
  cookingSteps: CookingStep[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  station: string;
  equipment: string[];
  allergens: string[];
  dietary: string[];
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  platingInstructions?: string;
  storageInstructions?: string;
  chefNotes?: string;
  videoUrl?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  nameAr: string;
  category: {
    _id: string;
    name: string;
  };
  image?: string;
  price: number;
  isAvailable: boolean;
}

const RecipeDisplay = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showIngredients, setShowIngredients] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [showNutrition, setShowNutrition] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchQuery, selectedCategory, selectedStation, selectedDifficulty]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recipesRes, menuRes] = await Promise.all([
        recipesAPI.getRecipes(),
        menuAPI.getItems()
      ]);

      const recipesData = recipesRes.data || [];
      const menuData = menuRes.data || [];

      // Enhance recipes with menu item data
      const enhancedRecipes = recipesData.map((recipe: Recipe) => {
        const menuItem = menuData.find((item: MenuItem) => item._id === recipe.menuItemId);
        return {
          ...recipe,
          menuItemName: menuItem?.name || recipe.menuItemName,
          menuItemImage: menuItem?.image,
          category: menuItem?.category.name || recipe.category
        };
      });

      setRecipes(enhancedRecipes);
      setMenuItems(menuData);
    } catch (error) {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(recipe =>
        recipe.menuItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    // Station filter
    if (selectedStation !== 'all') {
      filtered = filtered.filter(recipe => recipe.station === selectedStation);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
    }

    setFilteredRecipes(filtered);
  };

  const getStationIcon = (station: string) => {
    switch (station) {
      case 'grill': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'salad': return <Salad className="h-4 w-4 text-green-500" />;
      case 'dessert': return <IceCream className="h-4 w-4 text-pink-500" />;
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

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  const handlePrint = (recipe: Recipe) => {
    // In production, implement actual print functionality
    window.print();
    toast.success('Recipe sent to printer');
  };

  const handleShare = (recipe: Recipe) => {
    // In production, implement actual share functionality
    const shareData = {
      title: recipe.menuItemName,
      text: `Recipe for ${recipe.menuItemName}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Recipe link copied to clipboard');
    }
  };

  const categories = [...new Set(recipes.map(r => r.category))];
  const stations = [...new Set(recipes.map(r => r.station))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-primary-600" />
              Recipe Display System
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              View and manage cooking instructions for all menu items
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes or ingredients..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Station Filter */}
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Stations</option>
            {stations.map(station => (
              <option key={station} value={station}>
                {station.charAt(0).toUpperCase() + station.slice(1)}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {filteredRecipes.length} recipes found
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recipe Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <div key={recipe._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {recipe.menuItemImage && (
                <img
                  src={recipe.menuItemImage}
                  alt={recipe.menuItemName}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium">{recipe.menuItemName}</h3>
                  {getStationIcon(recipe.station)}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTime(recipe.prepTime)}
                  </span>
                  <span className="flex items-center">
                    <ThermometerSun className="h-4 w-4 mr-1" />
                    {formatTime(recipe.cookTime)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {recipe.ingredients.length} ingredients • {recipe.cookingSteps.length} steps
                </p>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Recipe
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePrint(recipe)}
                      className="p-2 text-gray-600 hover:text-gray-800"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShare(recipe)}
                      className="p-2 text-gray-600 hover:text-gray-800"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.map(recipe => (
                <tr key={recipe._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {recipe.menuItemImage && (
                        <img
                          src={recipe.menuItemImage}
                          alt={recipe.menuItemName}
                          className="h-10 w-10 rounded object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {recipe.menuItemName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {recipe.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStationIcon(recipe.station)}
                      <span className="ml-2 text-sm text-gray-900">
                        {recipe.station.charAt(0).toUpperCase() + recipe.station.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Prep: {formatTime(recipe.prepTime)}</div>
                    <div>Cook: {formatTime(recipe.cookTime)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                      {recipe.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRecipe(recipe)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handlePrint(recipe)}
                      className="text-gray-600 hover:text-gray-900 mr-3"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => handleShare(recipe)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Share
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedRecipe(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-primary-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedRecipe.menuItemName}</h2>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Total: {formatTime(selectedRecipe.totalTime)}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Serves: {selectedRecipe.servings}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedRecipe.difficulty === 'easy' ? 'bg-green-500' :
                        selectedRecipe.difficulty === 'medium' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}>
                        {selectedRecipe.difficulty}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="text-white hover:text-gray-200"
                  >
                    <EyeOff className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Toggle Sections */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setShowIngredients(!showIngredients)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      showIngredients ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Ingredients ({selectedRecipe.ingredients.length})
                  </button>
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      showSteps ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Steps ({selectedRecipe.cookingSteps.length})
                  </button>
                  <button
                    onClick={() => setShowNutrition(!showNutrition)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      showNutrition ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Nutrition
                  </button>
                </div>

                {/* Equipment */}
                {selectedRecipe.equipment && selectedRecipe.equipment.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Required Equipment</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.equipment.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens & Dietary */}
                {(selectedRecipe.allergens.length > 0 || selectedRecipe.dietary.length > 0) && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                    {selectedRecipe.allergens.length > 0 && (
                      <div className="flex items-start mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-red-700">Allergens: </span>
                          <span className="text-red-600">{selectedRecipe.allergens.join(', ')}</span>
                        </div>
                      </div>
                    )}
                    {selectedRecipe.dietary.length > 0 && (
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-green-700">Dietary: </span>
                          <span className="text-green-600">{selectedRecipe.dietary.join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ingredients */}
                {showIngredients && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Ingredients</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedRecipe.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Package className="h-4 w-4 text-gray-400 mr-3" />
                          <span className="flex-1">
                            <span className="font-medium">{ingredient.quantity} {ingredient.unit}</span> {ingredient.name}
                            {ingredient.preparation && <span className="text-gray-600"> - {ingredient.preparation}</span>}
                            {ingredient.isOptional && <span className="text-gray-500"> (optional)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cooking Steps */}
                {showSteps && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Cooking Instructions</h3>
                    <div className="space-y-4">
                      {selectedRecipe.cookingSteps.map((step, idx) => (
                        <div key={idx} className={`flex items-start p-4 rounded-lg ${
                          step.criticalPoint ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-medium">
                            {step.stepNumber}
                          </div>
                          <div className="ml-4 flex-1">
                            <p className="text-gray-900">{step.instruction}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              {step.duration > 0 && (
                                <span className="flex items-center text-gray-600">
                                  <Timer className="h-3 w-3 mr-1" />
                                  {formatTime(step.duration)}
                                </span>
                              )}
                              {step.temperature && (
                                <span className="flex items-center text-gray-600">
                                  <ThermometerSun className="h-3 w-3 mr-1" />
                                  {step.temperature}°C
                                </span>
                              )}
                              {step.criticalPoint && (
                                <span className="flex items-center text-red-600 font-medium">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Critical Step
                                </span>
                              )}
                            </div>
                            {step.tips && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                <Info className="h-3 w-3 inline mr-1" />
                                {step.tips}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition */}
                {showNutrition && selectedRecipe.nutritionInfo && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Nutrition Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{selectedRecipe.nutritionInfo.calories}</p>
                        <p className="text-sm text-gray-600">Calories</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{selectedRecipe.nutritionInfo.protein}g</p>
                        <p className="text-sm text-gray-600">Protein</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{selectedRecipe.nutritionInfo.carbs}g</p>
                        <p className="text-sm text-gray-600">Carbs</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{selectedRecipe.nutritionInfo.fat}g</p>
                        <p className="text-sm text-gray-600">Fat</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{selectedRecipe.nutritionInfo.fiber}g</p>
                        <p className="text-sm text-gray-600">Fiber</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="space-y-4">
                  {selectedRecipe.platingInstructions && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Plating Instructions</h4>
                      <p className="text-sm text-green-800">{selectedRecipe.platingInstructions}</p>
                    </div>
                  )}
                  {selectedRecipe.storageInstructions && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Storage Instructions</h4>
                      <p className="text-sm text-blue-800">{selectedRecipe.storageInstructions}</p>
                    </div>
                  )}
                  {selectedRecipe.chefNotes && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-1">Chef's Notes</h4>
                      <p className="text-sm text-purple-800">{selectedRecipe.chefNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => handlePrint(selectedRecipe)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Recipe
                  </button>
                  <button
                    onClick={() => handleShare(selectedRecipe)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDisplay;