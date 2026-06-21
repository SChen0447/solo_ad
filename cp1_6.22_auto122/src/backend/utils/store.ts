import { v4 as uuidv4 } from 'uuid';

export interface Auction {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  endTime: Date;
  startTime: Date;
  bidCount: number;
  status: 'active' | 'ended';
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface UserStats {
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

class Store {
  private auctions: Map<string, Auction> = new Map();
  private bids: Map<string, Bid[]> = new Map();
  private users: Map<string, User> = new Map();
  private userBidRecords: Map<string, { auctionId: string; auctionName: string; amount: number; isWinner: boolean; abandoned: boolean; responseTime: number }[]> = new Map();

  constructor() {
    this.initMockData();
  }

  private initMockData() {
    const defaultUser: User = {
      id: 'user-001',
      name: '当前用户',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
    };
    this.users.set(defaultUser.id, defaultUser);

    const otherUsers: User[] = [
      { id: 'user-002', name: '竞价者A', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' },
      { id: 'user-003', name: '竞价者B', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' },
      { id: 'user-004', name: '竞价者C', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie' },
      { id: 'user-005', name: '老玩家D', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david' },
      { id: 'user-006', name: '新手E', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve' },
    ];
    otherUsers.forEach((u) => this.users.set(u.id, u));

    const now = new Date();
    const auctionTemplates = [
      { name: '限量版机械手表', desc: '瑞士机芯，蓝宝石表镜，全球限量100只', start: 5000, inc: 100, durMin: 15 },
      { name: '古董青花瓷瓶', desc: '清朝乾隆年间官窑，附权威鉴定证书', start: 28000, inc: 500, durMin: 45 },
      { name: '签名版球星卡', desc: '2003年新秀卡PSA评级10分', start: 12000, inc: 200, durMin: 8 },
      { name: '复古黑胶唱片套装', desc: '披头士全集首版，保存完好', start: 3500, inc: 100, durMin: 22 },
      { name: '经典徕卡胶片相机', desc: '1960年代M3机型，功能正常', start: 15000, inc: 300, durMin: 60 },
      { name: '稀有初版书籍', desc: '《百年孤独》首版签名本', start: 45000, inc: 1000, durMin: 30 },
      { name: '高端定制钢笔', desc: '万宝龙限量款149，18K金尖', start: 8000, inc: 200, durMin: 10 },
      { name: '艺术品油画原作', desc: '当代著名画家原创作品，附收藏证书', start: 68000, inc: 2000, durMin: 120 },
    ];

    auctionTemplates.forEach((tpl, idx) => {
      const id = uuidv4();
      const startPrice = tpl.start;
      const randomBids = Math.floor(Math.random() * 8) + 2;
      let currentPrice = startPrice;
      const bidList: Bid[] = [];
      const endTime = new Date(now.getTime() + tpl.durMin * 60 * 1000 + (idx * 30 * 1000));

      for (let i = 0; i < randomBids; i++) {
        const user = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        currentPrice += tpl.inc + Math.floor(Math.random() * tpl.inc * 3);
        bidList.push({
          id: uuidv4(),
          auctionId: id,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          amount: currentPrice,
          timestamp: new Date(now.getTime() - Math.random() * 3600000),
        });
      }

      const auction: Auction = {
        id,
        name: tpl.name,
        description: tpl.desc,
        imageUrl: `https://picsum.photos/seed/auction${idx}/640/480`,
        startPrice,
        currentPrice,
        minIncrement: tpl.inc,
        endTime,
        startTime: now,
        bidCount: randomBids,
        status: 'active',
      };

      this.auctions.set(id, auction);
      this.bids.set(id, bidList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

      bidList.forEach((bid) => {
        if (!this.userBidRecords.has(bid.userId)) {
          this.userBidRecords.set(bid.userId, []);
        }
        this.userBidRecords.get(bid.userId)!.push({
          auctionId: id,
          auctionName: auction.name,
          amount: bid.amount,
          isWinner: false,
          abandoned: false,
          responseTime: Math.floor(Math.random() * 120) + 5,
        });
      }
    });

    if (!this.userBidRecords.has(defaultUser.id)) {
      this.userBidRecords.set(defaultUser.id, []);
    }
  }

  getAllAuctions(): Auction[] {
    return Array.from(this.auctions.values()).sort(
      (a, b) => a.endTime.getTime() - b.endTime.getTime()
    );
  }

  getAuctionById(id: string): Auction | undefined {
    return this.auctions.get(id);
  }

  getBidsByAuctionId(auctionId: string): Bid[] {
    return this.bids.get(auctionId) || [];
  }

  addBid(auctionId: string, userId: string, amount: number): Bid | null {
    const auction = this.auctions.get(auctionId);
    const user = this.users.get(userId);
    if (!auction || !user) return null;
    if (amount < auction.currentPrice + auction.minIncrement) return null;

    const bid: Bid = {
      id: uuidv4(),
      auctionId,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      amount,
      timestamp: new Date(),
    };

    auction.currentPrice = amount;
    auction.bidCount += 1;

    const bids = this.bids.get(auctionId) || [];
    bids.unshift(bid);
    this.bids.set(auctionId, bids);

    const records = this.userBidRecords.get(userId) || [];
    records.push({
      auctionId,
      auctionName: auction.name,
      amount,
      isWinner: false,
      abandoned: false,
      responseTime: Math.floor((bid.timestamp.getTime() - auction.startTime.getTime()) / 1000,
    });
    this.userBidRecords.set(userId, records);

    return bid;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserBids(userId: string): { auctionId: string; auctionName: string; currentPrice: number; remainingTime: number; isHighestBidder: boolean; }[] {
    const records = this.userBidRecords.get(userId) || [];
    const latestByAuction = new Map<string, typeof records[0]>();
    records.forEach((r) => {
      const existing = latestByAuction.get(r.auctionId);
      if (!existing || r.amount > existing.amount) {
        latestByAuction.set(r.auctionId, r);
      }
    });

    const result: { auctionId: string; auctionName: string; currentPrice: number; remainingTime: number; isHighestBidder: boolean; }[] = [];
    latestByAuction.forEach((r) => {
      const auction = this.auctions.get(r.auctionId);
      if (!auction) return;
      const bids = this.bids.get(r.auctionId) || [];
      const topBid = bids[0];
      result.push({
        auctionId: r.auctionId,
        auctionName: r.auctionName,
        currentPrice: auction.currentPrice,
        remainingTime: Math.max(0, auction.endTime.getTime() - Date.now()),
        isHighestBidder: topBid?.userId === userId,
      });
    });
    return result;
  }

  getUserStats(userId: string): UserStats {
    const records = this.userBidRecords.get(userId) || [];
    const wins = Math.floor(records.length * 0.3);
    const losses = Math.floor(records.length * 0.5);
    const abandoned = records.length - wins - losses;
    const bidHistory: { date: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayBids = records.filter((r) => {
        const t = new Date(now.getTime() - i * 86400000 - 1000);
        return true;
      });
      const totalAmount = dayBids.length > 0
        ? dayBids.reduce((sum, r) => sum + r.amount, 0) / dayBids.length + Math.random() * 5000
        : Math.random() * 10000;
      bidHistory.push({ date: dateStr, amount: Math.floor(totalAmount) });
    }

    return {
      userId,
      wins,
      losses,
      abandoned,
      totalBids: records.length,
      averageMarkup: 3.5 + Math.random() * 2,
      highestBid: records.length > 0 ? Math.max(...records.map((r) => r.amount)) : 0,
      averageResponseTime: 45 + Math.random() * 30,
      bidHistory,
    };
  }

  getCurrentUserId(): string {
    return 'user-001';
  }
}

export const store = new Store();
