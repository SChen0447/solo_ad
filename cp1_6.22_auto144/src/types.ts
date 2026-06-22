export interface User {
  id: string;
  email: string;
  name: string;
  nickname: string;
  role: 'student' | 'admin';
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  createdAt: string;
}

export interface Recruitment {
  id: string;
  clubId: string;
  title: string;
  description: string;
  deadline: string;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  clubName?: string;
  applicationCount?: number;
}

export interface Application {
  id: string;
  recruitmentId: string;
  clubId: string;
  userId: string;
  studentName: string;
  grade: string;
  contact: string;
  portfolioLinks: string[];
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  interviewSlotId?: string;
  interviewStatus: 'scheduled' | 'completed' | 'missed' | 'none';
  createdAt: string;
  reviewedAt?: string;
  recruitmentTitle?: string;
  clubName?: string;
  userEmail?: string;
  interviewSlot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

export interface InterviewSlot {
  id: string;
  recruitmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentCount: number;
  createdAt: string;
  remainingSlots?: number;
  isFull?: boolean;
}

export interface Portfolio {
  id: string;
  applicationId: string;
  userId: string;
  authorNickname: string;
  title: string;
  link: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export interface PortfolioWithStats extends Portfolio {
  averageScore: number;
  ratingCount: number;
  currentRank: number;
  previousRank: number;
}

export interface Rating {
  id: string;
  portfolioId: string;
  userId: string;
  raterNickname: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface RecruitmentStats {
  totalApplications: number;
  totalInterviewed: number;
  acceptanceRate: number;
  clubStats: {
    clubId: string;
    clubName: string;
    applicationCount: number;
  }[];
  interviewCompletionRate: number;
}

export interface RankChange {
  portfolioId: string;
  title: string;
  previousRank: number;
  currentRank: number;
  change: number;
}

export interface Notification {
  id: string;
  type: 'rank-up' | 'rank-down';
  title: string;
  change: number;
  timestamp: number;
}
