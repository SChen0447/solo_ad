export type GiftCategory = 'handmade' | 'postcard' | 'book' | 'other';

export type GiftStatus = 'available' | 'matched' | 'in_transit' | 'exchanged';

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
