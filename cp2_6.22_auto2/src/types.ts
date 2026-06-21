export type GiftCategory = '手工' | '明信片' | '书籍' | '其他';

export type GiftStatus = 'available' | 'exchanged';

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
  createdAtFormatted: string;
}

export interface GiftDetail extends Gift {
  logistics: LogisticsEntry[];
  exchangeHistory: Exchange[];
}

export interface LogisticsEntry {
  id: string;
  giftId: string;
  company: string;
  trackingNumber: string;
  statusText: string;
  createdAt: string;
  createdAtFormatted: string;
}

export interface Exchange {
  id: string;
  giftAId: string;
  giftBId: string;
  giftAName: string;
  giftBName: string;
  giftACity: string;
  giftBCity: string;
  createdAt: string;
  createdAtFormatted: string;
}

export interface MatchSuggestion {
  giftA: Gift;
  giftB: Gift;
  score: number;
}

export interface Stats {
  total: number;
  exchanged: number;
  inTransit: number;
}
