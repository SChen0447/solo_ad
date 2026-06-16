export interface GiftItem {
  id: string;
  name: string;
  iconUrl: string;
  value: number;
}

export interface GiftEvent {
  giftId: string;
  giftName: string;
  giftIconUrl: string;
  giftValue: number;
  senderName: string;
  targetName: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  giftCount: number;
  totalValue: number;
  rankChange: 'up' | 'down' | 'same';
}
