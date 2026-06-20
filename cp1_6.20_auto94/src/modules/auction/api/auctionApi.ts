import api from '@/api/http';
import type { Bid, Auction } from '@/types';

export interface SubmitBidData {
  bookId: string;
  recyclerId: string;
  recyclerName: string;
  amount: number;
}

export const auctionApi = {
  async getOpenAuctions(): Promise<Auction[]> {
    const response = await api.get<Auction[]>('/auctions/open');
    return response.data;
  },

  async getAuctionByBookId(bookId: string): Promise<Auction & { bids: Bid[] }> {
    const response = await api.get<Auction & { bids: Bid[] }>(`/auctions/book/${bookId}`);
    return response.data;
  },

  async submitBid(data: SubmitBidData): Promise<Bid> {
    const response = await api.post<Bid>('/auctions/bid', data);
    return response.data;
  },

  async closeAuction(bookId: string): Promise<{
    winner: Bid;
    bookStatus: string;
    stockRecord: any;
  }> {
    const response = await api.post(`/auctions/close`, { bookId });
    return response.data;
  },

  async getMyBids(recyclerId: string): Promise<(Bid & { bookTitle: string; bookCover?: string; status: string })[]> {
    const response = await api.get(`/auctions/my-bids/${recyclerId}`);
    return response.data;
  }
};
