import type { Player } from './player';
import type { MonsterData } from './maze';

export interface BattleResult {
  victory: boolean;
  monsterId: string;
}

export interface BattleCallbacks {
  onEnd: (result: BattleResult) => void;
  onStatusUpdate: () => void;
}

interface BattleState {
  modal: HTMLElement;
  playerEl: HTMLElement;
  monsterEl: HTMLElement;
  attackBtn: HTMLButtonElement;
  battleLog: HTMLElement;
  player: Player | null;
  monster: MonsterData | null;
  callbacks: BattleCallbacks | null;
  isLocked: boolean;
}

const state: BattleState = {
  modal: null as unknown as HTMLElement,
  playerEl: null as unknown as HTMLElement,
  monsterEl: null as unknown as HTMLElement,
  attackBtn: null as unknown as HTMLButtonElement,
  battleLog: null as unknown as HTMLElement,
  player: null,
  monster: null,
  callbacks: null,
  isLocked: false,
};

export function initBattleSystem(): void {
  state.modal = document.getElementById('battle-modal') as HTMLElement;
  state.attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
  state.battleLog = document.getElementById('battle-log') as HTMLElement;
  state.playerEl = document.querySelector('.combatant.player') as HTMLElement;
  state.monsterEl = document.querySelector('.combatant.monster') as HTMLElement;

  state.attackBtn.addEventListener('click', handleAttackClick);
}

export function startBattle(player: Player, monster: MonsterData, callbacks: BattleCallbacks): void {
  state.player = player;
  state.monster = monster;
  state.callbacks = callbacks;
  state.isLocked = false;

  const monsterName = document.getElementById('monster-name') as HTMLElement;
  if (monsterName) monsterName.textContent = monster.name;

  updateBattleUI();
  clearBattleLog();
  addBattleLog(`遭遇了 ${monster.name}！战斗开始！`);

  state.attackBtn.disabled = false;
  state.modal.classList.add('active');
}

function handleAttackClick(): void {
  if (state.isLocked || !state.player || !state.monster || !state.callbacks) return;
  state.isLocked = true;
  state.attackBtn.disabled = true;

  playerAttack();
}

function playerAttack(): void {
  if (!state.player || !state.monster) return;

  const player = state.player;
  const monster = state.monster;

  const baseDamage = player.attack;
  const actualDamage = Math.max(1, baseDamage - monster.defense);
  monster.hp = Math.max(0, monster.hp - actualDamage);

  player.consumePowerUpIfActive();

  addBattleLog(`🧙 你对 ${monster.name} 造成了 ${actualDamage} 点伤害！`);

  playAttackAnimation(state.playerEl);
  setTimeout(() => playHitAnimation(state.monsterEl), 100);

  updateBattleUI();

  setTimeout(() => {
    if (monster.hp <= 0) {
      handleVictory();
    } else {
      monsterAttack();
    }
  }, 400);
}

function monsterAttack(): void {
  if (!state.player || !state.monster) return;

  const player = state.player;
  const monster = state.monster;

  const actualDamage = player.takeDamage(monster.attack);

  addBattleLog(`${monster.name} 对你造成了 ${actualDamage} 点伤害！`);

  playAttackAnimation(state.monsterEl);
  setTimeout(() => playHitAnimation(state.playerEl), 100);

  updateBattleUI();

  setTimeout(() => {
    if (!player.isAlive()) {
      handleDefeat();
    } else {
      state.isLocked = false;
      state.attackBtn.disabled = false;
    }
  }, 400);
}

function handleVictory(): void {
  if (!state.player || !state.monster || !state.callbacks) return;

  const player = state.player;
  const monster = state.monster;

  addBattleLog(`🎉 击败了 ${monster.name}！`);

  player.incrementKilled();

  const healed = player.heal(2);
  if (healed > 0) {
    addBattleLog(`💚 恢复了 ${healed} 点生命值！`);
  }

  player.resetPowerUpAfterBattle();

  setTimeout(() => {
    closeBattle();
    state.callbacks!.onEnd({ victory: true, monsterId: monster.id });
  }, 1200);
}

