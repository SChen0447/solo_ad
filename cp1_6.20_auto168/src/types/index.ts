export interface User {
  id: string;
  name: string;
  avatar: string;
  creditScore: number;
}

export interface TimelineEvent {
  type: 'publish' | 'apply' | 'approve' | 'complete' | 'confirm';
  date: string;
  description: string;
  userId?: string;
}

export interface Item {
  id: string;
  userId: string;
  title: string;
  category: 'furniture' | 'books' | 'electronics' | 'kitchen' | 'decor' | 'other';
  conditionScore: number;
  description: string;
  imagePaths: string[];
  status: 'available' | 'exchanging' | 'completed';
  currentOwnerId: string;
  createdAt: string;
  timelines: TimelineEvent[];
}

export interface Exchange {
  id: string;
  fromItemId: string;
  toItemId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  message: string;
  createdAt: string;
}

export interface TrustReview {
  id: string;
  exchangeId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export type CategoryKey = 'furniture' | 'books' | 'electronics' | 'kitchen' | 'decor' | 'other';

export const CATEGORY_CONFIG: Record<CategoryKey, { label: string; color: string }> = {
  furniture: { label: '家具', color: '#ff7e67' },
  books: { label: '书籍', color: '#4ecdc4' },
  electronics: { label: '电子产品', color: '#45b7d1' },
  kitchen: { label: '厨具', color: '#f9ca24' },
  decor: { label: '装饰', color: '#6c5ce7' },
  other: { label: '其他', color: '#fd79a8' },
};

export const CONDITION_LABELS = ['严重磨损', '较旧', '一般', '较新', '全新未拆'];
