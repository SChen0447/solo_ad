export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  status: 'active' | 'cancelled';
}

export interface User {
  id: string;
  name: string;
}

export interface UserBreakdownItem {
  userId: string;
  userName: string;
  quantity: number;
  picked: boolean;
  pickedAt?: string;
}

export interface MergedOrderItem {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  userBreakdown: UserBreakdownItem[];
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

export interface Stats {
  totalOrders: number;
  totalProducts: number;
  totalAmount: number;
  pickedRate: number;
}

export type PickupFilter = 'all' | 'unpicked' | 'picked';
