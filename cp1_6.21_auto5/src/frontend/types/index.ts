export type CardType = 'image' | 'text' | 'link';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface CardData {
  image?: {
    url: string;
  };
  text?: {
    title: string;
    content: string;
  };
  link?: {
    url: string;
    title: string;
    description: string;
    thumbnail: string;
  };
}

export interface Card {
  id: string;
  type: CardType;
  position: Position;
  size: Size;
  data: CardData;
  lockedBy?: User | null;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  cardId: string;
  user: User;
  content: string;
  createdAt: number;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  backgroundColor: string;
  cards: Card[];
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
}

export interface BoardSummary {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  cardCount: number;
}

export const PRESET_COLORS: string[] = [
  '#F5F7FA',
  '#E8F4FD',
  '#F0F4E8',
  '#FDF2E8',
  '#F5E8FD',
  '#E8FDF5',
];

export const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

export const getAvatarUrl = (seed: string): string => {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8'];
  const colorIndex = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const letter = seed.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${letter}&background=${colors[colorIndex]}&color=fff&size=64`;
};
