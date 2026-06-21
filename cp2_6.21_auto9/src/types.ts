export interface Member {
  id: string;
  nickname: string;
  email: string;
  level: MemberLevel;
  totalSpent: number;
  points: number;
}

export type MemberLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Drink {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  icon: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  drinkId: string;
  drinkName: string;
  price: number;
  toppings: string[];
  toppingNames: string[];
}

export interface Order {
  id: string;
  orderNumber: number;
  memberId: string;
  items: OrderItem[];
  status: 'queued' | 'preparing' | 'ready' | 'completed';
  queuePosition: number;
  estimatedWaitTime: number;
  totalPrice: number;
  createdAt: string;
}

export interface QueueInfo {
  totalInQueue: number;
  orders: {
    id: string;
    orderNumber: number;
    status: string;
    queuePosition: number;
    estimatedWaitTime: number;
  }[];
}

export interface Recommendation {
  drinkId: string;
  drinkName: string;
  reason: string;
  icon: string;
  price: number;
}

export interface CartItem {
  drinkId: string;
  drinkName: string;
  price: number;
  basePrice: number;
  toppings: string[];
  toppingNames: string[];
  quantity: number;
}

export const LEVEL_COLORS: Record<MemberLevel, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export const LEVEL_NAMES: Record<MemberLevel, string> = {
  bronze: '青铜会员',
  silver: '白银会员',
  gold: '黄金会员',
  platinum: '铂金会员',
  diamond: '钻石会员',
};

export const LEVEL_THRESHOLDS: { level: MemberLevel; min: number; max: number }[] = [
  { level: 'bronze', min: 0, max: 99 },
  { level: 'silver', min: 100, max: 299 },
  { level: 'gold', min: 300, max: 699 },
  { level: 'platinum', min: 700, max: 1499 },
  { level: 'diamond', min: 1500, max: Infinity },
];
