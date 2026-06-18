export interface Comment {
  id: string;
  content: string;
  createdAt: number;
}

export interface Card {
  id: string;
  title: string;
  content: string;
  votes: number;
  comments: Comment[];
  createdAt: number;
}

export type SortType = 'latest' | 'hot';
