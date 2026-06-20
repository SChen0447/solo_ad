import { CardData, CardInstance, createCardInstance, hasAdvantage, getCardById } from './cardData';

export type PlayerSide = 'player' | 'ai';
export type GamePhase = 'start' | 'draw' | 'play' | 'attack' | 'end' | 'gameOver';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface PlayerState {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  deck: string[];
  hand: CardInstance[];
  field: CardInstance[];
  graveyard: CardInstance[];
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  currentTurn: PlayerSide;
  player: PlayerState;
  ai: PlayerState;
  battleLog: string[];
  winner: PlayerSide | null;
  selectedCard: CardInstance | null;
  attackingCard: CardInstance | null;
}

export interface BattleResult {
  attackerDmg: number;
  defenderDmg: number;
  isAdvantage: boolean;
  attackerKilled: boolean;
  defenderKilled: boolean;
}

const MAX_FIELD_SIZE = 6;
const MAX_HAND_SIZE = 7;
const STARTING_HAND_SIZE = 4;
const STARTING_HEALTH = 30;
const STARTING_MANA = 1;
const MAX_MANA = 10;

function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createInitialPlayerState(deckIds: string[]): PlayerState {
  const shuffled = shuffleDeck(deckIds);
  const hand: CardInstance[] = [];

  for (let i = 0; i < STARTING_HAND_SIZE && shuffled.length > 0; i++) {
    const cardId = shuffled.shift()!;
    const cardData = getCardById(cardId);
    if (cardData) {
      hand.push(createCardInstance(cardData, i));
    }
  }

  return {
    health: STARTING_HEALTH,
    maxHealth: STARTING_HEALTH,
    mana: STARTING_MANA,
    maxMana: STARTING_MANA,
    deck: shuffled,
    hand,
    field: [],
    graveyard: []
  };
}

export function createInitialGameState(playerDeck: string[], aiDeck: string[]): GameState {
  return {
    phase: 'start',
    turn: 1,
    currentTurn: 'player',
    player: createInitialPlayerState(playerDeck),
    ai: createInitialPlayerState(aiDeck),
    battleLog: ['游戏开始！'],
    winner: null,
    selectedCard: null,
    attackingCard: null
  };
}

export function drawCard(player: PlayerState): CardInstance | null {
  if (player.deck.length === 0) return null;
  if (player.hand.length >= MAX_HAND_SIZE) {
    player.deck.shift();
    return null;
  }
  const cardId = player.deck.shift()!;
  const cardData = getCardById(cardId);
  if (!cardData) return null;
  const instance = createCardInstance(cardData, player.hand.length);
  player.hand.push(instance);
  return instance;
}

export function canPlayCard(player: PlayerState, card: CardInstance): boolean {
  return player.mana >= card.cost && player.field.length < MAX_FIELD_SIZE;
}

export function playCard(player: PlayerState, card: CardInstance, log: string[]): boolean {
  if (!canPlayCard(player, card)) return false;

  player.mana -= card.cost;
  const handIndex = player.hand.findIndex(c => c.instanceId === card.instanceId);
  if (handIndex === -1) return false;
  player.hand.splice(handIndex, 1);

  card.justSummoned = true;
  card.hasAttacked = false;
  card.canAttack = card.skill === '突袭' || card.skill === '暗影突袭';
  card.currentHealth = card.health;
  card.currentAttack = card.attack;

  player.field.push(card);
  log.push(`召唤了 ${card.name}（${card.cost}费）`);

  applySummonSkill(card, player, log);

  return true;
}

function applySummonSkill(card: CardInstance, player: PlayerState, log: string[]) {
  switch (card.skill) {
    case '引燃':
      log.push(`${card.name} 的引燃效果触发！`);
      break;
    case '黎明之光':
      const drawn = drawCard(player);
      if (drawn) {
        log.push(`${card.name} 的黎明之光触发，抽了一张牌！`);
      }
      break;
    case '圣光治愈':
      player.field.forEach(c => {
        if (c.instanceId !== card.instanceId) {
          c.currentHealth = Math.min(c.health, c.currentHealth + 1);
        }
      });
      log.push(`${card.name} 的圣光治愈触发，治疗己方所有卡牌1点！`);
      break;
  }
}

