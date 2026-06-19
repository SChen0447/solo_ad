import { NoteCard, Connection, AppState, Position, THEME_COLORS } from './types';
import { v4 as uuidv4 } from 'uuid';

export class GraphEngine {
  private cards: Map<string, NoteCard> = new Map();
  private connections: Map<string, Connection> = new Map();

  constructor() {}

  addCard(title: string, content: string, position: Position): NoteCard {
    const id = uuidv4();
    const card: NoteCard = {
      id,
      title,
      content,
      color: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)],
      position,
      createdAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      width: 220
    };
    this.cards.set(id, card);
    return card;
  }

  getCard(id: string): NoteCard | undefined {
    return this.cards.get(id);
  }

  updateCard(id: string, updates: Partial<NoteCard>): NoteCard | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    const updated = { ...card, ...updates };
    this.cards.set(id, updated);
    return updated;
  }

  updateCardPosition(id: string, position: Position): NoteCard | undefined {
    return this.updateCard(id, { position });
  }

  cycleCardColor(id: string): NoteCard | undefined {
    const card = this.cards.get(id);
    if (!card) return undefined;
    const currentIndex = THEME_COLORS.indexOf(card.color);
    const nextIndex = (currentIndex + 1) % THEME_COLORS.length;
    return this.updateCard(id, { color: THEME_COLORS[nextIndex] });
  }

  deleteCard(id: string): boolean {
    if (!this.cards.has(id)) return false;
    this.cards.delete(id);
    const relatedConnectionIds: string[] = [];
    this.connections.forEach((conn, connId) => {
      if (conn.sourceId === id || conn.targetId === id) {
        relatedConnectionIds.push(connId);
      }
    });
    relatedConnectionIds.forEach((connId) => this.connections.delete(connId));
    return true;
  }

  deleteCards(ids: string[]): void {
    ids.forEach((id) => this.deleteCard(id));
  }

  getAllCards(): NoteCard[] {
    return Array.from(this.cards.values());
  }

  addConnection(sourceId: string, targetId: string, label: string = '相关联'): Connection | null {
    if (sourceId === targetId) return null;
    if (!this.cards.has(sourceId) || !this.cards.has(targetId)) return null;
    const exists = Array.from(this.connections.values()).some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId)
    );
    if (exists) return null;
    const id = uuidv4();
    const connection: Connection = { id, sourceId, targetId, label };
    this.connections.set(id, connection);
    return connection;
  }

  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  updateConnectionLabel(id: string, label: string): Connection | undefined {
    const conn = this.connections.get(id);
    if (!conn) return undefined;
    const updated = { ...conn, label };
    this.connections.set(id, updated);
    return updated;
  }

  deleteConnection(id: string): boolean {
    return this.connections.delete(id);
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getConnectionsByCard(cardId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.sourceId === cardId || c.targetId === cardId
    );
  }

  getState(): AppState {
    return {
      cards: this.getAllCards(),
      connections: this.getAllConnections()
    };
  }

  loadState(state: AppState): void {
    this.cards.clear();
    this.connections.clear();
    state.cards.forEach((card) => {
      this.cards.set(card.id, { ...card, width: card.width || 220 });
    });
    state.connections.forEach((conn) => {
      this.connections.set(conn.id, conn);
    });
  }

  exportToJSON(): string {
    return JSON.stringify(this.getState(), null, 2);
  }

  importFromJSON(json: string): AppState {
    const state = JSON.parse(json) as AppState;
    this.loadState(state);
    return state;
  }

  getCardConnectionPoints(cardId: string): { source: Position; target: Position } | null {
    const card = this.cards.get(cardId);
    if (!card) return null;
    const w = card.width || 220;
    const h = card.height || 150;
    return {
      source: { x: card.position.x + w, y: card.position.y + h / 2 },
      target: { x: card.position.x, y: card.position.y + h / 2 }
    };
  }

  getBezierPath(source: Position, target: Position): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const cpOffset = Math.max(60, distance * 0.4);

    const cp1: Position = {
      x: source.x + cpOffset,
      y: source.y
    };
    const cp2: Position = {
      x: target.x - cpOffset,
      y: target.y
    };

    return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
  }

  getConnectionPath(connectionId: string): string | null {
    const conn = this.connections.get(connectionId);
    if (!conn) return null;
    const sourcePoints = this.getCardConnectionPoints(conn.sourceId);
    const targetPoints = this.getCardConnectionPoints(conn.targetId);
    if (!sourcePoints || !targetPoints) return null;
    return this.getBezierPath(sourcePoints.source, targetPoints.target);
  }

  getConnectionMidpoint(connectionId: string): Position | null {
    const conn = this.connections.get(connectionId);
    if (!conn) return null;
    const sourcePoints = this.getCardConnectionPoints(conn.sourceId);
    const targetPoints = this.getCardConnectionPoints(conn.targetId);
    if (!sourcePoints || !targetPoints) return null;
    const s = sourcePoints.source;
    const t = targetPoints.target;
    return {
      x: (s.x + t.x) / 2,
      y: (s.y + t.y) / 2
    };
  }
}
