import { BattleUnit, BattleFrame, BattleResult, PlacedHero, WaveConfig, GridPosition, Skill } from '../types';

const GRID_SIZE = 8;
const MAX_TURNS = 20;
const FRAMES_PER_ACTION = 3;

function getDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findNearestEnemy(unit: BattleUnit, enemies: BattleUnit[]): BattleUnit | null {
  let nearest: BattleUnit | null = null;
  let minDist = Infinity;
  for (const enemy of enemies) {
    if (enemy.actionState === 'dead') continue;
    const dist = getDistance(unit.position, enemy.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  }
  return nearest;
}

function findNearestAlly(unit: BattleUnit, allies: BattleUnit[]): BattleUnit | null {
  let nearest: BattleUnit | null = null;
  let minDist = Infinity;
  for (const ally of allies) {
    if (ally.id === unit.id) continue;
    if (ally.actionState === 'dead') continue;
    const dist = getDistance(unit.position, ally.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = ally;
    }
  }
  return nearest;
}

function moveTowards(unit: BattleUnit, target: BattleUnit): GridPosition {
  const dx = target.position.x - unit.position.x;
  const dy = target.position.y - unit.position.y;
  let newX = unit.position.x;
  let newY = unit.position.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) newX++;
    else if (dx < 0) newX--;
  } else {
    if (dy > 0) newY++;
    else if (dy < 0) newY--;
  }

  newX = Math.max(0, Math.min(GRID_SIZE - 1, newX));
  newY = Math.max(0, Math.min(GRID_SIZE - 1, newY));

  return { x: newX, y: newY };
}

function cloneUnits(units: BattleUnit[]): BattleUnit[] {
  return units.map((u) => ({
    ...u,
    position: { ...u.position },
    currentCooldowns: { ...u.currentCooldowns },
    skills: u.skills.map((s) => ({ ...s })),
  }));
}

function createFrame(turn: number, frameIndex: number, units: BattleUnit[], log: string): BattleFrame {
  return {
    frameIndex,
    turn,
    units: cloneUnits(units),
    log,
  };
}

function getReadySkill(unit: BattleUnit, target: BattleUnit): Skill | null {
  for (const skill of unit.skills) {
    const cd = unit.currentCooldowns[skill.id] || 0;
    if (cd > 0) continue;
    if (skill.type === 'heal') {
      if (!unit.isEnemy && getDistance(unit.position, target.position) <= skill.range) {
        return skill;
      }
    } else if (skill.type === 'damage' || skill.type === 'debuff') {
      if (getDistance(unit.position, target.position) <= skill.range) {
        return skill;
      }
    }
  }
  return null;
}

function calculateDamage(attacker: BattleUnit, defender: BattleUnit, multiplier: number = 1): number {
  const variance = 0.9 + Math.random() * 0.2;
  const rawDamage = attacker.attack * multiplier - defender.defense * 0.5;
  return Math.max(1, Math.round(rawDamage * variance));
}

