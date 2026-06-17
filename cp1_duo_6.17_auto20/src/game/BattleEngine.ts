import {
  BattleState,
  BattleEvent,
  PlayerAction,
  Card,
  CreatureOnBoard,
  Hero,
  BattlefieldCell,
  RuneType,
  PlayerState,
  RUNE_EFFECTS,
  RUNE_COUNTERS
} from './types';

const GRID_ROWS = 3;
const GRID_COLS = 3;
const MAX_TURN_TIME = 15;
const INITIAL_HAND_SIZE = 4;
const MAX_HAND_SIZE = 7;

export class BattleEngine {
  private state: BattleState;
  private listeners: Set<(state: BattleState, events: BattleEvent[]) => void>;

  constructor() {
    this.listeners = new Set();
    this.state = this.createInitialState();
  }

  private createInitialState(): BattleState {
    return {
      turn: 0,
      current_player: 'player',
      phase: 'rune_select',
      player: this.createEmptyPlayerState(),
      enemy: this.createEmptyPlayerState(),
      winner: null,
      turn_time_left: MAX_TURN_TIME,
      max_turn_time: MAX_TURN_TIME,
      event_log: []
    };
  }

  private createEmptyPlayerState(): PlayerState {
    return {
      hero: {
        runes: [],
        attack: 0,
        defense: 0,
        health: 30,
        max_health: 30,
        mana: 0,
        max_mana: 0,
        mana_per_turn: 1
      },
      deck: [],
      hand: [],
      discard_pile: [],
      battlefield: this.createEmptyBattlefield()
    };
  }