export function calculateBattle(
  attacker: CardInstance,
  defender: CardInstance
): BattleResult {
  const isAdvantage = hasAdvantage(attacker.element, defender.element);
  let attackerDmg = attacker.currentAttack;
  let defenderDmg = defender.currentAttack;

  if (isAdvantage) {
    attackerDmg = Math.floor(attackerDmg * 1.5);
  }

  if (defender.skill === '水之壁垒') {
    attackerDmg = Math.max(0, attackerDmg - 1);
  }
  if (attacker.skill === '水之壁垒') {
    defenderDmg = Math.max(0, defenderDmg - 1);
  }

  const defenderKilled = defender.currentHealth - attackerDmg <= 0;
  const attackerKilled = attacker.currentHealth - defenderDmg <= 0;

  return { attackerDmg, defenderDmg, isAdvantage, attackerKilled, defenderKilled };
}

export function attack(
  state: GameState,
  attackerSide: PlayerSide,
  attacker: CardInstance,
  defender: CardInstance
): boolean {
  if (!attacker.canAttack || attacker.hasAttacked) return false;

  const attackerPlayer = attackerSide === 'player' ? state.player : state.ai;
  const defenderPlayer = attackerSide === 'player' ? state.ai : state.player;

  const atkIdx = attackerPlayer.field.findIndex(c => c.instanceId === attacker.instanceId);
  const defIdx = defenderPlayer.field.findIndex(c => c.instanceId === defender.instanceId);
  if (atkIdx === -1 || defIdx === -1) return false;

  const result = calculateBattle(attacker, defender);

  state.battleLog.push(`${attacker.name} 攻击了 ${defender.name}${result.isAdvantage ? '（属性克制！）' : ''}`);

  applyAttackDamage(defenderPlayer, defIdx, result.attackerDmg, state.battleLog, attacker, attackerPlayer);
  applyAttackDamage(attackerPlayer, atkIdx, result.defenderDmg, state.battleLog, defender, defenderPlayer);

  attacker.hasAttacked = true;
  attacker.canAttack = false;

  applyOnHitSkill(attacker, defender, result, state, attackerSide);

  checkGameOver(state);

  return true;
}

function applyAttackDamage(
  player: PlayerState,
  cardIndex: number,
  damage: number,
  log: string[],
  opponentCard: CardInstance,
  opponentPlayer: PlayerState
) {
  if (cardIndex < 0 || cardIndex >= player.field.length) return;
  const card = player.field[cardIndex];

  if (card.skill === '神圣护盾' && card.currentHealth === card.health) {
    log.push(`${card.name} 的神圣护盾触发，免疫了伤害！`);
    return;
  }

  if (card.skill === '疾风护盾' && Math.random() < 0.25) {
    log.push(`${card.name} 闪避了攻击！`);
    return;
  }
  if (card.skill === '幽灵之身' && Math.random() < 0.3) {
    log.push(`${card.name} 的幽灵之身触发，闪避了攻击！`);
    return;
  }

  card.currentHealth -= damage;

  if (card.skill === '烈焰护盾' && card.currentHealth > 0) {
    opponentCard.currentHealth = Math.max(0, opponentCard.currentHealth - 2);
    log.push(`${card.name} 的烈焰护盾反弹了2点伤害！`);
  }

  if (card.currentHealth <= 0) {
    handleCardDeath(player, cardIndex, log);
  }
}

