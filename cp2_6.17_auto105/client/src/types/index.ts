export interface Inspiration {
  id: string;
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  linkUrl?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  name: string;
  color: string;
  count: number;
}

export interface TagBubble {
  name: string;
  color: string;
  count: number;
  x: number;
  y: number;
  radius: number;
}

export interface BubbleConnection {
  from: string;
  to: string;
}

export interface StarChartData {
  month: string;
  tags: TagBubble[];
  connections: BubbleConnection[];
}

export interface SearchHistoryItem {
  keyword: string;
  timestamp: number;
}

export const TAG_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'];
