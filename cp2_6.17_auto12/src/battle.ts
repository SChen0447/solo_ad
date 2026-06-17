import { Player } from './player';
import { MonsterData } from './maze';

export type BattleResult = 'player_win' | 'player_lose';

export interface BattleState {
  player: Player;
  monster: MonsterData;
  result: BattleResult | null;
  log: string[];
}

export function createBattleState(player: Player, monster: MonsterData): BattleState {
  return {
    player,
    monster,
    result: null,
    log: []
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

export function renderBattleUI(state: BattleState): void {
  const playerInfoEl = document.getElementById('player-info')!;
  const monsterInfoEl = document.getElementById('monster-info')!;
  const attackBtn = document.getElementById('attack-btn') as HTMLButtonElement;

  const p = state.player;
  const m = state.monster;

  playerInfoEl.innerHTML = `
    <div class="combatant-name" style="color:#2196f3;">🧙 冒险者</div>
    <div class="attr-bar-container">
      <div class="attr-bar-fill" style="width:${(p.hp / p.maxHp) * 100}%;background:${getHpColor(p.hp, p.maxHp)};"></div>
    </div>
    <div class="combatant-stats">HP: ${p.hp}/${p.maxHp} | ATK: ${p.atk} | DEF: ${p.def}</div>
  `;

  monsterInfoEl.innerHTML = `
    <div class="combatant-name" style="color:#e53935;">👹 怪物</div>
    <div class="attr-bar-container">
      <div class="attr-bar-fill" style="width:${(m.hp / m.maxHp) * 100}%;background:${getHpColor(m.hp, m.maxHp)};"></div>
    </div>
    <div class="combatant-stats">HP: ${m.hp}/${m.maxHp} | ATK: ${m.atk} | DEF: ${m.def}</div>
  `;

  const logEl = document.getElementById('battle-log')!;
  logEl.innerHTML = state.log.map(msg => `<div>${msg}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;

  attackBtn.disabled = state.result !== null;
}

export function playerAttack(state: BattleState): BattleState {
  if (state.result !== null) return state;

  const dmg = Math.max(1, state.player.atk - state.monster.def);
  state.monster.hp = Math.max(0, state.monster.hp - dmg);
  state.log.push(`你造成了 ${dmg} 点伤害！`);

  animateCombatant('player-info', 'flash-anim');
  animateCombatant('monster-info', 'shake-anim');

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

function monsterCounterAttack(state: BattleState): BattleState {
  const dmg = Math.max(1, state.monster.atk - state.player.def);
  state.player.takeDamage(state.monster.atk);
  state.log.push(`怪物反击，造成了 ${dmg} 点伤害！`);

  animateCombatant('monster-info', 'flash-anim');
  animateCombatant('player-info', 'shake-anim');

  if (state.player.isDead()) {
    state.result = 'player_lose';
    state.log.push('你被击败了...');
  }

  return state;
}
