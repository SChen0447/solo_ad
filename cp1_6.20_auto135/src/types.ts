export interface User {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  status: 'editing' | 'browsing';
}

export interface IdeaCardData {
  id: string;
  sessionId: string;
  content: string;
  authorId: string;
  authorName: string;
  color: string | null;
  x: number;
  y: number;
  zIndex: number;
  votes: string[];
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  hostId: string;
  phase: 'brainstorm' | 'voting' | 'result';
  votingEndAt: number | null;
  users: User[];
  cards: IdeaCardData[];
  createdAt: number;
}

export type Phase = 'brainstorm' | 'voting' | 'result';

export const TAG_COLORS: { color: string; name: string }[] = [
  { color: '#ff6b6b', name: '珊瑚红' },
  { color: '#51cf66', name: '薄荷绿' },
  { color: '#339af0', name: '天空蓝' },
  { color: '#ffd43b', name: '金色' },
  { color: '#cc5de8', name: '紫罗兰' },
  { color: '#ff922b', name: '橙色' },
  { color: '#20c997', name: '青绿' },
  { color: '#868e96', name: '岩石灰' },
];

export const CARD_WIDTH = 260;
export const CARD_HEIGHT = 180;
export const VOTING_DURATION = 300;
export const MAX_VOTES_PER_USER = 3;
