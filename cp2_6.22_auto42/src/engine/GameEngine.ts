import { CardDeckManager } from './CardDeckManager';
import { BattleResolver, HeroState, BattleResult } from './BattleResolver';
import { CardInstance, Card, CARD_POOL } from './types';

export type GamePhase = 'deck_building' | 'battle' | 'game_over';
export type TurnOwner = 'player' | 'ai';
export type GameWinner = 'player' | 'ai' | null;

export interface GameState {
  phase: GamePhase;
  turn: number;
  currentTurn: TurnOwner;
  playerHero: HeroState;
  aiHero: HeroState;
  playerMana: number;
  playerMaxMana: number;
  aiMana: number;
  aiMaxMana: number;
  playerHand: CardInstance[];
  aiHand: CardInstance[];
  playerDeckSize: number;
  aiDeckSize: number;
  selectedCardId: string | null;
  winner: GameWinner;
  battleLog: BattleLogEntry[];
}

export interface BattleLogEntry {
  id: number;
  timestamp: string;
  actor: TurnOwner;
  action: string;
  details: string;
}

export interface GameEngineListener {
  onStateChange(state: GameState): void;
}

const INITIAL_HAND_SIZE: number = 4;
const DRAW_PER_TURN: number = 1;
const MAX_MANA: number = 10;
const DECK_SIZE: number = 15;

export class GameEngine {
  private playerDeckManager: CardDeckManager;
  private aiDeckManager: CardDeckManager;
  private battleResolver: BattleResolver;
  private state: GameState;
  private listeners: Set<GameEngineListener> = new Set();
  private logCounter: number = 0;

