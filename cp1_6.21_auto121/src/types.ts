export interface Member {
  id: string;
  name: string;
  avatar: string;
  points: number;
  pointsHistory: PointsHistoryItem[];
}

export interface RegisteredMember {
  memberId: string;
  checkedIn: boolean;
  member?: Member;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  location: 'offline' | 'online';
  description: string;
  maxParticipants: number;
  inviteCode: string;
  status: 'upcoming' | 'completed';
  registeredMembers: RegisteredMember[];
}

export interface PointsHistoryItem {
  date: string;
  activity: string;
  points: number;
}

export interface Reward {
  id: string;
  name: string;
  type: 'coupon' | 'physical';
  pointsCost: number;
  stock: number;
  description: string;
}

export interface ExchangeRecord {
  id: string;
  memberId: string;
  rewardId: string;
  rewardName: string;
  pointsCost: number;
  date: string;
}

export interface RankedMember extends Member {
  recentPoints: number;
  exchangeCount: number;
}

export interface MemberDetail extends Member {
  exchanges: ExchangeRecord[];
}