export function runSimulation(heroes: PlacedHero[], wave: WaveConfig): BattleResult {
  const startTime = Date.now();

  const heroUnits: BattleUnit[] = heroes.map((h) => ({
    ...h,
    isEnemy: false,
    currentCooldowns: {},
    actionState: 'idle' as const,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
  }));

  const enemyUnits: BattleUnit[] = wave.enemies.map((e, idx) => ({
    id: e.id + '-' + idx,
    name: e.name,
    heroClass: 'warrior' as const,
    maxHp: e.maxHp,
    hp: e.maxHp,
    attack: e.attack,
    defense: e.defense,
    speed: e.speed,
    skills: [],
    avatar: e.avatar,
    position: { ...e.startPosition },
    isEnemy: true,
    currentCooldowns: {},
    actionState: 'idle' as const,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
  }));

  const allUnits = [...heroUnits, ...enemyUnits];
  const frames: BattleFrame[] = [];
  let frameIndex = 0;

  frames.push(createFrame(0, frameIndex++, allUnits, '战斗开始！'));

  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;

    const aliveHeroes = heroUnits.filter((u) => u.actionState !== 'dead');
    const aliveEnemies = enemyUnits.filter((u) => u.actionState !== 'dead');

    if (aliveHeroes.length === 0 || aliveEnemies.length === 0) break;

    const turnOrder = [...aliveHeroes, ...aliveEnemies].sort((a, b) => b.speed - a.speed);

    for (const unit of turnOrder) {
      if (unit.actionState === 'dead') continue;

      const allies = unit.isEnemy ? enemyUnits : heroUnits;
      const enemies = unit.isEnemy ? heroUnits : enemyUnits;

      for (const skillId in unit.currentCooldowns) {
        if (unit.currentCooldowns[skillId] > 0) {
          unit.currentCooldowns[skillId]--;
        }
      }

      unit.actionState = 'idle';

      let target = findNearestEnemy(unit, enemies);

      if (!target) continue;

      const dist = getDistance(unit.position, target.position);

      if (unit.skills.length > 0 && !unit.isEnemy) {
        if (unit.heroClass === 'support') {
          const injuredAlly = allies
            .filter((a) => a.actionState !== 'dead' && a.hp < a.maxHp * 0.7)
            .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (injuredAlly) {
            const healSkill = unit.skills.find(
              (s) => s.type === 'heal' && (unit.currentCooldowns[s.id] || 0) === 0 && getDistance(unit.position, injuredAlly.position) <= s.range
            );
            if (healSkill) {
              unit.actionState = 'casting';
              unit.targetId = injuredAlly.id;
              const healAmount = Math.round(injuredAlly.maxHp * Math.abs(healSkill.damage));
              injuredAlly.hp = Math.min(injuredAlly.maxHp, injuredAlly.hp + healAmount);
              unit.currentCooldowns[healSkill.id] = healSkill.cooldown;
              frames.push(createFrame(turn, frameIndex++, allUnits, `${unit.name} 对 ${injuredAlly.name} 使用 ${healSkill.name}，恢复 ${healAmount} 生命`));
              continue;
            }
          }
        }

        const damageSkill = getReadySkill(unit, target);
        if (damageSkill && dist <= damageSkill.range) {
          unit.actionState = 'casting';
          unit.targetId = target.id;
          const damage = calculateDamage(unit, target, damageSkill.damage);
          target.hp -= damage;
          target.damageTaken += damage;
          unit.damageDealt += damage;
          unit.currentCooldowns[damageSkill.id] = damageSkill.cooldown;

          if (target.hp <= 0) {
            target.hp = 0;
            target.actionState = 'dead';
            unit.kills++;
          }

          frames.push(createFrame(turn, frameIndex++, allUnits, `${unit.name} 对 ${target.name} 使用 ${damageSkill.name}，造成 ${damage} 点伤害`));
          continue;
        }
      }

      if (dist <= 1) {
        unit.actionState = 'attacking';
        unit.targetId = target.id;
        const damage = calculateDamage(unit, target, 1);
        target.hp -= damage;
        target.damageTaken += damage;
        unit.damageDealt += damage;

        if (target.hp <= 0) {
          target.hp = 0;
          target.actionState = 'dead';
          unit.kills++;
        }

        frames.push(createFrame(turn, frameIndex++, allUnits, `${unit.name} 攻击 ${target.name}，造成 ${damage} 点伤害`));
      } else {
        const newPos = moveTowards(unit, target);
        const occupied = allUnits.some(
          (u) => u.id !== unit.id && u.actionState !== 'dead' && u.position.x === newPos.x && u.position.y === newPos.y
        );
        if (!occupied) {
          unit.position = newPos;
          unit.actionState = 'moving';
        }
        frames.push(createFrame(turn, frameIndex++, allUnits, `${unit.name} 向 ${target.name} 移动`));
      }
    }
  }

  const heroSurvivors = heroUnits.filter((u) => u.actionState !== 'dead').length;
  const enemySurvivors = enemyUnits.filter((u) => u.actionState !== 'dead').length;
  let victory: 'win' | 'lose' | 'draw' = 'draw';
  if (heroSurvivors > 0 && enemySurvivors === 0) victory = 'win';
  else if (heroSurvivors === 0 && enemySurvivors > 0) victory = 'lose';

  frames.push(createFrame(turn, frameIndex++, allUnits, `战斗结束！${victory === 'win' ? '胜利！' : victory === 'lose' ? '失败...' : '平局。'}`));

  const duration = Date.now() - startTime;

  const result: BattleResult = {
    id: 'battle-' + Date.now(),
    timestamp: Date.now(),
    totalTurns: turn,
    victory,
    duration,
    heroStats: heroUnits.map((h) => ({
      heroId: h.id,
      heroName: h.name,
      kills: h.kills,
      damageDealt: h.damageDealt,
      damageTaken: h.damageTaken,
    })),
    frames,
    heroIds: heroes.map((h) => h.id),
    enemyWaveId: wave.id,
  };

  return result;
}
