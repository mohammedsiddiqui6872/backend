export interface MenuChannel {
  _id: string;
  tenantId: string;
  name: 'dine-in' | 'takeaway' | 'delivery' | 'drive-thru' | 'catering' | 'online' | 'mobile-app' | 'third-party';
  displayName: string;
  description?: string;
  isActive: boolean;
  icon?: string;
  color?: string;
  settings: {
    requiresTable?: boolean;
    requiresCustomerInfo?: boolean;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    deliveryFee?: number;
    packagingFee?: number;
    estimatedTime?: {
      min: number;
      max: number;
    };
    thirdPartyConfig?: {
      platform?: string;
      storeId?: string;
      commission?: number;
      autoSync?: boolean;
    };
  };
  operatingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    };
  };
  menuCustomization?: {
    hiddenCategories?: string[];
    hiddenItems?: string[];
    priceAdjustment?: {
      type: 'none' | 'percentage' | 'fixed';
      value: number;
    };
    limitedTimeOffers?: Array<{
      itemId: string;
      startDate: Date;
      endDate: Date;
      specialPrice: number;
    }>;
  };
  analytics?: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
  };
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelAvailability {
  channel: string | MenuChannel;
  isAvailable: boolean;
  customPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  customPrepTime?: number;
}

export interface ChannelMenuItem {
  _id: string;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  channelPrice?: number;
  channelPrepTime?: number;
  minQuantity?: number;
  maxQuantity?: number;
  image?: string;
  available: boolean;
  channelAvailability?: ChannelAvailability[];
}

export interface ChannelInput {
  name: string;
  displayName: string;
  description?: string;
  isActive?: boolean;
  icon?: string;
  color?: string;
  settings?: MenuChannel['settings'];
  operatingHours?: MenuChannel['operatingHours'];
  menuCustomization?: MenuChannel['menuCustomization'];
  displayOrder?: number;
}