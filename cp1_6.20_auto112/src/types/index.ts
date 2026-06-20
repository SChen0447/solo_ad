export type UserRole = 'designer' | 'customer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Material {
  id: number;
  name: string;
  coefficient: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  thumbnail: string;
  basePrice: number;
  defaultDuration: number;
  materials: Material[];
  designerId: number;
  designerName: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'production' | 'quality' | 'shipping' | 'completed';

export interface StatusHistory {
  status: OrderStatus;
  timestamp: string;
  remark?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  productId: number;
  productName: string;
  customerId: number;
  customerName: string;
  designerId: number;
  designerName: string;
  designImage: string;
  size: string;
  quantity: number;
  materialId: number;
  materialName: string;
  materialCoefficient: number;
  remark: string;
  basePrice: number;
  totalPrice: number;
  estimatedDays: number;
  estimatedFinishDate: string;
  status: OrderStatus;
  statusHistory: StatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  basePrice: number;
  coefficient: number;
  quantity: number;
  defaultDuration: number;
}

export interface QuoteResult {
  totalPrice: number;
  estimatedDays: number;
  estimatedFinishDate: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; text: string }> = {
  pending: { label: '待确认', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.12)', text: 'status-pending' },
  production: { label: '生产中', color: '#3498db', bg: 'rgba(52, 152, 219, 0.12)', text: 'status-production' },
  quality: { label: '质检', color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.12)', text: 'status-quality' },
  shipping: { label: '配送', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.12)', text: 'status-shipping' },
  completed: { label: '完成', color: '#95a5a6', bg: 'rgba(149, 165, 166, 0.12)', text: 'status-completed' },
};

export const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  pending: 'production',
  production: 'quality',
  quality: 'shipping',
  shipping: 'completed',
  completed: null,
};

export const STATUS_ORDER: OrderStatus[] = ['pending', 'production', 'quality', 'shipping', 'completed'];
