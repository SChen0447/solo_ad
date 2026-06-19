import { Enemy, BattleState, BattleAnimation, Player, Item } from './types';
import { getTotalAttack, getTotalDefense, generateRandomItem } from './ItemSystem';

function randomFactor(): number {
  return 0.8 + Math.random() * 0.4;
}

export function calculateDamage(attack: number, defense: number): number {
  const rawDamage = attack * randomFactor() - defense / 2;
  return Math.max(1, Math.floor(rawDamage));
}

export function createBattleState(enemy: Enemy): BattleState {
  return {
    active: true,
    enemy: { ...enemy },
    playerTurn: true,
    log: [`遭遇了 ${enemy.name}！`],
    animation: null,
  };
}

export function addBattleLog(log: string[], message: string, maxLength: number = 5): string[] {
  const newLog = [...log, message];
  if (newLog.length > maxLength) {
    return newLog.slice(newLog.length - maxLength);
  }
  return newLog;
}

export function playerAttack(
  state: BattleState,
  player: Player
): { state: BattleState; damage: number; enemyDefeated: boolean } {
  if (!state.enemy || !state.playerTurn) {
    return { state, damage: 0, enemyDefeated: false };
  }

  const playerAtk = getTotalAttack(player.attack, player.equippedWeapon);
  const damage = calculateDamage(playerAtk, state.enemy.defense);
  const newEnemyHp = Math.max(0, state.enemy.hp - damage);
  const defeated = newEnemyHp === 0;

  const animation: BattleAnimation = {
    type: 'playerAttack',
    duration: 300,
    elapsed: 0,
    damage,
    target: 'enemy',
  };

  const newState: BattleState = {
    ...state,
    enemy: { ...state.enemy, hp: newEnemyHp },
    playerTurn: defeated ? true : false,
    log: addBattleLog(state.log, `你对 ${state.enemy.name} 造成了 ${damage} 点伤害！`),
    animation,
  };

  if (defeated) {
    newState.log = addBattleLog(newState.log, `击败了 ${state.enemy.name}！`);
  }

  return { state: newState, damage, enemyDefeated: defeated };
}

export function enemyAttack(
  state: BattleState,
  player: Player
): { state: BattleState; damage: number; playerDefeated: boolean } {
  if (!state.enemy || state.playerTurn) {
    return { state, damage: 0, playerDefeated: false };
  }

  const playerDef = getTotalDefense(player.defense, player.equippedArmor);
  const damage = calculateDamage(state.enemy.attack, playerDef);

  const animation: BattleAnimation = {
    type: 'enemyAttack',
    duration: 300,
    elapsed: 0,
    damage,
    target: 'player',
  };

  const newState: BattleState = {
    ...state,
    playerTurn: true,
    log: addBattleLog(state.log, `${state.enemy.name} 对你造成了 ${damage} 点伤害！`),
    animation,
  };

  return { state: newState, damage, playerDefeated: false };
}

export function updateBattleAnimation(state: BattleState, deltaTime: number): BattleState {
  if (!state.animation) return state;

  const newElapsed = state.animation.elapsed + deltaTime;
  if (newElapsed >= state.animation.duration) {
    return { ...state, animation: null };
  }

  return {
    ...state,
    animation: {
      ...state.animation,
      elapsed: newElapsed,
    },
  };
}

export function generateEnemyDrop(): Item {
  return generateRandomItem();
}

export function generateChestLoot(): Item[] {
  const items: Item[] = [];
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    items.push(generateRandomItem());
  }
  return items;
}
