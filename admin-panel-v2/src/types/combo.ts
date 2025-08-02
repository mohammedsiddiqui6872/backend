export interface ComboMenuItem {
  _id: string;
  name: string;
  nameAr?: string;
  price: number;
  image?: string;
  available: boolean;
  stockQuantity: number;
}

export interface ComboItem {
  menuItem: string | ComboMenuItem;
  quantity: number;
  isRequired: boolean;
  choiceGroup?: string;
  minChoice?: number;
  maxChoice?: number;
}

export interface Combo {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  items: ComboItem[];
  isActive: boolean;
  available: boolean;
  availableDays?: string[];
  availableStartTime?: string;
  availableEndTime?: string;
  maxDailyQuantity: number;
  currentDailyQuantity: number;
  validFrom?: string;
  validUntil?: string;
  isCurrentlyAvailable?: boolean;
  totalOrders: number;
  totalRevenue: number;
}

export interface ComboInput extends Omit<Combo, '_id' | 'originalPrice' | 'savings' | 'isCurrentlyAvailable' | 'currentDailyQuantity' | 'totalOrders' | 'totalRevenue'> {
  _id?: string;
  uploadImage?: string;
}