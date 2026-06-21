export interface AuctionCardData {
  id: string;
  name: string;
  imageUrl: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  endTime: string;
  bidCount: number;
  status: string;
}

export interface BidData {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  timestamp: string;
}

export interface AuctionDetailData {
  auction: AuctionCardData & { description: string; startTime: string };
  bids: BidData[];
}

export interface UserBidRecord {
  auctionId: string;
  auctionName: string;
  currentPrice: number;
  remainingTime: number;
  isHighestBidder: boolean;
}

export interface UserStatsData {
  userId: string;
  wins: number;
  losses: number;
  abandoned: number;
  totalBids: number;
  averageMarkup: number;
  highestBid: number;
  averageResponseTime: number;
  bidHistory: { date: string; amount: number }[];
}

const API_BASE = '/api';
const CURRENT_USER_ID = 'user-001';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[API] ${url} request failed:`, err);
    throw err;
  }
}

export const api = {
  getCurrentUserId(): string {
    return CURRENT_USER_ID;
  },

  getAuctionList(): Promise<AuctionCardData[]> {
    return request<AuctionCardData[]>('/auctions');
  },

  getAuctionDetail(id: string): Promise<AuctionDetailData> {
    return request<AuctionDetailData>(`/auctions/${id}`);
  },

  sendBid(auctionId: string, amount: number): Promise<{ success: boolean; bid: BidData }> {
    return request(`/auctions/${auctionId}/bid`, {
      method: 'POST',
      body: JSON.stringify({
        userId: CURRENT_USER_ID,
        amount,
      }),
    });
  },

  fetchUserBids(userId: string = CURRENT_USER_ID): Promise<UserBidRecord[]> {
    return request<UserBidRecord[]>(`/users/${userId}/bids`);
  },

  fetchUserStats(userId: string = CURRENT_USER_ID): Promise<UserStatsData> {
    return request<UserStatsData>(`/users/${userId}/stats`);
  },
};
