export type StoryType = 'feature' | 'technical' | 'bug';

export interface StoryCard {
  id: string;
  title: string;
  description: string;
  type: StoryType;
  storyPoints: number;
  swimlaneId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SwimLane {
  id: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  draggingCardId: string | null;
}

export interface Collaborator {
  userId: string;
  userName: string;
  avatar: string;
  color: string;
  isOnline: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: string;
  color: string;
}

export interface CardDragData {
  cardId: string;
  swimlaneId: string;
  position: number;
  userId: string;
}

export type CardColorMap = Record<StoryType, string>;

export const CARD_COLORS: CardColorMap = {
  feature: '#3b82f6',
  technical: '#22c55e',
  bug: '#ef4444',
};

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  feature: '功能',
  technical: '技术',
  bug: '缺陷',
};
