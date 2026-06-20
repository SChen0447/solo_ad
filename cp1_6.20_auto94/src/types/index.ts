export type UserRole = 'admin' | 'recycler' | 'reader';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  avatar?: string;
}

export type BookCondition = 1 | 2 | 3 | 4 | 5;

export type BookStatus =
  | '待估值'
  | '竞标中'
  | '已分配'
  | '已入库'
  | '借阅中'
  | '已归还';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  condition: BookCondition;
  conditionDesc?: string;
  coverImage?: string;
  status: BookStatus;
  valuationMin?: number;
  valuationMax?: number;
  createdAt: string;
  updatedAt: string;
  recyclerId?: string;
  recyclerName?: string;
  finalPrice?: number;
  rarity?: number;
}

export interface Bid {
  id: string;
  bookId: string;
  recyclerId: string;
  recyclerName: string;
  amount: number;
  timestamp: string;
  isWinning?: boolean;
}

export interface Auction {
  id: string;
  bookId: string;
  startTime: string;
  endTime: string;
  status: 'open' | 'closed';
  currentHighestBid?: number;
  bids: Bid[];
}

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  reserveDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  qrCode?: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  operatorName: string;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const CONDITION_DESCRIPTIONS: Record<BookCondition, string> = {
  1: '破损严重：封面缺失、内页大量涂鸦或破损，仅供回收处理',
  2: '品相较差：封面磨损、内页有少量污渍或笔记，阅读功能基本完好',
  3: '品相一般：封面轻微磨损、内页干净无笔记，无脱页或水渍',
  4: '品相良好：封面几乎无磨损、内页干净整洁，接近新书状态',
  5: '品相极佳：保存完好、无任何磨损或笔记，近全新状态'
};
