import { Operation, AffectedCell } from './pixelOperations';
import { v4 as uuidv4 } from 'uuid';

export interface HistoryEntry {
  operation: Operation;
  affected: AffectedCell[];
}

const BASE_URL = '/api/history';

export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private listeners: Set<() => void> = new Set();

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getAll(): HistoryEntry[] {
    return this.entries;
  }

  getOperations(): Operation[] {
    return this.entries.map(e => e.operation);
  }

  get length(): number {
    return this.entries.length;
  }

  async loadFromServer(): Promise<void> {
    try {
      const res = await fetch(BASE_URL);
      const data = await res.json();
      if (Array.isArray(data.operations)) {
        this.entries = data.operations.map((op: Operation) => ({
          operation: op,
          affected: [{ gridX: op.gridX, gridY: op.gridY, prevColor: null }]
        }));
        this.notify();
      }
    } catch {
      console.warn('无法从服务器加载历史，使用本地状态');
    }
  }

  async push(
    partial: Omit<Operation, 'id' | 'timestamp'>,
    affected: AffectedCell[]
  ): Promise<HistoryEntry | null> {
    const operation: Operation = {
      ...partial,
      id: uuidv4(),
      timestamp: Date.now()
    };
    const entry: HistoryEntry = { operation, affected };
    this.entries.push(entry);
    this.notify();

    try {
      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation)
      });
    } catch {
      console.warn('同步操作到服务器失败');
    }

    return entry;
  }

  undo(): HistoryEntry | null {
    const entry = this.entries.pop();
    if (entry) {
      this.notify();
      return entry;
    }
    return null;
  }

  getReplaySequence(): Operation[] {
    return this.entries.map(e => ({ ...e.operation }));
  }

  async clear(): Promise<void> {
    this.entries = [];
    this.notify();
    try {
      await fetch(BASE_URL, { method: 'DELETE' });
    } catch {
      console.warn('清空服务器历史失败');
    }
  }

  getEntryById(id: string): HistoryEntry | undefined {
    return this.entries.find(e => e.operation.id === id);
  }

  getIndex(entry: HistoryEntry): number {
    return this.entries.indexOf(entry);
  }
}
