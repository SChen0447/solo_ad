export interface Item {
  id: string;
  name: string;
  description: string;
  images: string[];
  condition: number;
  exchangeType: 'exchange' | 'gift' | 'sell';
  userId: string;
  userName: string;
  status: 'waiting' | 'sent' | 'expired';
  views: number;
  likes: number;
  likedBy: string[];
  createdAt: number;
  expectCondition?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
  publishedItems: string[];
  favoriteItems: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'exchange';
  itemId: string;
  itemName: string;
  fromUserName: string;
  content: string;
  read: boolean;
  createdAt: number;
}

export type ExchangeType = 'exchange' | 'gift' | 'sell';
export type ItemStatus = 'waiting' | 'sent' | 'expired';
export type NotificationType = 'like' | 'comment' | 'exchange';
