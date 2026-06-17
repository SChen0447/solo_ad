import { Player } from './player';
import { MonsterData } from './maze';

export type BattleResult = 'player_win' | 'player_lose';

export interface BattleState {
  player: Player;
  monster: MonsterData;
  result: BattleResult | null;
  log: string[];
  playerDefending: boolean;
}

export function createBattleState(player: Player, monster: MonsterData): BattleState {
  return {
    player,
    monster,
    result: null,
    log: [],
    playerDefending: false
  };
}

function getHpColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio > 0.6) return '#4caf50';
  if (ratio > 0.3) return '#ff9800';
  return '#e53935';
}

const animationLocks: Map<string, boolean> = new Map();
const animationCleanup: Map<string, () => void> = new Map();

function cancelAnimation(elementId: string): void {
  const cleanup = animationCleanup.get(elementId);
  if (cleanup) {
    cleanup();
    animationCleanup.delete(elementId);
  }
  animationLocks.delete(elementId);
}

function animateCombatant(elementId: string, animClass: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;

  cancelAnimation(elementId);

  const animDuration = animClass === 'flash-anim' ? 100 : 200;
  animationLocks.set(elementId, true);

  let rafId: number | null = null;
  let eventHandler: ((e: AnimationEvent) => void) | null = null;
  let fallbackTimer: number | null = null;

  const cleanup = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (eventHandler !== null) {
      el.removeEventListener('animationend', eventHandler);
      eventHandler = null;
    }
    el.classList.remove(animClass);
    animationLocks.delete(elementId);
  };

  animationCleanup.set(elementId, cleanup);

  rafId = requestAnimationFrame(() => {
    el.classList.remove(animClass);
    void el.offsetWidth;

    eventHandler = (e: AnimationEvent) => {
      if (e.animationName === (animClass === 'flash-anim' ? 'attackFlash' : 'hitShake')) {
        cleanup();
        animationCleanup.delete(elementId);
      }
    };
    el.addEventListener('animationend', eventHandler);

    el.classList.add(animClass);

    fallbackTimer = window.setTimeout(() => {
      if (animationLocks.get(elementId)) {
        cleanup();
        animationCleanup.delete(elementId);
      }
    }, animDuration + 50);

    rafId = null;
  });
}

function showDamageNumber(targetElementId: string, damage: number, isMonsterDamage: boolean): void {
  const targetEl = document.getElementById(targetElementId);
  const cardEl = document.getElementById('battle-card');
  if (!targetEl || !cardEl) return;

  const dmgEl = document.createElement('div');
  dmgEl.className = `damage-number ${isMonsterDamage ? 'monster-dmg' : 'player-dmg'}`;
  dmgEl.textContent = `-${damage}`;

  const cardRect = cardEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const left = targetRect.left - cardRect.left + targetRect.width / 2;
  const top = targetRect.top - cardRect.top + targetRect.height / 2;

  dmgEl.style.left = `${left}px`;
  dmgEl.style.top = `${top}px`;

  cardEl.appendChild(dmgEl);

  const cleanupDmg = () => {
    dmgEl.remove();
    dmgEl.removeEventListener('animationend', cleanupDmg);
  };

  dmgEl.addEventListener('animationend', cleanupDmg);

  setTimeout(() => {
    if (dmgEl.parentNode) {
      cleanupDmg();
    }
  }, 600);
}

export function renderBattleUI(state: BattleState): void {
  const playerInfoEl = document.getElementById('player-info')!;
  const monsterInfoEl = document.getElementById('monster-info')!;
  const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;
  const defendBtn = document.getElementById('defend-btn') as HTMLButtonElement;

  const p = state.player;
  const m = state.monster;

  playerInfoEl.innerHTML = `
    <div class="combatant-name" style="color:#2196f3;">🧙 冒险者</div>
    <div class="attr-bar-container">
      <div class="attr-bar-fill" style="width:${(p.hp / p.maxHp) * 100}%;background:${getHpColor(p.hp, p.maxHp)};"></div>
    </div>
    <div class="combatant-stats">HP: ${p.hp}/${p.maxHp} | ATK: ${p.atk} | DEF: ${p.def}${state.playerDefending ? ' | 🛡️ 防御中' : ''}</div>
  `;

  monsterInfoEl.innerHTML = `
    <div class="combatant-name" style="color:#e53935;">👹 怪物</div>
    <div class="attr-bar-container">
      <div class="attr-bar-fill" style="width:${(m.hp / m.maxHp) * 100}%;background:${getHpColor(m.hp, m.maxHp)};"></div>
    </div>
    <div class="combatant-stats">HP: ${m.hp}/${m.maxHp} | ATK: ${m.atk} | DEF: ${m.def}</div>
  `;

  const logEl = document.getElementById('battle-log')!;
  const recentLogs = state.log.slice(-3);
  logEl.innerHTML = recentLogs.map(msg => `<div>${msg}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;

  const disabled = state.result !== null;
  attackBtn.disabled = disabled;
  defendBtn.disabled = disabled;

  if (state.playerDefending) {
    defendBtn.classList.add('defending');
  } else {
    defendBtn.classList.remove('defending');
  }
}

export function playerAttack(state: BattleState): BattleState {
  if (state.result !== null) return state;

  state.playerDefending = false;

  const dmg = Math.max(1, state.player.atk - state.monster.def);
  state.monster.hp = Math.max(0, state.monster.hp - dmg);
  state.log.push(`玩家攻击怪物，造成 ${dmg} 点伤害`);

  animateCombatant('player-info', 'flash-anim');
  animateCombatant('monster-info', 'shake-anim');

  requestAnimationFrame(() => {
    showDamageNumber('monster-info', dmg, true);
  });

  if (state.monster.hp <= 0) {
    state.monster.alive = false;
    state.result = 'player_win';
    state.player.killedMonsters++;
    state.player.heal(2);
    state.player.consumePowerBoost();
    state.log.push('你击败了怪物！恢复 2 点生命值。');
    return state;
  }

  return monsterCounterAttack(state);
}

export function playerDefend(state: BattleState): BattleState {
  if (state.result !== null) return state;

  state.playerDefending = true;
  state.log.push('玩家进入防御姿态');

  return monsterCounterAttack(state);
}

function monsterCounterAttack(state: BattleState): BattleState {
  let dmg = Math.max(1, state.monster.atk - state.player.def);

  if (state.playerDefending) {
    dmg = Math.max(1, Math.floor(dmg / 2));
  }

  state.player.hp = Math.max(0, state.player.hp - dmg);
  state.log.push(`怪物反击，造成 ${dmg} 点伤害${state.playerDefending ? '（防御减半）' : ''}`);

  animateCombatant('monster-info', 'flash-anim');
  animateCombatant('player-info', 'shake-anim');

  requestAnimationFrame(() => {
    showDamageNumber('player-info', dmg, false);
  });

  if (state.player.isDead()) {
    state.result = 'player_lose';
    state.log.push('你被击败了...');
  }

  state.playerDefending = false;

  return state;
}
