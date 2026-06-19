import { v4 as uuidv4 } from 'uuid';
import type { NoteCard, Connection, AppState } from './types';
import { PRESET_COLORS } from './types';

export class GraphEngine {
  private cards: Map<string, NoteCard> = new Map();
  private connections: Map<string, Connection> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  getCard(id: string): NoteCard | undefined {
    return this.cards.get(id);
  }

  getAllCards(): NoteCard[] {
    return Array.from(this.cards.values());
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getConnectionsForCard(cardId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.sourceId === cardId || c.targetId === cardId
    );
  }

  addCard(data: Partial<NoteCard> & { title: string; content: string; position: { x: number; y: number } }): NoteCard {
    const card: NoteCard = {
      id: data.id || uuidv4(),
      title: data.title,
      content: data.content,
      color: data.color || PRESET_COLORS[0],
      position: data.position,
      createdAt: data.createdAt || Date.now(),
      width: data.width || 220,
      height: data.height || 180,
    };
    this.cards.set(card.id, card);
    this.notify();
    return card;
  }

  updateCard(id: string, updates: Partial<NoteCard>): NoteCard | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    const updated = { ...card, ...updates };
    this.cards.set(id, updated);
    this.notify();
    return updated;
  }

  updateCardPosition(id: string, position: { x: number; y: number }): NoteCard | undefined {
    return this.updateCard(id, { position });
  }

  updateCardSize(id: string, width: number, height: number): NoteCard | undefined {
    return this.updateCard(id, { width, height });
  }

  cycleCardColor(id: string): NoteCard | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    const currentIndex = PRESET_COLORS.indexOf(card.color);
    const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
    return this.updateCard(id, { color: PRESET_COLORS[nextIndex] });
  }

  deleteCard(id: string): void {
    this.cards.delete(id);
    const toDelete: string[] = [];
    this.connections.forEach((conn, connId) => {
      if (conn.sourceId === id || conn.targetId === id) {
        toDelete.push(connId);
      }
    });
    toDelete.forEach((connId) => this.connections.delete(connId));
    this.notify();
  }

  deleteCards(ids: string[]): void {
    ids.forEach((id) => this.deleteCard(id));
  }

  addConnection(sourceId: string, targetId: string, label: string = '相关联'): Connection | undefined {
    if (sourceId === targetId) return undefined;
    const exists = Array.from(this.connections.values()).find(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId)
    );
    if (exists) return undefined;
    const connection: Connection = {
      id: uuidv4(),
      sourceId,
      targetId,
      label,
    };
    this.connections.set(connection.id, connection);
    this.notify();
    return connection;
  }

  updateConnectionLabel(id: string, label: string): Connection | undefined {
    const conn = this.connections.get(id);
    if (!conn) return undefined;
    const updated = { ...conn, label };
    this.connections.set(id, updated);
    this.notify();
    return updated;
  }

  deleteConnection(id: string): void {
    this.connections.delete(id);
    this.notify();
  }

  getAppState(): AppState {
    return {
      cards: this.getAllCards(),
      connections: this.getAllConnections(),
    };
  }

  loadAppState(state: AppState): void {
    this.cards.clear();
    this.connections.clear();
    state.cards.forEach((card) => this.cards.set(card.id, card));
    state.connections.forEach((conn) => this.connections.set(conn.id, conn));
    this.notify();
  }

  exportToJSON(): string {
    return JSON.stringify(this.getAppState(), null, 2);
  }

  importFromJSON(json: string): void {
    const state = JSON.parse(json) as AppState;
    this.loadAppState(state);
  }

  static fromAppState(state: AppState): GraphEngine {
    const engine = new GraphEngine();
    engine.loadAppState(state);
    return engine;
  }
}
