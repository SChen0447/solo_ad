export interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  coverUrl: string;
  description: string;
  exchangeType: string;
  ownerId: string;
  status: 'available' | 'swapped';
  createdAt: string;
}

export interface Swap {
  id: string;
  requesterId: string;
  bookOfferedId: string;
  bookRequestedId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  swapId: string;
  counterpartyId: string;
  points: number;
  createdAt: string;
}

export type SwapStatus = Swap['status'];
export type BookStatus = Book['status'];
