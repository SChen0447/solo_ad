import { v4 as uuidv4 } from 'uuid';
import type { Connection, Point, Card } from './types';

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  createConnection(fromCardId: string, toCardId: string): Connection | null {
    if (fromCardId === toCardId) return null;
    const exists = Array.from(this.connections.values()).find(
      c => c.fromCardId === fromCardId && c.toCardId === toCardId
    );
    if (exists) return exists;
    const conn: Connection = {
      id: uuidv4(),
      fromCardId,
      toCardId,
      createdAt: Date.now()
    };
    this.connections.set(conn.id, conn);
    this.notify();
    return conn;
  }

  deleteConnection(id: string): boolean {
    const result = this.connections.delete(id);
    if (result) this.notify();
    return result;
  }

  deleteConnectionsByCard(cardId: string): number {
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.fromCardId === cardId || conn.toCardId === cardId) {
        this.connections.delete(conn.id);
        count++;
      }
    }
    if (count > 0) this.notify();
    return count;
  }

  static getCardBottomCenter(card: Card): Point {
    return {
      x: card.x + card.width / 2,
      y: card.y + card.height
    };
  }

  static getCardTopCenter(card: Card): Point {
    return {
      x: card.x + card.width / 2,
      y: card.y
    };
  }

  static getBezierPath(from: Point, to: Point): string {
    const dy = Math.max(40, Math.abs(to.y - from.y) * 0.5);
    const cp1x = from.x;
    const cp1y = from.y + dy;
    const cp2x = to.x;
    const cp2y = to.y - dy;
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  }

  static pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const ddx = px - projX;
    const ddy = py - projY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  static isPointNearBezier(
    px: number,
    py: number,
    from: Point,
    to: Point,
    threshold = 8
  ): boolean {
    const steps = 20;
    const dy = Math.max(40, Math.abs(to.y - from.y) * 0.5);
    const cp1x = from.x;
    const cp1y = from.y + dy;
    const cp2x = to.x;
    const cp2y = to.y - dy;

    let prevX = from.x;
    let prevY = from.y;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      const x = mt3 * from.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * to.x;
      const y = mt3 * from.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * to.y;

      const dist = ConnectionManager.pointToSegmentDistance(px, py, prevX, prevY, x, y);
      if (dist <= threshold) return true;

      prevX = x;
      prevY = y;
    }
    return false;
  }

  toJSON(): Connection[] {
    return Array.from(this.connections.values());
  }

  loadJSON(conns: Connection[]) {
    this.connections = new Map(conns.map(c => [c.id, { ...c }]));
    this.notify();
  }
}
