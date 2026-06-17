import { HistoryState } from '../types';

const MAX_HISTORY = 50;

export class HistoryManager {
  private past: HistoryState[] = [];
  private future: HistoryState[] = [];
  private present: HistoryState;

  constructor(initialState: HistoryState) {
    this.present = initialState;
  }

  push(state: HistoryState): void {
    this.past.push(this.present);
    this.present = state;
    this.future = [];

    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
  }

  undo(): HistoryState | null {
    if (this.past.length === 0) {
      return null;
    }

    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;

    if (this.future.length > MAX_HISTORY) {
      this.future.pop();
    }

    return this.present;
  }

  redo(): HistoryState | null {
    if (this.future.length === 0) {
      return null;
    }

    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;

    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }

    return this.present;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getPresent(): HistoryState {
    return this.present;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
