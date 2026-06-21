export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  imageUrl: string;
  createdAt: number;
}

export type OrderStatus = 'pending' | 'paid' | 'shipping' | 'completed';

export interface Order {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: number;
}

export interface DailySales {
  date: string;
  amount: number;
}

export interface SalesStats {
  todaySales: number;
  monthlyOrders: number;
  totalProducts: number;
  dailySales: DailySales[];
}
