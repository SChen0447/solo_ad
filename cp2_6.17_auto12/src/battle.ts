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

function animateCombatant(elementId: string, animClass: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove(animClass);
  void el.offsetWidth;
  el.classList.add(animClass);
  const duration = animClass === 'flash-anim' ? 100 : 200;
  setTimeout(() => el.classList.remove(animClass), duration);
}

export function showBattleResult(result: BattleResult, player: Player, onClose: () => void): void {
  const overlay = document.getElementById('battle-result-overlay')!;
  const titleEl = document.getElementById('battle-result-title')!;
  const msgEl = document.getElementById('battle-result-msg')!;
  const closeBtn = document.getElementById('battle-result-close')!;

  if (result === 'player_win') {
    titleEl.textContent = '🎉 战斗胜利！';
    titleEl.style.color = '#4caf50';
    msgEl.innerHTML = `恢复了 2 点生命值<br>当前 HP: ${player.hp}/${player.maxHp}`;
  } else {
    titleEl.textContent = '💀 战斗失败...';
    titleEl.style.color = '#e53935';
    msgEl.innerHTML = `最终得分: ${player.getScore()}`;
  }

  overlay.classList.add('active');

  const handler = () => {
    overlay.classList.remove('active');
    closeBtn.removeEventListener('click', handler);
    onClose();
  };
  closeBtn.addEventListener('click', handler);
}

export function showBattleOverlay(): void {
  const overlay = document.getElementById('battle-overlay')!;
  overlay.classList.add('active');
}

export function hideBattleOverlay(): void {
  const overlay = document.getElementById('battle-overlay')!;
  overlay.classList.remove('active');
}
