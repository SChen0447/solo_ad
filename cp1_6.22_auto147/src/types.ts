export interface User {
  id: string;
  name: string;
  avatar: string;
  totalPoints: number;
  continuousDays: number;
  lastCheckInDate: string | null;
  online: boolean;
  groups: string[];
}

export interface GroupMember {
  userId: string;
  joinedAt: string;
  isLeader: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string;
  points: number;
  online: boolean;
}

export interface Group {
  id: string;
  name: string;
  goal: string;
  createdAt: string;
  members: GroupMember[];
  memberCount?: number;
  leaderboard?: LeaderboardEntry[];
  leader?: GroupMember;
}

export interface GroupDetail {
  id: string;
  name: string;
  goal: string;
  createdAt: string;
  members: (User & { isLeader: boolean; joinedAt: string })[];
  memberCount?: number;
  leaderboard?: LeaderboardEntry[];
  leader?: GroupMember;
  checkIns: CheckIn[];
  challenges: Challenge[];
}

export interface CheckIn {
  id: string;
  userId: string;
  groupId: string;
  text: string;
  imageUrl?: string;
  pointsEarned: number;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
  groupName?: string;
}

export interface ChallengeParticipant {
  userId: string;
  progress: number;
  joinedAt: string;
  pointsInvested: number;
  rewards: number;
  name?: string;
  avatar?: string;
}

export interface Challenge {
  id: string;
  groupId: string;
  leaderId: string;
  title: string;
  description: string;
  targetCount: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed';
  participants: ChallengeParticipant[];
  poolPoints: number;
}

export interface UserChallenge {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
  targetCount: number;
  rank: number;
  rewards: number;
  pointsInvested: number;
  won: boolean;
  endDate: string;
}

export interface ChallengeStats {
  wins: number;
  losses: number;
  total: number;
}

export interface CheckInResponse {
  checkIn: CheckIn;
  user: Pick<User, 'id' | 'totalPoints' | 'continuousDays'>;
}
