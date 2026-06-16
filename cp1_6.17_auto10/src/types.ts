export interface Card {
  id: string;
  front: string;
  back: string;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
  createdAt: number;
  lastReviewedAt?: number;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Card[];
  createdAt: number;
}

export interface ReviewHistory {
  cardId: string;
  deckId: string;
  reviewedAt: number;
  quality: number;
  previousInterval: number;
  newInterval: number;
}

export interface AppState {
  decks: Deck[];
  reviewHistory: ReviewHistory[];
}
