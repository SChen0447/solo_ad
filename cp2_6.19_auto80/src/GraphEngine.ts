import { v4 as uuidv4 } from 'uuid';
import type { NoteCard, Connection, AppState } from './types';
import { THEME_COLORS } from './types';

export class GraphEngine {
  private cards: NoteCard[] = [];
  private connections: Connection[] = [];

  constructor(initialState?: AppState) {
    if (initialState) {
      this.cards = initialState.cards || [];
      this.connections = initialState.connections || [];
    }
  }

  getCards(): NoteCard[] {
    return this.cards;
  }

  getConnections(): Connection[] {
    return this.connections;
  }

  getState(): AppState {
    return {
      cards: [...this.cards],
      connections: [...this.connections],
    };
  }

  addCard(
    title: string,
    content: string,
    position: { x: number; y: number },
    color?: string
  ): NoteCard {
    const card: NoteCard = {
      id: uuidv4(),
      title,
      content,
      color: color || THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)],
      position,
      createdAt: Date.now(),
    };
    this.cards.push(card);
    return card;
  }

  updateCard(id: string, updates: Partial<Omit<NoteCard, 'id'>>): NoteCard | null {
    const index = this.cards.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.cards[index] = { ...this.cards[index], ...updates };
    return this.cards[index];
  }

  deleteCard(id: string): boolean {
    const beforeCount = this.cards.length;
    this.cards = this.cards.filter((c) => c.id !== id);
    this.connections = this.connections.filter(
      (c) => c.sourceId !== id && c.targetId !== id
    );
    return this.cards.length < beforeCount;
  }

  deleteCards(ids: string[]): number {
    const idSet = new Set(ids);
    const beforeCount = this.cards.length;
    this.cards = this.cards.filter((c) => !idSet.has(c.id));
    this.connections = this.connections.filter(
      (c) => !idSet.has(c.sourceId) && !idSet.has(c.targetId)
    );
    return beforeCount - this.cards.length;
  }

  cycleCardColor(id: string): NoteCard | null {
    const card = this.cards.find((c) => c.id === id);
    if (!card) return null;
    const currentIndex = THEME_COLORS.indexOf(card.color);
    const nextIndex = (currentIndex + 1) % THEME_COLORS.length;
    return this.updateCard(id, { color: THEME_COLORS[nextIndex] });
  }

  addConnection(sourceId: string, targetId: string, label = '相关联'): Connection | null {
    if (sourceId === targetId) return null;
    const exists = this.connections.some(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId)
    );
    if (exists) return null;
    const sourceCard = this.cards.find((c) => c.id === sourceId);
    if (!sourceCard) return null;
    const targetCard = this.cards.find((c) => c.id === targetId);
    if (!targetCard) return null;
    const connection: Connection = {
      id: uuidv4(),
      sourceId,
      targetId,
      label,
    };
    this.connections.push(connection);
    return connection;
  }

  updateConnection(id: string, updates: Partial<Omit<Connection, 'id'>>): Connection | null {
    const index = this.connections.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.connections[index] = { ...this.connections[index], ...updates };
    return this.connections[index];
  }

  deleteConnection(id: string): boolean {
    const beforeCount = this.connections.length;
    this.connections = this.connections.filter((c) => c.id !== id);
    return this.connections.length < beforeCount;
  }

  getCardConnections(cardId: string): Connection[] {
    return this.connections.filter(
      (c) => c.sourceId === cardId || c.targetId === cardId
    );
  }

  exportToJSON(): string {
    return JSON.stringify(
      {
        cards: this.cards,
        connections: this.connections,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  importFromJSON(json: string): AppState {
    const data = JSON.parse(json);
    if (data.cards && Array.isArray(data.cards)) {
      this.cards = data.cards;
    }
    if (data.connections && Array.isArray(data.connections)) {
      this.connections = data.connections;
    }
    return this.getState();
  }

  loadState(state: AppState): void {
    this.cards = state.cards || [];
    this.connections = state.connections || [];
  }

  clearAll(): void {
    this.cards = [];
    this.connections = [];
  }
}

export function calculateBezierPath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  cardWidth: number,
  cardHeight: number
): { path: string; arrowPos: { x: number; y: number }; angle: number } {
  const sourceCenter = {
    x: sourcePos.x + cardWidth / 2,
    y: sourcePos.y + cardHeight / 2,
  };
  const targetCenter = {
    x: targetPos.x + cardWidth / 2,
    y: targetPos.y + cardHeight / 2,
  };

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const controlOffset = Math.min(distance * 0.5, 150);

  const startX = sourceCenter.x;
  const startY = sourceCenter.y;
  const endX = targetCenter.x;
  const endY = targetCenter.y;

  const cp1x = startX + dx * 0.25;
  const cp1y = startY + (dy * 0.25 - controlOffset * 0.3);
  const cp2x = startX + dx * 0.75;
  const cp2y = startY + (dy * 0.75 + controlOffset * 0.3);

  const path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

  const angle = Math.atan2(
    endY - cp2y,
    endX - cp2x
  );

  const arrowOffset = 12;
  const arrowPos = {
    x: endX - Math.cos(angle) * arrowOffset,
    y: endY - Math.sin(angle) * arrowOffset,
  };

  return { path, arrowPos, angle };
}
