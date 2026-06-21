export type OrderStatus = 'pending_payment' | 'paid' | 'delivering' | 'completed';
export type DeliveryZone = 'A' | 'B' | 'C';

export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  address: string;
  zone: DeliveryZone;
  status: OrderStatus;
  createdAt: string;
  remark?: string;
  deliveryOrder?: number;
}

export interface DeliveryTask {
  id: string;
  orderId: string;
  zone: DeliveryZone;
  estimatedTime: number;
  deliveryOrder: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Stats {
  totalOrders: number;
  totalAmount: number;
  deliveryRate: number;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  delivering: '配送中',
  completed: '已完成',
};

export const ZONE_COLORS: Record<DeliveryZone, string> = {
  A: '#DBEAFE',
  B: '#DCFCE7',
  C: '#FEF9C3',
};

export const ZONE_LABELS: Record<DeliveryZone, string> = {
  A: 'A区',
  B: 'B区',
  C: 'C区',
};
