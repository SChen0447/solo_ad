import { v4 as uuidv4 } from 'uuid';
import type { Card, CardType, CardData, TextCardData, ImageCardData, LinkCardData } from './types';

export interface HistorySnapshot {
  cards: Card[];
}

const MAX_HISTORY = 100;

export class CardManager {
  private cards: Map<string, Card> = new Map();
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private listeners: Set<() => void> = new Set();

  private saveHistory() {
    const snapshot: HistorySnapshot = {
      cards: Array.from(this.cards.values()).map(c => ({ ...c, data: { ...c.data } }))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCards(): Card[] {
    return Array.from(this.cards.values());
  }

  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }

  createCard(
    type: CardType,
    x: number,
    y: number,
    data: CardData,
    width = 240,
    height = 160
  ): Card {
    this.saveHistory();
    const now = Date.now();
    const card: Card = {
      id: uuidv4(),
      type,
      x,
      y,
      width,
      height,
      data: { ...data },
      createdAt: now,
      updatedAt: now
    };
    this.cards.set(card.id, card);
    this.notify();
    return card;
  }

  updateCard(id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>): Card | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    this.saveHistory();
    const updated: Card = {
      ...card,
      ...updates,
      data: updates.data ? { ...updates.data } : card.data,
      updatedAt: Date.now()
    };
    this.cards.set(id, updated);
    this.notify();
    return updated;
  }

  deleteCard(id: string): boolean {
    const card = this.cards.get(id);
    if (!card) return false;
    this.saveHistory();
    this.cards.delete(id);
    this.notify();
    return true;
  }

  moveCard(id: string, x: number, y: number): Card | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    if (card.x === x && card.y === y) return card;
    this.saveHistory();
    const updated: Card = { ...card, x, y, updatedAt: Date.now() };
    this.cards.set(id, updated);
    this.notify();
    return updated;
  }

  resizeCard(id: string, width: number, height: number): Card | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    if (card.width === width && card.height === height) return card;
    this.saveHistory();
    const updated: Card = {
      ...card,
      width: Math.max(100, width),
      height: Math.max(80, height),
      updatedAt: Date.now()
    };
    this.cards.set(id, updated);
    this.notify();
    return updated;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const current: HistorySnapshot = {
      cards: Array.from(this.cards.values()).map(c => ({ ...c, data: { ...c.data } }))
    };
    this.redoStack.push(current);
    const prev = this.undoStack.pop()!;
    this.cards = new Map(prev.cards.map(c => [c.id, c]));
    this.notify();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const current: HistorySnapshot = {
      cards: Array.from(this.cards.values()).map(c => ({ ...c, data: { ...c.data } }))
    };
    this.undoStack.push(current);
    const next = this.redoStack.pop()!;
    this.cards = new Map(next.cards.map(c => [c.id, c]));
    this.notify();
    return true;
  }

  toJSON(): Card[] {
    return Array.from(this.cards.values());
  }

  loadJSON(cards: Card[]) {
    this.saveHistory();
    this.cards = new Map(cards.map(c => [c.id, { ...c, data: { ...c.data } }]));
    this.notify();
  }

  clear() {
    this.saveHistory();
    this.cards.clear();
    this.notify();
  }

  createTextCardData(content: string): TextCardData {
    return { content };
  }

  createImageCardData(url: string, name?: string): ImageCardData {
    return { url, name };
  }

  createLinkCardData(url: string, title: string, favicon?: string): LinkCardData {
    return { url, title, favicon };
  }
}
