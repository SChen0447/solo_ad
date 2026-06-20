export type MemberLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Member {
  id: string;
  nickname: string;
  email: string;
  totalSpent: number;
  level: MemberLevel;
  orderHistory: Order[];
  createdAt: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface Drink {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
}

export interface OrderItem {
  drink: Drink;
  toppings: Topping[];
  quantity: number;
  subtotal: number;
}

export type OrderStatus = 'queued' | 'preparing' | 'ready' | 'completed';

export interface Order {
  id: string;
  memberId: string | null;
  items: OrderItem[];
  totalPrice: number;
  queueNumber: number;
  status: OrderStatus;
  estimatedWaitMinutes: number;
  createdAt: number;
}

export interface Recommendation {
  drink: Drink;
  reason: string;
}
