export type Category = '产品功能' | '活动方案' | '技术选型';

export const CATEGORIES: Category[] = ['产品功能', '活动方案', '技术选型'];

export interface Proposal {
  id: string;
  topicId: string;
  content: string;
  createdAt: number;
  votes: number;
}

export interface TopicPublic {
  id: string;
  name: string;
  category: Category;
  deadline: number;
  createdAt: number;
  proposals: Proposal[];
  totalVoters: number;
  status: 'active' | 'ended';
}

export interface RankedProposal extends Proposal {
  rank: number;
}
