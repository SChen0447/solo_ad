export interface User {
  id: string;
  nickname: string;
}

export interface Bottle {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  emoji: string;
  likes: number;
  dislikes: number;
  likeUsers: User[];
  authorId: string;
  authorName: string;
}

export type VoteType = 'like' | 'dislike';