function handleDefeat(): void {
  if (!state.player || !state.monster || !state.callbacks) return;

  addBattleLog(`💀 你被 ${state.monster.name} 击败了...`);

  setTimeout(() => {
    closeBattle();
    state.callbacks!.onEnd({ victory: false, monsterId: state.monster!.id });
  }, 1500);
}

function closeBattle(): void {
  state.modal.classList.remove('active');
  state.player = null;
  state.monster = null;
  state.callbacks = null;
  state.isLocked = false;
}

function updateBattleUI(): void {
  if (!state.player || !state.monster) return;

  const player = state.player;
  const monster = state.monster;

  const playerHpBar = document.getElementById('player-hp-bar') as HTMLElement;
  const playerHpValue = document.getElementById('player-hp-value') as HTMLElement;
  const playerAtkBar = document.getElementById('player-atk-bar') as HTMLElement;
  const playerAtkValue = document.getElementById('player-atk-value') as HTMLElement;
  const playerDefBar = document.getElementById('player-def-bar') as HTMLElement;
  const playerDefValue = document.getElementById('player-def-value') as HTMLElement;

  const monsterHpBar = document.getElementById('monster-hp-bar') as HTMLElement;
  const monsterHpValue = document.getElementById('monster-hp-value') as HTMLElement;
  const monsterAtkBar = document.getElementById('monster-atk-bar') as HTMLElement;
  const monsterAtkValue = document.getElementById('monster-atk-value') as HTMLElement;
  const monsterDefBar = document.getElementById('monster-def-bar') as HTMLElement;
  const monsterDefValue = document.getElementById('monster-def-value') as HTMLElement;

  const playerHpPercent = (player.hp / player.maxHp) * 100;
  if (playerHpBar) {
    playerHpBar.style.width = `${playerHpPercent}%`;
    playerHpBar.classList.toggle('low', playerHpPercent < 40);
  }
  if (playerHpValue) playerHpValue.textContent = `${player.hp}/${player.maxHp}`;
  if (playerAtkBar) playerAtkBar.style.width = `${Math.min(player.attack * 10, 100)}%`;
  if (playerAtkValue) playerAtkValue.textContent = String(player.attack);
  if (playerDefBar) playerDefBar.style.width = `${Math.min(player.defense * 10, 100)}%`;
  if (playerDefValue) playerDefValue.textContent = String(player.defense);

  const monsterHpPercent = (monster.hp / monster.maxHp) * 100;
  if (monsterHpBar) {
    monsterHpBar.style.width = `${monsterHpPercent}%`;
    monsterHpBar.classList.toggle('low', monsterHpPercent < 40);
  }
  if (monsterHpValue) monsterHpValue.textContent = `${monster.hp}/${monster.maxHp}`;
  if (monsterAtkBar) monsterAtkBar.style.width = `${Math.min(monster.attack * 10, 100)}%`;
  if (monsterAtkValue) monsterAtkValue.textContent = String(monster.attack);
  if (monsterDefBar) monsterDefBar.style.width = `${Math.min(monster.defense * 10, 100)}%`;
  if (monsterDefValue) monsterDefValue.textContent = String(monster.defense);

  if (state.callbacks) {
    state.callbacks.onStatusUpdate();
  }
}

function playAttackAnimation(el: HTMLElement): void {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 150);
}

function playHitAnimation(el: HTMLElement): void {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 250);
}

function addBattleLog(message: string): void {
  if (!state.battleLog) return;
  const p = document.createElement('p');
  p.textContent = message;
  state.battleLog.appendChild(p);
  state.battleLog.scrollTop = state.battleLog.scrollHeight;
}

function clearBattleLog(): void {
  if (!state.battleLog) return;
  state.battleLog.innerHTML = '';
}
