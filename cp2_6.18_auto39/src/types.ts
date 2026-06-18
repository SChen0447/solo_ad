export interface Rating {
  id: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  author: string;
  summary: string;
  content: string;
  createdAt: string;
  ratings: Rating[];
  averageScore: number;
  ratingCount: number;
}

export interface ProposalListItem {
  id: string;
  title: string;
  author: string;
  summary: string;
  createdAt: string;
  averageScore: number;
  ratingCount: number;
}

export interface LeaderboardItem {
  id: string;
  title: string;
  author: string;
  averageScore: number;
  ratingCount: number;
  ratings: number[];
}
