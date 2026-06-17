import { Board, EliminationResult, BlockedCell } from './board';

export interface PlayerSelection {
  x: number;
  y: number;
}

export interface NegativeEffectEvent {
  type: 'rocks' | 'blocked';
  data: Array<{ x: number; y: number }> | BlockedCell[];
}

export class Player {
  id: number;
  name: string;
  score: number;
  board: Board;
  selection: PlayerSelection | null;
  timeRemaining: number;
  isActive: boolean;
  negativeEffectCallback: ((effect: NegativeEffectEvent) => void) | null;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.board = new Board();
    this.selection = null;
    this.timeRemaining = 120;
    this.isActive = false;
    this.negativeEffectCallback = null;
  }

  reset(): void {
    this.score = 0;
    this.board.reset();
    this.selection = null;
    this.timeRemaining = 120;
    this.isActive = false;
  }

  addScore(eliminations: EliminationResult[]): number {
    let totalAdded = 0;
    for (const elim of eliminations) {
      const baseScore = elim.eliminatedCount * 10;
      const chainBonus = (elim.chains - 1) * 50;
      const powerUpBonus = elim.generatedPowerUp ? 50 : 0;
      const added = baseScore + chainBonus + powerUpBonus;
      totalAdded += added;
      this.score += added;
    }
    return totalAdded;
  }

  shouldTriggerNegativeEffect(eliminations: EliminationResult[]): boolean {
    for (const elim of eliminations) {
      if (elim.eliminatedCount > 3) {
        return true;
      }
    }
    return false;
  }

  selectCell(x: number, y: number): {
    shouldSwap: boolean;
    swapX: number;
    swapY: number;
  } {
    if (!this.board.isSwappable(x, y)) {
      return { shouldSwap: false, swapX: -1, swapY: -1 };
    }

    if (this.selection === null) {
      this.selection = { x, y };
      return { shouldSwap: false, swapX: -1, swapY: -1 };
    }

    if (this.selection.x === x && this.selection.y === y) {
      this.selection = null;
      return { shouldSwap: false, swapX: -1, swapY: -1 };
    }

    if (this.board.areAdjacent(this.selection.x, this.selection.y, x, y)) {
      const sx = this.selection.x;
      const sy = this.selection.y;
      this.selection = null;
      return { shouldSwap: true, swapX: sx, swapY: sy };
    }

    this.selection = { x, y };
    return { shouldSwap: false, swapX: -1, swapY: -1 };
  }

  clearSelection(): void {
    this.selection = null;
  }

  dropRocks(count: number): Array<{ x: number; y: number }> {
    const positions = this.board.dropRocks(count);
    if (this.negativeEffectCallback && positions.length > 0) {
      this.negativeEffectCallback({ type: 'rocks', data: positions });
    }
    return positions;
  }

  blockCells(count: number, duration: number): BlockedCell[] {
    const blocked = this.board.blockRandomCells(count, duration);
    if (this.negativeEffectCallback && blocked.length > 0) {
      this.negativeEffectCallback({ type: 'blocked', data: blocked });
    }
    return blocked;
  }

  updateTimer(dt: number): boolean {
    if (!this.isActive) return false;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    return this.timeRemaining <= 0;
  }

  update(dt: number): void {
    this.board.update(dt);
  }

  setActive(active: boolean): void {
    this.isActive = active;
  }
}
