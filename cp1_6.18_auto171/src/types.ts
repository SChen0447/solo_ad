export type Category = 'all' | 'tech' | 'art' | 'life' | 'business';

export type CreativeCategory = Exclude<Category, 'all'>;

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  creativeId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface Vote {
  creativeId: string;
  userId: string;
  votedAt: number;
}

export interface Creative {
  id: string;
  title: string;
  description: string;
  category: CreativeCategory;
  authorId: string;
  authorName: string;
  createdAt: number;
  votes: number;
  comments: Comment[];
}

export interface LeaderboardItem {
  creative: Creative;
  rank: number;
  previousRank: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
  hotScore: number;
}

export interface NewCreativeInput {
  title: string;
  description: string;
  category: CreativeCategory;
  authorId: string;
  authorName: string;
}

export interface NewCommentInput {
  creativeId: string;
  userId: string;
  userName: string;
  content: string;
}
