export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'completed';

export interface Order {
  id: string;
  customer: string;
  product: string;
  quantity: number;
  amount: number;
  deadline: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  unit: string;
  supplier: string;
  lastRestock?: string;
}

export type WorkOrderStatus = 'waiting' | 'inProgress' | 'completed';
export type WorkOrderPriority = 'high' | 'normal';

export interface WorkOrder {
  id: string;
  orderId: string;
  startTime: string;
  estimatedEndTime: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  logs: string[];
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  address: string;
  shipDate: string;
  completed: boolean;
}

export interface TrendData {
  date: string;
  orders: number;
  completed: number;
}
