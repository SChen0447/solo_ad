import { Card } from './CardDeck';

export interface PlayerState {
  sid: string;
  nickname: string;
  avatar: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  handSize: number;
  defenseActive: boolean;
  isFirst: boolean;
  hand?: Card[];
}

export interface GameState {
  roomId: string;
  turnNumber: number;
  currentTurn: string;
  isMyTurn: boolean;
  gameOver: boolean;
  winner: string | null;
  me: PlayerState;
  opponent: PlayerState;
}

export interface CardPlayResult {
  card: Card;
  damage: number;
  heal: number;
  drawCount: number;
  discardCount: number;
  defenseActivated: boolean;
  playerHp: number;
  opponentHp: number;
  drawnCards?: Card[];
  discardedCard?: Card;
}

export type GamePhase = 'idle' | 'matching' | 'playing' | 'gameOver';
export type TargetPhase = 'none' | 'selecting' | 'animating';

export interface BattleAnimation {
  type: 'attack' | 'defense' | 'heal' | 'special';
  card: Card;
  fromPlayer: 'me' | 'opponent';
  targetPlayer: 'me' | 'opponent';
}

export class GameManager {
  private listeners: Set<() => void> = new Set();
  private gameState: GameState | null = null;
  private phase: GamePhase = 'idle';
  private selectedCardId: string | null = null;
  private targetPhase: TargetPhase = 'none';
  private battleAnimation: BattleAnimation | null = null;
  private mySid: string = '';

  constructor() {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getSelectedCardId(): string | null {
    return this.selectedCardId;
  }

  getTargetPhase(): TargetPhase {
    return this.targetPhase;
  }

  getBattleAnimation(): BattleAnimation | null {
    return this.battleAnimation;
  }

  getMySid(): string {
    return this.mySid;
  }

  setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.notify();
  }

  setGameState(state: GameState): void {
    this.gameState = state;
    this.mySid = state.me.sid;
    this.notify();
  }

  updateGameState(state: Partial<GameState>): void {
    if (this.gameState) {
      this.gameState = { ...this.gameState, ...state };
      this.notify();
    }
  }

  selectCard(cardId: string | null): void {
    this.selectedCardId = cardId;
    this.targetPhase = cardId ? 'selecting' : 'none';
    this.notify();
  }

  setTargetPhase(phase: TargetPhase): void {
    this.targetPhase = phase;
    this.notify();
  }

  startBattleAnimation(animation: BattleAnimation): void {
    this.battleAnimation = animation;
    this.targetPhase = 'animating';
    this.notify();
  }

  clearBattleAnimation(): void {
    this.battleAnimation = null;
    this.targetPhase = 'none';
    this.selectedCardId = null;
    this.notify();
  }

  reset(): void {
    this.gameState = null;
    this.phase = 'idle';
    this.selectedCardId = null;
    this.targetPhase = 'none';
    this.battleAnimation = null;
    this.mySid = '';
    this.notify();
  }

  canPlayCard(card: Card): boolean {
    if (!this.gameState || !this.gameState.isMyTurn) return false;
    if (this.gameState.gameOver) return false;
    if (this.targetPhase !== 'none' && this.targetPhase !== 'selecting') return false;
    return this.gameState.me.energy >= card.cost;
  }

  applyCardResult(result: CardPlayResult, isMe: boolean): void {
    if (!this.gameState) return;

    const me = { ...this.gameState.me };
    const opponent = { ...this.gameState.opponent };

    if (isMe) {
      me.hp = result.playerHp;
      opponent.hp = result.opponentHp;
      if (result.defenseActivated) {
        me.defenseActive = true;
      }
      if (result.drawnCards && me.hand) {
        me.hand = [...me.hand, ...result.drawnCards];
        me.handSize = me.hand.length;
      }
    } else {
      opponent.hp = result.playerHp;
      me.hp = result.opponentHp;
      if (result.defenseActivated) {
        opponent.defenseActive = true;
      }
      if (result.drawnCards) {
        opponent.handSize += result.drawnCards.length;
      }
    }

    this.gameState = {
      ...this.gameState,
      me,
      opponent
    };

    this.notify();
  }

  updateMyHand(hand: Card[]): void {
    if (!this.gameState) return;
    this.gameState = {
      ...this.gameState,
      me: {
        ...this.gameState.me,
        hand,
        handSize: hand.length
      }
    };
    this.notify();
  }

  removeCardFromHand(cardId: string): void {
    if (!this.gameState || !this.gameState.me.hand) return;
    const newHand = this.gameState.me.hand.filter(c => c.id !== cardId);
    this.updateMyHand(newHand);
  }

  addCardsToHand(cards: Card[]): void {
    if (!this.gameState || !this.gameState.me.hand) return;
    const newHand = [...this.gameState.me.hand, ...cards];
    if (newHand.length > 8) {
      newHand.splice(8);
    }
    this.updateMyHand(newHand);
  }

  setTurn(isMyTurn: boolean, currentTurnSid: string): void {
    if (!this.gameState) return;
    this.gameState = {
      ...this.gameState,
      isMyTurn,
      currentTurn: currentTurnSid
    };
    this.notify();
  }

  setTurnNumber(turnNumber: number): void {
    if (!this.gameState) return;
    this.gameState = {
      ...this.gameState,
      turnNumber
    };
    this.notify();
  }

  setGameOver(winner: string): void {
    if (!this.gameState) return;
    this.gameState = {
      ...this.gameState,
      gameOver: true,
      winner
    };
    this.phase = 'gameOver';
    this.notify();
  }

  get isGameOver(): boolean {
    return this.gameState?.gameOver ?? false;
  }

  get hasWon(): boolean {
    if (!this.gameState) return false;
    return this.gameState.winner === this.mySid;
  }
}

export const gameManager = new GameManager();