  constructor() {
    this.playerDeckManager = new CardDeckManager();
    this.aiDeckManager = new CardDeckManager();
    this.battleResolver = new BattleResolver();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'deck_building',
      turn: 0,
      currentTurn: 'player',
      playerHero: this.battleResolver.createInitialHeroState(),
      aiHero: this.battleResolver.createInitialHeroState(),
      playerMana: 0,
      playerMaxMana: 0,
      aiMana: 0,
      aiMaxMana: 0,
      playerHand: [],
      aiHand: [],
      playerDeckSize: 0,
      aiDeckSize: 0,
      selectedCardId: null,
      winner: null,
      battleLog: []
    };
  }

  public subscribe(listener: GameEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l.onStateChange({ ...this.state }));
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getCardPool(): Card[] {
    return CARD_POOL;
  }

  public startBattle(playerDeckIds: string[]): void {
    this.state = this.createInitialState();
    this.state.phase = 'battle';
    this.logCounter = 0;

    const aiDeckIds = this.aiDeckManager.generateRandomDeck(DECK_SIZE);
    this.playerDeckManager.buildDeck(playerDeckIds);
    this.aiDeckManager.buildDeck(aiDeckIds);

    this.state.playerDeckSize = this.playerDeckManager.getDeckSize();
    this.state.aiDeckSize = this.aiDeckManager.getDeckSize();

    this.playerDeckManager.drawCard(INITIAL_HAND_SIZE);
    this.aiDeckManager.drawCard(INITIAL_HAND_SIZE);

    this.updateHandState();

    this.addLog('system', '游戏开始', '玩家先手');
    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    this.state.turn++;
    this.state.currentTurn = 'player';
    this.state.playerMaxMana = Math.min(MAX_MANA, this.state.playerMaxMana + 1);
    this.state.playerMana = this.state.playerMaxMana;

    this.playerDeckManager.drawCard(DRAW_PER_TURN);
    this.updateHandState();

    this.addLog('player', '回合开始', `第${this.state.turn}回合，法力水晶 ${this.state.playerMana}/${this.state.playerMaxMana}`);
    this.notifyListeners();
  }

  public startAiTurn(): void {
    this.state.currentTurn = 'ai';
    this.state.aiMaxMana = Math.min(MAX_MANA, this.state.aiMaxMana + 1);
    this.state.aiMana = this.state.aiMaxMana;

    this.aiDeckManager.drawCard(DRAW_PER_TURN);
    this.updateHandState();

    this.addLog('ai', '回合开始', `AI第${this.state.turn}回合，法力水晶 ${this.state.aiMana}/${this.state.aiMaxMana}`);
    this.notifyListeners();
  }

  public endPlayerTurn(): void {
    if (this.state.phase !== 'battle' || this.state.currentTurn !== 'player') {
      return;
    }
    this.state.selectedCardId = null;
    this.addLog('player', '回合结束', '玩家结束回合');
    this.startAiTurn();
  }

  public endAiTurn(): void {
    if (this.state.phase !== 'battle' || this.state.currentTurn !== 'ai') {
      return;
    }
    this.addLog('ai', '回合结束', 'AI结束回合');
    this.startPlayerTurn();
  }

  public selectCard(instanceId: string | null): void {
    if (this.state.phase !== 'battle' || this.state.currentTurn !== 'player') {
      return;
    }
    this.state.selectedCardId = instanceId;
    this.notifyListeners();
  }

  public playSelectedCard(): boolean {
    if (!this.state.selectedCardId) {
      return false;
    }
    return this.playCard(this.state.selectedCardId, 'player');
  }

  public playCard(instanceId: string, actor: TurnOwner): boolean {
    if (this.state.phase !== 'battle' || this.state.currentTurn !== actor) {
      return false;
    }

    const deckManager = actor === 'player' ? this.playerDeckManager : this.aiDeckManager;
    const hand = actor === 'player' ? this.state.playerHand : this.state.aiHand;
    const cardInstance = hand.find(c => c.instanceId === instanceId);

    if (!cardInstance) {
      return false;
    }

    const currentMana = actor === 'player' ? this.state.playerMana : this.state.aiMana;
    if (cardInstance.card.cost > currentMana) {
      return false;
    }

    const removedCard = deckManager.playCard(instanceId);
    if (!removedCard) {
      return false;
    }

    if (actor === 'player') {
      this.state.playerMana -= cardInstance.card.cost;
    } else {
      this.state.aiMana -= cardInstance.card.cost;
    }

    this.resolveCardEffects(removedCard, actor);

    this.updateHandState();

    if (actor === 'player') {
      this.state.selectedCardId = null;
    }

    this.checkGameOver();
    this.notifyListeners();
    return true;
  }

  private resolveCardEffects(card: CardInstance, actor: TurnOwner): void {
    const attackerState = actor === 'player' ? { ...this.state.playerHero } : { ...this.state.aiHero };
    const defenderState = actor === 'player' ? { ...this.state.aiHero } : { ...this.state.playerHero };

    const { result, newAttackerState, newDefenderState } = this.battleResolver.resolveCardPlay(
      card,
      actor,
      attackerState,
      defenderState
    );

    for (const effect of result.effectsApplied) {
      if (effect.type === 'draw') {
        const dm = actor === 'player' ? this.playerDeckManager : this.aiDeckManager;
        dm.drawCard(effect.value);
      }
    }

    if (actor === 'player') {
      this.state.playerHero = newAttackerState;
      this.state.aiHero = newDefenderState;
    } else {
      this.state.aiHero = newAttackerState;
      this.state.playerHero = newDefenderState;
    }

    const effectDesc = result.effectsApplied
      .map(e => `${this.getEffectName(e.type)} ${e.value}`)
      .join(', ');
    this.addLog(actor, '打出卡牌', `${card.card.name} - ${effectDesc}`);

    if (result.damageDealt > 0) {
      this.addLog(actor, '造成伤害', `对${actor === 'player' ? 'AI' : '玩家'}造成${result.damageDealt}点伤害${result.armorAbsorbed > 0 ? `（护甲吸收${result.armorAbsorbed}点）` : ''}`);
    }
  }

  private getEffectName(type: string): string {
    const map: Record<string, string> = {
      damage: '伤害',
      heal: '治疗',
      armor: '护甲',
      draw: '抽牌'
    };
    return map[type] || type;
  }

  private updateHandState(): void {
    this.state.playerHand = this.playerDeckManager.getHand();
    this.state.aiHand = this.aiDeckManager.getHand();
    this.state.playerDeckSize = this.playerDeckManager.getDeckSize();
    this.state.aiDeckSize = this.aiDeckManager.getDeckSize();
  }

  private checkGameOver(): void {
    if (this.battleResolver.isDefeated(this.state.aiHero)) {
      this.state.phase = 'game_over';
      this.state.winner = 'player';
      this.addLog('system', '游戏结束', '玩家获胜！');
    } else if (this.battleResolver.isDefeated(this.state.playerHero)) {
      this.state.phase = 'game_over';
      this.state.winner = 'ai';
      this.addLog('system', '游戏结束', 'AI获胜！');
    }
  }

  private addLog(actor: TurnOwner | 'system', action: string, details: string): void {
    this.logCounter++;
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.state.battleLog.push({
      id: this.logCounter,
      timestamp,
      actor: actor === 'system' ? 'player' : actor,
      action,
      details
    });
  }

  public clearBattleLog(): void {
    this.state.battleLog = [];
    this.notifyListeners();
  }

  public resetGame(): void {
    this.state = this.createInitialState();
    this.notifyListeners();
  }
}
