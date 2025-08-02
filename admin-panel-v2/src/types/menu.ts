// Shared types for menu management

export interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  slug: string;
  icon: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  description?: string;
  descriptionAr?: string;
  tenantId?: string;
}

export interface MenuItem {
  _id: string;
  id: number;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  cost?: number;
  description: string;
  descriptionAr?: string;
  image?: string;
  images?: string[];
  available: boolean;
  inStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQuantity: number;
  allergens?: string[];
  dietary?: string[];
  prepTime?: number;
  rating?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isSpecial?: boolean;
  discount?: number;
  recommended?: boolean;
  featured?: boolean;
  customizations?: any;
  tags?: string[];
  tenantId?: string;
}

// For creating new items where _id doesn't exist yet
export interface CategoryInput extends Omit<Category, '_id' | 'slug'> {
  _id?: string;
  slug?: string;
  uploadImage?: string;
}

export interface MenuItemInput extends Omit<MenuItem, '_id' | 'id'> {
  _id?: string;
  id?: number;
  uploadImage?: string;
}