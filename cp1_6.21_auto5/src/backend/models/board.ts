import { v4 as uuidv4 } from 'uuid';

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

export const PRESET_COLORS: string[] = [
  '#F5F7FA',
  '#E8F4FD',
  '#F0F4E8',
  '#FDF2E8',
  '#F5E8FD',
  '#E8FDF5',
];

class BoardStore {
  private boards: Map<string, Board> = new Map();

  createBoard(title: string, description: string, backgroundColor: string): Board {
    const id = uuidv4();
    const now = Date.now();
    const board: Board = {
      id,
      title,
      description,
      backgroundColor: PRESET_COLORS.includes(backgroundColor)
        ? backgroundColor
        : PRESET_COLORS[0],
      cards: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    this.boards.set(id, board);
    return board;
  }

  getBoard(id: string): Board | undefined {
    return this.boards.get(id);
  }

  getAllBoards(): { id: string; title: string; description: string; createdAt: number; cardCount: number }[] {
    return Array.from(this.boards.values()).map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      createdAt: b.createdAt,
      cardCount: b.cards.length,
    }));
  }

  updateBoard(id: string, updates: Partial<Pick<Board, 'title' | 'description' | 'backgroundColor'>>): Board | undefined {
    const board = this.boards.get(id);
    if (!board) return undefined;
    board.title = updates.title ?? board.title;
    board.description = updates.description ?? board.description;
    board.backgroundColor = updates.backgroundColor ?? board.backgroundColor;
    board.updatedAt = Date.now();
    return board;
  }

  deleteBoard(id: string): boolean {
    return this.boards.delete(id);
  }

  addCard(boardId: string, type: CardType, position: Position, data: CardData): Card | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;

    const size = this.getDefaultSize(type);
    const now = Date.now();
    const card: Card = {
      id: uuidv4(),
      type,
      position,
      size,
      data,
      lockedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    board.cards.push(card);
    board.updatedAt = now;
    return card;
  }

  updateCard(boardId: string, cardId: string, updates: Partial<Pick<Card, 'position' | 'size' | 'data'>>): Card | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;
    const card = board.cards.find((c) => c.id === cardId);
    if (!card) return undefined;

    card.position = updates.position ?? card.position;
    card.size = updates.size ?? card.size;
    card.data = updates.data ?? card.data;
    card.updatedAt = Date.now();
    board.updatedAt = Date.now();
    return card;
  }

  deleteCard(boardId: string, cardId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) return false;
    const index = board.cards.findIndex((c) => c.id === cardId);
    if (index === -1) return false;
    board.cards.splice(index, 1);
    board.comments = board.comments.filter((c) => c.cardId !== cardId);
    board.updatedAt = Date.now();
    return true;
  }

  lockCard(boardId: string, cardId: string, user: User): Card | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;
    const card = board.cards.find((c) => c.id === cardId);
    if (!card || card.lockedBy) return undefined;
    card.lockedBy = user;
    return card;
  }

  unlockCard(boardId: string, cardId: string): Card | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;
    const card = board.cards.find((c) => c.id === cardId);
    if (!card) return undefined;
    card.lockedBy = null;
    return card;
  }

  addComment(boardId: string, cardId: string, user: User, content: string): Comment | undefined {
    const board = this.boards.get(boardId);
    if (!board) return undefined;
    const comment: Comment = {
      id: uuidv4(),
      cardId,
      user,
      content,
      createdAt: Date.now(),
    };
    board.comments.push(comment);
    board.updatedAt = Date.now();
    return comment;
  }

  getComments(boardId: string, cardId: string): Comment[] {
    const board = this.boards.get(boardId);
    if (!board) return [];
    return board.comments.filter((c) => c.cardId === cardId).sort((a, b) => a.createdAt - b.createdAt);
  }

  private getDefaultSize(type: CardType): Size {
    switch (type) {
      case 'image':
        return { width: 320, height: 180 };
      case 'text':
        return { width: 280, height: 200 };
      case 'link':
        return { width: 300, height: 160 };
      default:
        return { width: 280, height: 180 };
    }
  }
}

export const boardStore = new BoardStore();
