export type OrderStatus = 'pending' | 'confirmed' | 'rejected' | 'returned';

export type ItemStatus = 'available' | 'rented' | 'maintenance';

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface RentalItem {
  id: string;
  name: string;
  pricePerDay: number;
  totalStock: number;
  rentedCount: number;
  status: ItemStatus;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  pricePerDay: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  rentalDays: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  returnedItems?: string[];
}

export const INITIAL_ITEMS: Omit<RentalItem, 'id'>[] = [
  { name: '办公椅', pricePerDay: 5, totalStock: 20, rentedCount: 0, status: 'available' },
  { name: '投影仪', pricePerDay: 30, totalStock: 10, rentedCount: 0, status: 'available' },
  { name: '饮水机', pricePerDay: 8, totalStock: 15, rentedCount: 0, status: 'available' },
  { name: '打印机', pricePerDay: 25, totalStock: 8, rentedCount: 0, status: 'available' },
  { name: '笔记本电脑', pricePerDay: 40, totalStock: 12, rentedCount: 0, status: 'available' },
  { name: '会议桌', pricePerDay: 15, totalStock: 6, rentedCount: 0, status: 'available' },
  { name: '文件柜', pricePerDay: 6, totalStock: 18, rentedCount: 0, status: 'available' },
  { name: '白板', pricePerDay: 4, totalStock: 25, rentedCount: 0, status: 'available' },
];
