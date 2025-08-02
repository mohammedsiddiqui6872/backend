export interface ModifierOption {
  _id?: string;
  name: string;
  nameAr?: string;
  price: number;
  isDefault: boolean;
  calories?: number;
  available: boolean;
  maxQuantity: number;
  displayOrder: number;
}

export interface ModifierGroup {
  _id: string;
  tenantId?: string;
  name: string;
  nameAr?: string;
  description?: string;
  type: 'single' | 'multiple';
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
  displayOrder: number;
  isActive: boolean;
  menuItems?: string[];
  analytics?: {
    totalUsage: number;
    popularOptions: Array<{
      optionName: string;
      count: number;
    }>;
    lastUsed?: Date;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ModifierSelection {
  optionId: string;
  optionName?: string;
  quantity: number;
  price: number;
}

export interface ModifierValidationResult {
  valid: boolean;
  error?: string;
}

export interface ModifierAnalytics {
  name: string;
  totalUsage: number;
  lastUsed?: Date;
  popularOptions: Array<{
    optionName: string;
    count: number;
  }>;
  optionPerformance: Array<{
    name: string;
    price: number;
    usage: number;
    usagePercentage: string;
  }>;
}