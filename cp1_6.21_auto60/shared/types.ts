export type IdeaCategory = '产品功能' | '营销活动' | '效率工具' | '社交互动' | '其他';

export interface Score {
  id: string;
  creativity: number;
  feasibility: number;
  influence: number;
  timestamp: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  authorId: string;
  scores: Score[];
  overallScore: number;
  createdAt: number;
  adopted: boolean;
}

export interface CreateIdeaDTO {
  title: string;
  description: string;
  category: IdeaCategory;
  authorId: string;
}

export interface SubmitScoreDTO {
  creativity: number;
  feasibility: number;
  influence: number;
}

export type SortType = 'score' | 'time' | 'votes';

export const CATEGORY_COLORS: Record<IdeaCategory, string> = {
  '产品功能': '#4A90D9',
  '营销活动': '#F5A623',
  '效率工具': '#50C878',
  '社交互动': '#FF6B9D',
  '其他': '#8E8E93'
};
