import { v4 as uuidv4 } from 'uuid';
import type { ComboRule, ElementType, Character, BattleState, BattleEvent, StatusEffect, GridCoord } from '../types';

function getDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function addEvent(events: BattleEvent[], type: BattleEvent['type'], message: string, data?: Record<string, unknown>): BattleEvent[] {
  return [...events, {
    id: uuidv4(),
    timestamp: Date.now(),
    type,
    message,
    data,
  }];
}

function addStatusEffect(char: Character, effect: Omit<StatusEffect, 'id'>): Character {
  return {
    ...char,
    statusEffects: [...char.statusEffects, { ...effect, id: uuidv4() }],
  };
}

function findCharactersInRange(state: BattleState, center: GridCoord, range: number, excludeId?: string): Character[] {
  return state.characters.filter(c => {
    if (!c.position || c.id === excludeId || !c.isAlive) return false;
    return getDistance(c.position, center) <= range;
  });
}

const fireWindCombo: ComboRule = {
  id: 'fire_wind_spread',
  name: '燃烧扩散',
  description: '火系+风系：使目标周围1格敌人也陷入燃烧状态，每回合受到8点伤害持续3回合',
  elements: ['fire', 'wind'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    if (!target.position) return { affectedTargets: [], extraDamage: 0, eventLog };
    
    const affectedTargets: string[] = [];
    let log = addEvent(eventLog, 'combo', `🔥🌪️ 触发连锁【燃烧扩散】！目标周围陷入燃烧！`);
    
    const nearbyEnemies = findCharactersInRange(battleState, target.position, 1, target.id)
      .filter(c => c.team !== source.team);
    
    const burnEffect: Omit<StatusEffect, 'id'> = {
      type: 'burn',
      duration: 3,
      value: 8,
      sourceElement: 'fire',
    };
    
    battleState.characters = battleState.characters.map(c => {
      if (c.id === target.id) {
        return addStatusEffect(c, burnEffect);
      }
      if (nearbyEnemies.find(e => e.id === c.id)) {
        affectedTargets.push(c.id);
        log = addEvent(log, 'status', `${c.name} 被燃烧扩散波及，陷入燃烧状态！`);
        return addStatusEffect(c, burnEffect);
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: 0, eventLog: log };
  },
};

const thunderWaterCombo: ComboRule = {
  id: 'thunder_water_paralyze',
  name: '导电麻痹',
  description: '雷系+水系：使目标及其后方1格敌人麻痹1回合无法行动',
  elements: ['thunder', 'water'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    if (!target.position || !source.position) return { affectedTargets: [], extraDamage: 0, eventLog };
    
    const affectedTargets: string[] = [];
    let log = addEvent(eventLog, 'combo', `⚡💧 触发连锁【导电麻痹】！目标及其后方被麻痹！`);
    
    const dx = Math.sign(target.position.x - source.position.x);
    const dy = Math.sign(target.position.y - source.position.y);
    const backCoord: GridCoord = {
      x: target.position.x + dx,
      y: target.position.y + dy,
    };
    
    const paralyzeEffect: Omit<StatusEffect, 'id'> = {
      type: 'paralyze',
      duration: 1,
      value: 0,
      sourceElement: 'thunder',
    };
    
    battleState.characters = battleState.characters.map(c => {
      if (c.id === target.id) {
        log = addEvent(log, 'status', `${c.name} 被导电麻痹，无法行动1回合！`);
        return addStatusEffect(c, paralyzeEffect);
      }
      if (c.position && c.position.x === backCoord.x && c.position.y === backCoord.y && c.team !== source.team && c.isAlive) {
        affectedTargets.push(c.id);
        log = addEvent(log, 'status', `${c.name} 被导电蔓延波及，麻痹1回合！`);
        return addStatusEffect(c, paralyzeEffect);
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: 0, eventLog: log };
  },
};

const windThunderCombo: ComboRule = {
  id: 'wind_thunder_storm',
  name: '雷暴风暴',
  description: '风系+雷系：对目标周围2格敌人造成额外30点雷系伤害',
  elements: ['wind', 'thunder'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    if (!target.position) return { affectedTargets: [], extraDamage: 0, eventLog };
    
    const affectedTargets: string[] = [];
    let extraDamage = 0;
    let log = addEvent(eventLog, 'combo', `🌪️⚡ 触发连锁【雷暴风暴】！对周围2格造成额外雷系伤害！`);
    
    const nearbyEnemies = findCharactersInRange(battleState, target.position, 2)
      .filter(c => c.team !== source.team);
    
    const damage = 30;
    battleState.characters = battleState.characters.map(c => {
      if (nearbyEnemies.find(e => e.id === c.id)) {
        affectedTargets.push(c.id);
        const actualDamage = Math.max(1, damage - c.defense);
        extraDamage += actualDamage;
        log = addEvent(log, 'damage', `${c.name} 受到雷暴风暴 ${actualDamage} 点额外雷系伤害！`);
        return {
          ...c,
          currentHp: Math.max(0, c.currentHp - actualDamage),
          isAlive: c.currentHp - actualDamage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage, eventLog: log };
  },
};

const waterFireCombo: ComboRule = {
  id: 'water_fire_steam',
  name: '蒸汽爆发',
  description: '水系+火系：产生蒸汽爆发，对目标造成25点额外伤害并降低其防御10点',
  elements: ['water', 'fire'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    const affectedTargets: string[] = [target.id];
    let log = addEvent(eventLog, 'combo', `💧🔥 触发连锁【蒸汽爆发】！高温蒸汽灼烧目标！`);
    
    const damage = 25;
    const actualDamage = Math.max(1, damage - target.defense);
    
    const debuffEffect: Omit<StatusEffect, 'id'> = {
      type: 'defense_up',
      duration: 2,
      value: -10,
      sourceElement: 'water',
    };
    
    battleState.characters = battleState.characters.map(c => {
      if (c.id === target.id) {
        log = addEvent(log, 'damage', `${c.name} 受到蒸汽爆发 ${actualDamage} 点伤害，防御降低10点！`);
        const updated = addStatusEffect(c, debuffEffect);
        return {
          ...updated,
          currentHp: Math.max(0, c.currentHp - actualDamage),
          isAlive: c.currentHp - actualDamage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: actualDamage, eventLog: log };
  },
};

const fireThunderCombo: ComboRule = {
  id: 'fire_thunder_overload',
  name: '超载爆炸',
  description: '火系+雷系：触发超载爆炸，对目标及其周围1格造成40点额外伤害',
  elements: ['fire', 'thunder'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    if (!target.position) return { affectedTargets: [], extraDamage: 0, eventLog };
    
    const affectedTargets: string[] = [];
    let extraDamage = 0;
    let log = addEvent(eventLog, 'combo', `🔥⚡ 触发连锁【超载爆炸】！剧烈的元素爆炸！`);
    
    const nearbyEnemies = findCharactersInRange(battleState, target.position, 1)
      .filter(c => c.team !== source.team);
    
    if (!nearbyEnemies.find(e => e.id === target.id)) {
      nearbyEnemies.push(target);
    }
    
    const damage = 40;
    battleState.characters = battleState.characters.map(c => {
      if (nearbyEnemies.find(e => e.id === c.id)) {
        affectedTargets.push(c.id);
        const actualDamage = Math.max(1, damage - c.defense);
        extraDamage += actualDamage;
        log = addEvent(log, 'damage', `${c.name} 受到超载爆炸 ${actualDamage} 点额外伤害！`);
        return {
          ...c,
          currentHp: Math.max(0, c.currentHp - actualDamage),
          isAlive: c.currentHp - actualDamage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage, eventLog: log };
  },
};

const earthWindCombo: ComboRule = {
  id: 'earth_wind_sandstorm',
  name: '沙尘暴',
  description: '土系+风系：召唤沙尘暴，对目标周围2格造成持续伤害并降低命中',
  elements: ['earth', 'wind'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    if (!target.position) return { affectedTargets: [], extraDamage: 0, eventLog };
    
    const affectedTargets: string[] = [];
    let log = addEvent(eventLog, 'combo', `🪨🌪️ 触发连锁【沙尘暴】！沙石漫天飞舞！`);
    
    const nearbyEnemies = findCharactersInRange(battleState, target.position, 2)
      .filter(c => c.team !== source.team);
    
    const poisonEffect: Omit<StatusEffect, 'id'> = {
      type: 'poison',
      duration: 3,
      value: 6,
      sourceElement: 'earth',
    };
    
    const damage = 15;
    battleState.characters = battleState.characters.map(c => {
      if (nearbyEnemies.find(e => e.id === c.id)) {
        affectedTargets.push(c.id);
        const actualDamage = Math.max(1, damage - c.defense);
        log = addEvent(log, 'damage', `${c.name} 受到沙尘暴 ${actualDamage} 点伤害并陷入中毒状态！`);
        const updated = addStatusEffect(c, poisonEffect);
        return {
          ...updated,
          currentHp: Math.max(0, c.currentHp - actualDamage),
          isAlive: c.currentHp - actualDamage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: damage * affectedTargets.length, eventLog: log };
  },
};

const lightDarkCombo: ComboRule = {
  id: 'light_dark_annihilation',
  name: '光暗湮灭',
  description: '光系+暗系：光暗碰撞产生湮灭反应，造成50点真实伤害（无视防御）',
  elements: ['light', 'dark'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    const affectedTargets: string[] = [target.id];
    let log = addEvent(eventLog, 'combo', `✨🌑 触发连锁【光暗湮灭】！光暗碰撞产生毁灭性能量！`);
    
    const damage = 50;
    battleState.characters = battleState.characters.map(c => {
      if (c.id === target.id) {
        log = addEvent(log, 'damage', `${c.name} 受到光暗湮灭 ${damage} 点真实伤害（无视防御）！`);
        return {
          ...c,
          currentHp: Math.max(0, c.currentHp - damage),
          isAlive: c.currentHp - damage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: damage, eventLog: log };
  },
};

const waterEarthCombo: ComboRule = {
  id: 'water_earth_mud',
  name: '泥沼陷阱',
  description: '水系+土系：制造泥沼困住目标，使其眩晕1回合并受到20点伤害',
  elements: ['water', 'earth'],
  effect: (source: Character, target: Character, battleState: BattleState, eventLog: BattleEvent[]) => {
    const affectedTargets: string[] = [target.id];
    let log = addEvent(eventLog, 'combo', `💧🪨 触发连锁【泥沼陷阱】！目标被泥沼困住！`);
    
    const damage = 20;
    const actualDamage = Math.max(1, damage - target.defense);
    
    const stunEffect: Omit<StatusEffect, 'id'> = {
      type: 'stun',
      duration: 1,
      value: 0,
      sourceElement: 'earth',
    };
    
    battleState.characters = battleState.characters.map(c => {
      if (c.id === target.id) {
        log = addEvent(log, 'damage', `${c.name} 受到泥沼 ${actualDamage} 点伤害并被眩晕1回合！`);
        const updated = addStatusEffect(c, stunEffect);
        return {
          ...updated,
          currentHp: Math.max(0, c.currentHp - actualDamage),
          isAlive: c.currentHp - actualDamage > 0,
        };
      }
      return c;
    });
    
    return { affectedTargets, extraDamage: actualDamage, eventLog: log };
  },
};

export const comboRules: ComboRule[] = [
  fireWindCombo,
  thunderWaterCombo,
  windThunderCombo,
  waterFireCombo,
  fireThunderCombo,
  earthWindCombo,
  lightDarkCombo,
  waterEarthCombo,
];

export function findMatchingCombo(lastElement: ElementType, currentElement: ElementType): ComboRule | undefined {
  return comboRules.find(rule => {
    const [first, second] = rule.elements;
    return (first === lastElement && second === currentElement);
  });
}

export function getAllComboRules(): ComboRule[] {
  return comboRules;
}