function handleCardDeath(player: PlayerState, cardIndex: number, log: string[]) {
  const card = player.field[cardIndex];

  if (card.skill === '涅槃' && Math.random() < 0.3) {
    card.currentHealth = card.health;
    log.push(`${card.name} 的涅槃触发，复活了！`);
    return;
  }

  log.push(`${card.name} 被消灭了！`);
  const deadCard = player.field.splice(cardIndex, 1)[0];
  player.graveyard.push(deadCard);

  if (card.skill === '亡灵召唤') {
    const skeleton = createCardInstance({
      id: 'skeleton',
      name: '骷髅',
      element: 'dark',
      type: 'attack',
      cost: 0,
      attack: 2,
      health: 2,
      skill: '无',
      skillDesc: ''
    }, player.field.length);
    skeleton.canAttack = false;
    skeleton.justSummoned = true;
    player.field.push(skeleton);
    log.push(`亡灵召唤触发，召唤了一个骷髅！`);
  }
}

function applyOnHitSkill(
  attacker: CardInstance,
  defender: CardInstance,
  result: BattleResult,
  state: GameState,
  attackerSide: PlayerSide
) {
  const attackerPlayer = attackerSide === 'player' ? state.player : state.ai;
  const defenderPlayer = attackerSide === 'player' ? state.ai : state.player;

  switch (attacker.skill) {
    case '吸血':
      const healAmount = Math.min(result.attackerDmg, attacker.health - attacker.currentHealth);
      attacker.currentHealth = Math.min(attacker.health, attacker.currentHealth + result.attackerDmg);
      if (healAmount > 0) {
        state.battleLog.push(`${attacker.name} 的吸血效果恢复了 ${healAmount} 点生命！`);
      }
      break;
    case '潮汐冲击':
      attacker.currentHealth = Math.min(attacker.health, attacker.currentHealth + 1);
      break;
    case '黑暗吞噬':
      if (result.defenderKilled) {
        attacker.currentAttack += 2;
        state.battleLog.push(`${attacker.name} 的黑暗吞噬触发，攻击力+2！`);
      }
      break;
    case '熔岩爆发':
      defenderPlayer.field.forEach(c => {
        if (c.instanceId !== defender.instanceId) {
          c.currentHealth -= 1;
        }
      });
      const deadCards = defenderPlayer.field.filter(c => c.currentHealth <= 0);
      deadCards.forEach(c => {
        const idx = defenderPlayer.field.findIndex(fc => fc.instanceId === c.instanceId);
        if (idx !== -1) handleCardDeath(defenderPlayer, idx, state.battleLog);
      });
      break;
    case '神圣审判':
      if (Math.random() < 0.3) {
        defender.currentHealth = 0;
        const defIdx = defenderPlayer.field.findIndex(c => c.instanceId === defender.instanceId);
        if (defIdx !== -1) handleCardDeath(defenderPlayer, defIdx, state.battleLog);
        state.battleLog.push(`${attacker.name} 的神圣审判触发，直接消灭了目标！`);
      }
      break;
    case '闪电突袭':
      if (Math.random() < 0.4) {
        defender.currentHealth -= result.attackerDmg;
        state.battleLog.push(`${attacker.name} 的闪电突袭触发，造成双倍伤害！`);
        const defIdx = defenderPlayer.field.findIndex(c => c.instanceId === defender.instanceId);
        if (defIdx !== -1 && defender.currentHealth <= 0) {
          handleCardDeath(defenderPlayer, defIdx, state.battleLog);
        }
      }
      break;
    case '俯冲':
      if (attacker.justSummoned) {
        defender.currentHealth -= 2;
        state.battleLog.push(`${attacker.name} 的俯冲触发，额外造成2点伤害！`);
        const defIdx = defenderPlayer.field.findIndex(c => c.instanceId === defender.instanceId);
        if (defIdx !== -1 && defender.currentHealth <= 0) {
          handleCardDeath(defenderPlayer, defIdx, state.battleLog);
        }
      }
      break;
    case '灼热打击':
      defender.currentHealth -= 1;
      state.battleLog.push(`${attacker.name} 的灼热打击附加了1点燃烧伤害！`);
      const dIdx = defenderPlayer.field.findIndex(c => c.instanceId === defender.instanceId);
      if (dIdx !== -1 && defender.currentHealth <= 0) {
        handleCardDeath(defenderPlayer, dIdx, state.battleLog);
      }
      break;
  }

  attacker.justSummoned = false;
}

