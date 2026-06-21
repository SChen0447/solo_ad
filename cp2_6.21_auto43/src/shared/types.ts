export type IngredientCategory = 'coffee' | 'milk' | 'flour' | 'sugar' | 'syrup' | 'other';

export const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  coffee: '#6D4C41',
  milk: '#F5F5DC',
  flour: '#FFE0B2',
  sugar: '#FFF9C4',
  syrup: '#F8BBD9',
  other: '#E0E0E0',
};

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  coffee: '咖啡豆',
  milk: '牛奶',
  flour: '面粉',
  sugar: '糖类',
  syrup: '糖浆',
  other: '其他',
};

export interface PriceHistoryEntry {
  id: string;
  date: string;
  price: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  contactInfo: string;
  ingredientId: string;
  priceHistory: PriceHistoryEntry[];
  isPreferred: boolean;
  distance?: string;
}

export type HistoryEntryType = 'in' | 'out' | 'waste';

export interface HistoryEntry {
  id: string;
  ingredientId: string;
  type: HistoryEntryType;
  quantity: number;
  timestamp: string;
  operator: string;
  notes?: string;
  supplierId?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: string;
  currentStock: number;
  threshold: number;
  expiryDate: string;
  createdAt: string;
  lastInboundDate?: string;
  lastOutboundDate?: string;
  dailyConsumptionRate?: number;
}

export interface OrderItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplierId: string;
  supplierName: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  totalAmount: number;
}

export interface WarningItem {
  ingredientId: string;
  ingredientName: string;
  daysLeft: number;
  recommendedQuantity: number;
  unit: string;
}