  private createEmptyBattlefield(): BattlefieldCell[][] {
    const grid: BattlefieldCell[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        grid[row][col] = {
          row,
          col,
          creature: null,
          frozen: false,
          highlight: false
        };
      }
    }
    return grid;
  }

  private addEvent(state: BattleState, type: BattleEvent['type'], data: Record<string, unknown>): BattleEvent {
    const event: BattleEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    state.event_log.push(event);
    return event;
  }

  private calculateHeroStats(runes: RuneType[]): Omit<Hero, 'runes'> {
    let attack = 0;
    let defense = 0;
    let health = 30;
    let manaPerTurn = 1;

    for (const rune of runes) {
      const effect = RUNE_EFFECTS[rune];
      if (effect) {
        attack += effect.attack;
        defense += effect.defense;
        health += effect.health;
        manaPerTurn += effect.mana;
      }
    }

    return {
      attack,
      defense,
      health,
      max_health: health,
      mana: manaPerTurn,
      max_mana: manaPerTurn,
      mana_per_turn: manaPerTurn
    };
  }

  public selectRunes(player: 'player' | 'enemy', runes: RuneType[], deck: Card[]): BattleState {
    const newState = this.cloneState(this.state);
    const playerState = newState[player];
    
    playerState.hero.runes = runes;
    const stats = this.calculateHeroStats(runes);
    Object.assign(playerState.hero, stats);
    playerState.deck = [...deck];

    const bothReady = newState.player.hero.runes.length === 3 && newState.enemy.hero.runes.length === 3;
    
    if (bothReady) {
      newState.phase = 'battle';
      this.startBattle(newState);
    }

    this.state = newState;
    this.notifyListeners([...newState.event_log]);
    return newState;
  }

  private startBattle(state: BattleState): void {
    state.turn = 1;
    state.current_player = 'player';
    
    for (const p of ['player', 'enemy'] as const) {
      const ps = state[p];
      ps.hero.mana = ps.hero.mana_per_turn;
      ps.hero.max_mana = ps.hero.mana_per_turn;
      
      for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
        this.drawCardInternal(state, p);
      }
    }

    this.addEvent(state, 'turn_start', { turn: 1, player: 'player' });
    state.turn_time_left = MAX_TURN_TIME;
  }

  private drawCardInternal(state: BattleState, player: 'player' | 'enemy'): Card | null {
    const ps = state[player];
    
    if (ps.deck.length === 0 || ps.hand.length >= MAX_HAND_SIZE) {
      return null;
    }

    const card = ps.deck.shift()!;
    ps.hand.push(card);
    
    this.addEvent(state, 'card_drawn', { player, card });
    return card;
  }

  public drawCard(player: 'player' | 'enemy'): BattleState {
    if (this.state.current_player !== player || this.state.phase !== 'battle') {
      return this.state;
    }

    const newState = this.cloneState(this.state);
    const events: BattleEvent[] = [];

    const card = this.drawCardInternal(newState, player);
    if (card) {
      events.push(newState.event_log[newState.event_log.length - 1]);
    }

    this.state = newState;
    this.notifyListeners(events);
    return newState;
  }

  public playCard(
    player: 'player' | 'enemy',
    cardInstanceId: string,
    targetPosition?: { row: number; col: number },
    targetIsHero?: boolean
  ): { state: BattleState; valid: boolean; reason?: string } {
    if (this.state.current_player !== player || this.state.phase !== 'battle') {
      return { state: this.state, valid: false, reason: '不是你的回合' };
    }

    const newState = this.cloneState(this.state);
    const ps = newState[player];
    const opponent = player === 'player' ? 'enemy' : 'player';
    const os = newState[opponent];
    
    const cardIndex = ps.hand.findIndex(c => c.instance_id === cardInstanceId);
    if (cardIndex === -1) {
      return { state: this.state, valid: false, reason: '卡牌不存在' };
    }

    const card = ps.hand[cardIndex];
    
    if (ps.hero.mana < card.cost) {
      return { state: this.state, valid: false, reason: '法力值不足' };
    }

    ps.hero.mana -= card.cost;
    ps.hand.splice(cardIndex, 1);
    ps.discard_pile.push(card);

    this.addEvent(newState, 'card_played', { player, card });

    if (card.type === 'spell') {
      this.executeSpell(newState, player, card, targetPosition, targetIsHero);
    } else if (card.type === 'creature') {
      if (!targetPosition) {
        return { state: this.state, valid: false, reason: '需要选择放置位置' };
      }
      
      const cell = ps.battlefield[targetPosition.row][targetPosition.col];
      if (cell.creature || cell.frozen) {
        return { state: this.state, valid: false, reason: '该位置无法放置' };
      }

      const creature: CreatureOnBoard = {
        instance_id: card.instance_id,
        card_id: card.id,
        name: card.name,
        attack: card.attack || 0,
        health: card.health || 1,
        max_health: card.health || 1,
        element: card.element,
        rarity: card.rarity,
        frozen: false,
        position: targetPosition,
        owner: player,
        can_attack: false
      };

      cell.creature = creature;
      this.addEvent(newState, 'creature_summoned', { player, creature, position: targetPosition });
    }

    this.checkWinCondition(newState);

    const newEvents = newState.event_log.slice(this.state.event_log.length);
    this.state = newState;
    this.notifyListeners(newEvents);

    return { state: newState, valid: true };
  }

  private executeSpell(
    state: BattleState,
    player: 'player' | 'enemy',
    card: Card,
    targetPosition?: { row: number; col: number },
    targetIsHero?: boolean
  ): void {
    const opponent = player === 'player' ? 'enemy' : 'player';
    const os = state[opponent];
    const ps = state[player];

    this.addEvent(state, 'spell_cast', { player, card });

    if (card.damage) {
      if (targetIsHero) {
        const actualDamage = Math.max(0, card.damage - os.hero.defense);
        os.hero.health = Math.max(0, os.hero.health - actualDamage);
        this.addEvent(state, 'hero_attacked', { player: opponent, damage: actualDamage });
      } else if (targetPosition) {
        const cell = os.battlefield[targetPosition.row][targetPosition.col];
        if (cell.creature) {
          this.dealDamageToCreature(state, cell.creature, card.damage, opponent);
        }
      }
      
      if (card.target_all) {
        for (let row = 0; row < GRID_ROWS; row++) {
          for (let col = 0; col < GRID_COLS; col++) {
            const cell = os.battlefield[row][col];
            if (cell.creature) {
              this.dealDamageToCreature(state, cell.creature, card.damage, opponent);
            }
          }
        }
      }
    }

    if (card.heal) {
      ps.hero.health = Math.min(ps.hero.max_health, ps.hero.health + card.heal);
      this.addEvent(state, 'heal_performed', { player, amount: card.heal });
    }

    if (card.freeze && targetPosition) {
      const cell = os.battlefield[targetPosition.row][targetPosition.col];
      cell.frozen = true;
      if (cell.creature) {
        cell.creature.frozen = true;
      }
      this.addEvent(state, 'cell_frozen', { position: targetPosition, player: opponent });
    }

    if (card.freeze_all) {
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cell = os.battlefield[row][col];
          if (cell.creature) {
            cell.frozen = true;
            cell.creature.frozen = true;
          }
        }
      }
      this.addEvent(state, 'cell_frozen', { all: true, player: opponent });
    }
  }

  private dealDamageToCreature(
    state: BattleState,
    creature: CreatureOnBoard,
    damage: number,
    owner: 'player' | 'enemy'
  ): void {
    const os = state[owner];
    creature.health -= damage;
    
    this.addEvent(state, 'damage_dealt', {
      target: 'creature',
      creature_id: creature.instance_id,
      damage,
      player: owner
    });

    if (creature.health <= 0) {
      const cell = os.battlefield[creature.position.row][creature.position.col];
      cell.creature = null;
      this.addEvent(state, 'creature_died', { creature, player: owner });
    }
  }

  public creatureAttack(
    player: 'player' | 'enemy',
    creatureId: string,
    targetPosition?: { row: number; col: number },
    targetIsHero?: boolean
  ): { state: BattleState; valid: boolean; reason?: string } {
    if (this.state.current_player !== player || this.state.phase !== 'battle') {
      return { state: this.state, valid: false, reason: '不是你的回合' };
    }

    const newState = this.cloneState(this.state);
    const ps = newState[player];
    const opponent = player === 'player' ? 'enemy' : 'player';
    const os = newState[opponent];

    let attacker: CreatureOnBoard | null = null;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = ps.battlefield[row][col];
        if (cell.creature && cell.creature.instance_id === creatureId) {
          attacker = cell.creature;
          break;
        }
      }
      if (attacker) break;
    }

    if (!attacker) {
      return { state: this.state, valid: false, reason: '生物不存在' };
    }

    if (!attacker.can_attack || attacker.frozen) {
      return { state: this.state, valid: false, reason: '该生物无法攻击' };
    }

    if (targetIsHero) {
      const actualDamage = Math.max(0, attacker.attack - os.hero.defense);
      os.hero.health = Math.max(0, os.hero.health - actualDamage);
      this.addEvent(newState, 'hero_attacked', { player: opponent, damage: actualDamage, attacker: attacker.name });
    } else if (targetPosition) {
      const targetCell = os.battlefield[targetPosition.row][targetPosition.col];
      if (!targetCell.creature) {
        return { state: this.state, valid: false, reason: '目标不存在' };
      }

      const target = targetCell.creature;
      
      this.addEvent(newState, 'creature_attacked', {
        attacker,
        target,
        attacker_damage: attacker.attack,
        target_damage: target.attack
      });

      this.dealDamageToCreature(newState, target, attacker.attack, opponent);
      if (attacker.health > 0) {
        this.dealDamageToCreature(newState, attacker, target.attack, player);
      }
    }

    if (attacker && attacker.health > 0) {
      attacker.can_attack = false;
    }

    this.checkWinCondition(newState);

    const newEvents = newState.event_log.slice(this.state.event_log.length);
    this.state = newState;
    this.notifyListeners(newEvents);

    return { state: newState, valid: true };
  }

  public endTurn(player: 'player' | 'enemy'): BattleState {
    if (this.state.current_player !== player || this.state.phase !== 'battle') {
      return this.state;
    }

    const newState = this.cloneState(this.state);
    const nextPlayer = player === 'player' ? 'enemy' : 'player';
    
    this.addEvent(newState, 'turn_end', { player });

    newState.current_player = nextPlayer;
    newState.turn++;
    newState.turn_time_left = MAX_TURN_TIME;

    const nextPs = newState[nextPlayer];
    
    nextPs.hero.max_mana = Math.min(10, nextPs.hero.max_mana + 1);
    nextPs.hero.mana = nextPs.hero.max_mana;

    this.drawCardInternal(newState, nextPlayer);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = nextPs.battlefield[row][col];
        cell.frozen = false;
        if (cell.creature) {
          cell.creature.frozen = false;
          cell.creature.can_attack = true;
        }
      }
    }

    this.addEvent(newState, 'turn_start', { turn: newState.turn, player: nextPlayer });

    const newEvents = newState.event_log.slice(this.state.event_log.length);
    this.state = newState;
    this.notifyListeners(newEvents);

    return newState;
  }

  public tickTimer(delta: number): { state: BattleState; timeUp: boolean } {
    if (this.state.phase !== 'battle') {
      return { state: this.state, timeUp: false };
    }

    const newState = this.cloneState(this.state);
    newState.turn_time_left = Math.max(0, newState.turn_time_left - delta);

    let timeUp = false;
    if (newState.turn_time_left <= 0) {
      timeUp = true;
      this.endTurnInternal(newState, newState.current_player);
    }

    this.state = newState;
    if (timeUp) {
      this.notifyListeners([...newState.event_log]);
    }

    return { state: newState, timeUp };
  }

  private endTurnInternal(state: BattleState, player: 'player' | 'enemy'): void {
    const nextPlayer = player === 'player' ? 'enemy' : 'player';
    
    this.addEvent(state, 'turn_end', { player });

    state.current_player = nextPlayer;
    state.turn++;
    state.turn_time_left = MAX_TURN_TIME;

    const nextPs = state[nextPlayer];
    nextPs.hero.max_mana = Math.min(10, nextPs.hero.max_mana + 1);
    nextPs.hero.mana = nextPs.hero.max_mana;

    this.drawCardInternal(state, nextPlayer);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = nextPs.battlefield[row][col];
        cell.frozen = false;
        if (cell.creature) {
          cell.creature.frozen = false;
          cell.creature.can_attack = true;
        }
      }
    }

    this.addEvent(state, 'turn_start', { turn: state.turn, player: nextPlayer });
    this.checkWinCondition(state);
  }

  private checkWinCondition(state: BattleState): void {
    if (state.player.hero.health <= 0) {
      state.phase = 'ended';
      state.winner = 'enemy';
      this.addEvent(state, 'game_end', { winner: 'enemy' });
    } else if (state.enemy.hero.health <= 0) {
      state.phase = 'ended';
      state.winner = 'player';
      this.addEvent(state, 'game_end', { winner: 'player' });
    }
  }

  public getState(): BattleState {
    return this.cloneState(this.state);
  }

  private cloneState(state: BattleState): BattleState {
    return JSON.parse(JSON.stringify(state));
  }

  public subscribe(listener: (state: BattleState, events: BattleEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(events: BattleEvent[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, events);
      } catch (e) {
        console.error('BattleEngine listener error:', e);
      }
    });
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.notifyListeners([]);
  }

  public getAdjacentCells(row: number, col: number): { row: number; col: number }[] {
    const adjacent: { row: number; col: number }[] = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
        adjacent.push({ row: newRow, col: newCol });
      }
    }

    return adjacent;
  }

  public calculateElementalBonus(attackerElement: RuneType, defenderElement: RuneType): number {
    if (RUNE_COUNTERS[attackerElement] === defenderElement) {
      return 1.5;
    }
    if (RUNE_COUNTERS[defenderElement] === attackerElement) {
      return 0.75;
    }
    return 1;
  }

  public dispose(): void {
    this.listeners.clear();
  }
}