export function startTurn(state: GameState): void {
  const currentPlayer = state.currentTurn === 'player' ? state.player : state.ai;
  const sideName = state.currentTurn === 'player' ? '玩家' : 'AI';

  state.phase = 'draw';
  state.battleLog.push(`--- 第 ${state.turn} 回合 - ${sideName} ---`);

  if (currentPlayer.maxMana < MAX_MANA) {
    currentPlayer.maxMana += 1;
  }
  currentPlayer.mana = currentPlayer.maxMana;

  currentPlayer.field.forEach(c => {
    c.canAttack = true;
    c.hasAttacked = false;
    c.justSummoned = false;
  });

  const drawn = drawCard(currentPlayer);
  if (drawn) {
    state.battleLog.push(`${sideName} 抽了一张牌`);
  } else if (currentPlayer.deck.length === 0) {
    state.battleLog.push(`${sideName} 的牌库空了！`);
  } else {
    state.battleLog.push(`${sideName} 手牌已满，牌被烧掉了`);
  }

  applyTurnStartSkills(currentPlayer, state.battleLog);

  state.phase = 'play';
  checkGameOver(state);
}

function applyTurnStartSkills(player: PlayerState, log: string[]) {
  player.field.forEach(card => {
    if (card.skill === '治愈之泉') {
      player.field.forEach(c => {
        c.currentHealth = Math.min(c.health, c.currentHealth + 1);
      });
      log.push(`${card.name} 的治愈之泉恢复了己方生命！`);
    }
  });
}

export function endTurn(state: GameState): void {
  state.phase = 'end';

  if (state.currentTurn === 'player') {
    state.currentTurn = 'ai';
  } else {
    state.currentTurn = 'player';
    state.turn += 1;
  }

  state.attackingCard = null;
  state.selectedCard = null;
}

export function checkGameOver(state: GameState): boolean {
  if (state.player.health <= 0) {
    state.winner = 'ai';
    state.phase = 'gameOver';
    state.battleLog.push('游戏结束 - AI获胜！');
    return true;
  }
  if (state.ai.health <= 0) {
    state.winner = 'player';
    state.phase = 'gameOver';
    state.battleLog.push('游戏结束 - 玩家获胜！');
    return true;
  }

  if (state.player.field.length === 0 && state.player.hand.length === 0 && state.player.deck.length === 0) {
    state.winner = 'ai';
    state.phase = 'gameOver';
    state.battleLog.push('游戏结束 - 玩家无牌可用，AI获胜！');
    return true;
  }
  if (state.ai.field.length === 0 && state.ai.hand.length === 0 && state.ai.deck.length === 0) {
    state.winner = 'player';
    state.phase = 'gameOver';
    state.battleLog.push('游戏结束 - AI无牌可用，玩家获胜！');
    return true;
  }

  return false;
}

export function directAttack(state: GameState, attackerSide: PlayerSide, attacker: CardInstance): boolean {
  if (!attacker.canAttack || attacker.hasAttacked) return false;

  const defenderPlayer = attackerSide === 'player' ? state.ai : state.player;
  const attackerPlayer = attackerSide === 'player' ? state.player : state.ai;

  if (defenderPlayer.field.length > 0) return false;

  const atkIdx = attackerPlayer.field.findIndex(c => c.instanceId === attacker.instanceId);
  if (atkIdx === -1) return false;

  const damage = attacker.currentAttack;
  defenderPlayer.health -= damage;
  state.battleLog.push(`${attacker.name} 直接攻击了对方英雄，造成 ${damage} 点伤害！`);

  attacker.hasAttacked = true;
  attacker.canAttack = false;
  attacker.justSummoned = false;

  checkGameOver(state);
  return true;
}
