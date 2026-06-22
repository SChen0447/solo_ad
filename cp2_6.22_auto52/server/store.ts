import { v4 as uuidv4 } from 'uuid';
import type { Room, Order, User, MenuItem, Branch } from './types';

export const menuItems: MenuItem[] = [
  { id: 'beer', name: '啤酒', price: 20 },
  { id: 'water', name: '矿泉水', price: 5 },
  { id: 'cola', name: '可乐', price: 8 },
  { id: 'snack', name: '零食', price: 15 },
];

const createRooms = (branch: Branch, prefix: string, count: number): Room[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${branch}-${prefix}${i + 1}`,
    roomNumber: `${prefix}${i + 1}`,
    branch,
    status: i < 2 ? 'occupied' : i < 3 ? 'cleaning' : i < 4 ? 'maintenance' : 'vacant',
  }));
};

export const rooms: Room[] = [
  ...createRooms('seaview', 'S', 8),
  ...createRooms('mountainview', 'M', 8),
];

export const orders: Order[] = [];

export const users: User[] = [];

export const tokens = new Map<string, string>();

export const generateToken = (): string => uuidv4();

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomDelay = (): Promise<void> =>
  delay(Math.floor(Math.random() * 51) + 50);
