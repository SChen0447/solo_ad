export type Branch = 'seaview' | 'mountainview';

export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance';

export interface Guest {
  name: string;
  phone: string;
  idCard: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  branch: Branch;
  status: RoomStatus;
  guest?: Guest;
  checkInTime?: number;
  checkOutTime?: number;
  days?: number;
  deposit?: number;
  orderId?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface ConsumptionItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  timestamp: number;
  operator: string;
}

export interface Order {
  id: string;
  roomId: string;
  branch: Branch;
  guest: Guest;
  checkInTime: number;
  days: number;
  roomRate: number;
  consumptions: ConsumptionItem[];
  totalAmount: number;
  deposit: number;
  status: 'active' | 'settled';
  paymentMethod?: 'cash' | 'wechat' | 'alipay';
  settledAt?: number;
}

export interface User {
  username: string;
  password: string;
  token: string;
}
