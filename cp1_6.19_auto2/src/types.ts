export type TideEmoji = '🐚' | '⭐' | '🐙' | '🦀' | '🐠' | '🌊' | '⚓' | '🪸';

export interface User {
  id: string;
  nickname: string;
}

export interface Card {
  id: string;
  title: string;
  content: string;
  emoji: TideEmoji;
  createdAt: number;
  likes: number;
  dislikes: number;
  likedBy: User[];
  dislikedBy: User[];
}

export interface BottleStore {
  cards: Card[];
  selectedCardId: string | null;
  isModalOpen: boolean;
  isMobile: boolean;
  showDetail: boolean;
  
  initializeData: () => void;
  addCard: (title: string, content: string) => void;
  selectCard: (id: string | null) => void;
  likeCard: (id: string) => void;
  dislikeCard: (id: string) => void;
  toggleModal: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setShowDetail: (show: boolean) => void;
  refreshData: () => void;
}
