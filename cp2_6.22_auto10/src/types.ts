export type GiftCategory = 'handmade' | 'postcard' | 'book' | 'other';

export const categoryLabels: Record<GiftCategory, string> = {
  handmade: '手工',
  postcard: '明信片',
  book: '书籍',
  other: '其他',
};

export type GiftStatus = 'available' | 'matched' | 'in_transit' | 'exchanged';

export const statusLabels: Record<GiftStatus, string> = {
  available: '待交换',
  matched: '已匹配',
  in_transit: '运输中',
  exchanged: '已交换',
};

export interface Gift {
  id: string;
  name: string;
  photoUrl: string;
  value: number;
  city: string;
  category: GiftCategory;
  owner: string;
  status: GiftStatus;
  createdAt: string;
  exchangeHistory: ExchangeRecord[];
  logistics: LogisticsRecord[];
}

export interface ExchangeRecord {
  id: string;
  giftId: string;
  partnerGiftId: string;
  partnerCity: string;
  partnerOwner: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}

export interface LogisticsRecord {
  id: string;
  giftId: string;
  company: string;
  trackingNumber: string;
  statusText: string;
  timestamp: string;
}

export interface MatchSuggestion {
  id: string;
  gift1: Gift;
  gift2: Gift;
  matchScore: number;
  reasons: string[];
}

export interface CreateGiftDto {
  name: string;
  photoUrl: string;
  value: number;
  city: string;
  category: GiftCategory;
  owner: string;
}

export interface AddLogisticsDto {
  company: string;
  trackingNumber: string;
  statusText: string;
}

export interface DashboardStats {
  totalGifts: number;
  exchangedGifts: number;
  inTransitGifts: number;
}

export interface FormErrors {
  name?: string;
  photoUrl?: string;
  value?: string;
  city?: string;
  category?: string;
  owner?: string;
}
