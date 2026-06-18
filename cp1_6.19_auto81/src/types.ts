export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNo: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'sorted' | 'completed';
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: '水果蔬菜' | '肉禽蛋奶' | '调味品' | '零食饮料';
  price: number;
  stock: number;
}

export interface SortSource {
  userName: string;
  quantity: number;
  checked: boolean;
}

export interface SortItem {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  sources: SortSource[];
}

export interface AppNotification {
  id: string;
  type: 'new_order' | 'cancel' | 'system';
  content: string;
  createdAt: string;
  read: boolean;
}

export interface TodayStats {
  total: number;
  pending: number;
  sorted: number;
  completed: number;
  revenue: number;
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export type ProductCategory = '水果蔬菜' | '肉禽蛋奶' | '调味品' | '零食饮料';
