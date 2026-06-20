import {
  Card,
  CardType,
  BOARD_SIZE,
  MAX_HAND_SIZE,
  PLAY_PER_TURN,
  DRAW_PER_TURN,
  VICTORY_PERCENT,
  createDeck,
  drawCards,
  getNeighbors,
  generateId,
} from './CardDeck';

export interface HexCell {
  q: number;
  r: number;
  owner: string | null;
  durability: number;
  blocked: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  hand: Card[];
  territories: number;
  cardsPlayedThisTurn: number;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  turn: number;
  currentTurnIndex: number;
  turnOrder: string[];
  players: Record<string, Player>;
  board: Record<string, HexCell>;
  deck: Card[];
  discardPile: Card[];
  winner: string | null;
  selectedCardId: string | null;
  selectedMoveFrom: [number, number] | null;
  lastAction: {
    type: string;
    target?: { q: number; r: number };
    playerId?: string;
    timestamp: number;
  } | null;
}

export type BoardKey = string;

export function cellKey(q: number, r: number): BoardKey {
  return `${q},${r}`;
}

export function createInitialBoard(): Record<string, HexCell> {
  const board: Record<string, HexCell> = {};
  for (let q = 0; q < BOARD_SIZE; q++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const key = cellKey(q, r);
      board[key] = {
        q,
        r,
        owner: null,
        durability: 0,
        blocked: false,
      };
    }
  }
  return board;
}

function emptyState(): GameState {
  return {
    status: 'waiting',
    turn: 1,
    currentTurnIndex: 0,
    turnOrder: [],
    players: {},
    board: createInitialBoard(),
    deck: [],
    discardPile: [],
    winner: null,
    selectedCardId: null,
    selectedMoveFrom: null,
    lastAction: null,
  };
}

export class GameEngine {
  private state: GameState = emptyState();
  private listeners: Set<() => void> = new Set();
  private localPlayerId: string = '';

  constructor() {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  getState(): GameState {
    return this.state;
  }

  setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  getCurrentPlayerId(): string | null {
    if (this.state.turnOrder.length === 0) return null;
    const idx = this.state.currentTurnIndex % this.state.turnOrder.length;
    return this.state.turnOrder[idx];
  }

  isMyTurn(): boolean {
    return this.getCurrentPlayerId() === this.localPlayerId;
  }

  getLocalPlayer(): Player | null {
    return this.state.players[this.localPlayerId] || null;
  }

  canPlayCard(): boolean {
    if (!this.isMyTurn()) return false;
    const player = this.getLocalPlayer();
    if (!player) return false;
    return player.cardsPlayedThisTurn < PLAY_PER_TURN;
  }

  syncFromServer(serverState: Partial<GameState> & {
    players?: any[];
    board?: any;
  }): void {
    if (serverState.status !== undefined) this.state.status = serverState.status as any;
    if (serverState.turn !== undefined) this.state.turn = serverState.turn;
    if (serverState.currentTurnIndex !== undefined)
      this.state.currentTurnIndex = serverState.currentTurnIndex;
    if (serverState.turnOrder) this.state.turnOrder = serverState.turnOrder;
    if (serverState.winner !== undefined) this.state.winner = serverState.winner;
    if (serverState.players) {
      const players: Record<string, Player> = {};
      serverState.players.forEach((p: any) => {
        players[p.id] = {
          id: p.id,
          name: p.name,
          color: p.color,
          ready: p.ready,
          hand: this.state.players[p.id]?.hand || [],
          territories: p.territories || 0,
          cardsPlayedThisTurn: p.cardsPlayed || 0,
        };
      });
      this.state.players = players;
    }
    if (serverState.board) {
      this.state.board = {};
      Object.keys(serverState.board).forEach((key) => {
        const c = serverState.board[key];
        this.state.board[key] = {
          q: c.q,
          r: c.r,
          owner: c.owner,
          durability: c.durability || 0,
          blocked: c.blocked || false,
        };
      });
    }
    this.notify();
  }

  updateLocalHand(hand: Card[]): void {
    if (this.localPlayerId && this.state.players[this.localPlayerId]) {
      this.state.players[this.localPlayerId].hand = hand;
      this.notify();
    }
  }

  selectCard(cardId: string | null): void {
    if (!this.canPlayCard()) return;
    this.state.selectedCardId = cardId;
    this.state.selectedMoveFrom = null;
    this.notify();
  }

  selectMoveFrom(q: number, r: number): void {
    const card = this.getSelectedCard();
    if (!card || card.type !== 'move') return;
    const key = cellKey(q, r);
    const cell = this.state.board[key];
    if (!cell || cell.owner !== this.localPlayerId || cell.blocked) return;
    this.state.selectedMoveFrom = [q, r];
    this.notify();
  }

  getSelectedCard(): Card | null {
    if (!this.state.selectedCardId) return null;
    const player = this.getLocalPlayer();
    if (!player) return null;
    return player.hand.find((c) => c.id === this.state.selectedCardId) || null;
  }

  isTargetValid(q: number, r: number): boolean {
    const card = this.getSelectedCard();
    if (!card) return false;
    return this.validateTarget(card.type, q, r, this.localPlayerId);
  }

  validateTarget(type: CardType, q: number, r: number, playerId: string, fromQ?: number, fromR?: number): boolean {
    const key = cellKey(q, r);
    const cell = this.state.board[key];
    if (!cell) return false;

    switch (type) {
      case 'occupy': {
        if (cell.owner !== null) return false;
        const hasTerritory = Object.values(this.state.board).some(
          (c) => c.owner === playerId,
        );
        if (!hasTerritory) return true;
        return getNeighbors(q, r).some(([nq, nr]) => {
          const nkey = cellKey(nq, nr);
          const ncell = this.state.board[nkey];
          return ncell && ncell.owner === playerId && !ncell.blocked;
        });
      }
      case 'fortify': {
        if (cell.owner !== playerId) return false;
        if (cell.blocked) return false;
        return cell.durability < 3;
      }
      case 'move': {
        if (fromQ === undefined || fromR === undefined) return false;
        const fk = cellKey(fromQ, fromR);
        const fcell = this.state.board[fk];
        if (!fcell || fcell.owner !== playerId || fcell.blocked) return false;
        if (cell.owner !== null) return false;
        const neighbors = getNeighbors(fromQ, fromR);
        return neighbors.some(([nq, nr]) => nq === q && nr === r);
      }
      case 'block': {
        if (cell.owner === null || cell.owner === playerId) return false;
        return !cell.blocked;
      }
      case 'lightning': {
        return cell.owner !== null && cell.owner !== playerId;
      }
      default:
        return false;
    }
  }

  setLastAction(type: string, target?: { q: number; r: number }, playerId?: string): void {
    this.state.lastAction = {
      type,
      target,
      playerId,
      timestamp: Date.now(),
    };
    this.state.selectedCardId = null;
    this.state.selectedMoveFrom = null;
    setTimeout(() => {
      if (this.state.lastAction?.timestamp === Date.now() - 0) {
        this.state.lastAction = null;
      }
      this.notify();
    }, 600);
    this.notify();
  }

  clearSelection(): void {
    this.state.selectedCardId = null;
    this.state.selectedMoveFrom = null;
    this.notify();
  }

  reset(): void {
    this.state = emptyState();
    this.notify();
  }
}

export const gameEngine = new GameEngine();
