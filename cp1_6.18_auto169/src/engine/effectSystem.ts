import { v4 as uuidv4 } from 'uuid';
import type {
  Character,
  Skill,
  StatusEffect,
  BattleState,
  BattleEvent,
  GridCoord,
  FloatingText,
  ElementType,
} from '../types';

export function getDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getEffectiveAttack(char: Character): number {
  let attack = char.attack;
  char.statusEffects.forEach(effect => {
    if (effect.type === 'attack_up') {
      attack += effect.value;
    }
  });
  return Math.max(1, attack);
}

export function getEffectiveDefense(char: Character): number {
  let defense = char.defense;
  char.statusEffects.forEach(effect => {
    if (effect.type === 'defense_up') {
      defense += effect.value;
    }
  });
  return Math.max(0, defense);
}

export function isInRange(source: GridCoord, target: GridCoord, range: number): boolean {
  return getDistance(source, target) <= range;
}

export function findCharactersInRange(
  state: BattleState,
  center: GridCoord,
  range: number,
  team?: 'A' | 'B' | 'all'
): Character[] {
  return state.characters.filter(c => {
    if (!c.position || !c.isAlive) return false;
    if (team !== 'all' && team !== undefined && c.team !== team) return false;
    return isInRange(center, c.position, range);
  });
}

export function calculateDamage(
  attacker: Character,
  defender: Character,
  basePower: number,
  element: ElementType
): number {
  const attack = getEffectiveAttack(attacker);
  const defense = getEffectiveDefense(defender);
  const rawDamage = basePower + attack * 0.5;
  const terrainBonus = getTerrainBonus(defender.position, state => state, element);
  const damage = Math.max(1, Math.floor(rawDamage * terrainBonus - defense * 0.5));
  return damage;
}

export function getTerrainBonus(
  position: GridCoord | null,
  getState: (selector: (s: BattleState) => unknown) => BattleState,
  element: ElementType
): number {
  if (!position) return 1;
  const state = getState(() => {}) as unknown as BattleState;
  const cell = state.grid[position.y]?.[position.x];
  if (!cell) return 1;
  
  if (cell.terrain === 'ruins' && (element === 'fire' || element === 'wind')) {
    return 0.8;
  }
  if (cell.terrain === 'grass' && element === 'fire') {
    return 1.3;
  }
  if (cell.terrain === 'sand' && element === 'water') {
    return 0.9;
  }
  return 1;
}

export function applyDamage(
  target: Character,
  damage: number,
  eventLog: BattleEvent[]
): { target: Character; events: BattleEvent[] } {
  const newHp = Math.max(0, target.currentHp - damage);
  const events = [...eventLog, {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'damage' as const,
    message: `${target.name} 受到 ${damage} 点伤害！剩余生命值：${newHp}/${target.maxHp}`,
    data: { targetId: target.id, damage, newHp },
  }];
  
  if (newHp <= 0) {
    events.push({
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'system' as const,
      message: `💀 ${target.name} 已被击败！`,
      data: { targetId: target.id },
    });
  }
  
  return {
    target: {
      ...target,
      currentHp: newHp,
      isAlive: newHp > 0,
    },
    events,
  };
}

export function applyHeal(
  target: Character,
  amount: number,
  eventLog: BattleEvent[]
): { target: Character; events: BattleEvent[] } {
  const newHp = Math.min(target.maxHp, target.currentHp + amount);
  const actualHeal = newHp - target.currentHp;
  const events = [...eventLog, {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'heal' as const,
    message: `${target.name} 恢复 ${actualHeal} 点生命值！当前生命值：${newHp}/${target.maxHp}`,
    data: { targetId: target.id, heal: actualHeal, newHp },
  }];
  
  return {
    target: { ...target, currentHp: newHp },
    events,
  };
}

export function addStatusEffect(
  target: Character,
  effect: Omit<StatusEffect, 'id'>
): Character {
  return {
    ...target,
    statusEffects: [...target.statusEffects, { ...effect, id: uuidv4() }],
  };
}

export function processStatusEffects(
  character: Character,
  eventLog: BattleEvent[]
): { character: Character; events: BattleEvent[]; floatingTexts: FloatingText[] } {
  let events = [...eventLog];
  let char = { ...character };
  const floatingTexts: FloatingText[] = [];
  
  const activeEffects: StatusEffect[] = [];
  
  for (const effect of char.statusEffects) {
    if (effect.duration > 0) {
      if (effect.type === 'burn' || effect.type === 'poison') {
        const dotDamage = effect.value;
        const newHp = Math.max(0, char.currentHp - dotDamage);
        
        events.push({
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'damage' as const,
          message: `${char.name} 受到 ${effect.type === 'burn' ? '燃烧' : '中毒'} 效果 ${dotDamage} 点伤害！`,
          data: { targetId: char.id, damage: dotDamage, effectType: effect.type },
        });
        
        if (char.position) {
          floatingTexts.push({
            id: uuidv4(),
            position: char.position,
            value: dotDamage,
            type: 'damage',
            createdAt: Date.now(),
          });
        }
        
        char = {
          ...char,
          currentHp: newHp,
          isAlive: newHp > 0,
        };
        
        if (newHp <= 0) {
          events.push({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'system' as const,
            message: `💀 ${char.name} 被${effect.type === 'burn' ? '燃烧' : '毒素'}吞噬！`,
            data: { targetId: char.id },
          });
        }
      }
      
      const newDuration = effect.duration - 1;
      if (newDuration > 0) {
        activeEffects.push({ ...effect, duration: newDuration });
      } else {
        events.push({
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'status' as const,
          message: `${char.name} 的 ${getEffectName(effect.type)} 效果已消失`,
          data: { targetId: char.id, effectType: effect.type },
        });
      }
    }
  }
  
  char.statusEffects = activeEffects;
  return { character: char, events, floatingTexts };
}

function getEffectName(type: StatusEffect['type']): string {
  const names: Record<StatusEffect['type'], string> = {
    burn: '燃烧',
    paralyze: '麻痹',
    poison: '中毒',
    defense_up: '防御变化',
    attack_up: '攻击变化',
    stun: '眩晕',
  };
  return names[type] || type;
}

export function isCharacterStunned(character: Character): boolean {
  return character.statusEffects.some(e => e.type === 'paralyze' || e.type === 'stun');
}

export function applySkillCooldown(character: Character, skillId: string): Character {
  return {
    ...character,
    skills: character.skills.map(s =>
      s.id === skillId ? { ...s, currentCooldown: s.cooldown } : s
    ),
  };
}

export function decreaseCooldowns(character: Character): Character {
  return {
    ...character,
    skills: character.skills.map(s => ({
      ...s,
      currentCooldown: Math.max(0, s.currentCooldown - 1),
    })),
  };
}

export function regenerateEnergy(character: Character, amount: number = 20): Character {
  return {
    ...character,
    currentEnergy: Math.min(character.maxEnergy, character.currentEnergy + amount),
  };
}

export function createFloatingText(
  position: GridCoord,
  value: number,
  type: FloatingText['type']
): FloatingText {
  return {
    id: uuidv4(),
    position,
    value,
    type,
    createdAt: Date.now(),
  };
}

export function executeSkillEffect(
  source: Character,
  skill: Skill,
  targetPos: GridCoord,
  state: BattleState
): {
  updatedState: BattleState;
  events: BattleEvent[];
  floatingTexts: FloatingText[];
  usedElement: ElementType;
  hitTargets: Character[];
} {
  let events: BattleEvent[] = [];
  let floatingTexts: FloatingText[] = [];
  let characters = [...state.characters];
  const hitTargets: Character[] = [];
  
  events.push({
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'action' as const,
    message: `${source.name} 施放 ${skill.name}！`,
    data: { sourceId: source.id, skillId: skill.id, targetPos },
  });
  
  const getStateWrapper = () => state;
  
  if (skill.effectType === 'damage' || skill.effectType === 'debuff') {
    const target = characters.find(c => c.position?.x === targetPos.x && c.position?.y === targetPos.y && c.isAlive);
    if (target) {
      if (skill.effectType === 'damage') {
        const damage = calculateDamage(source, target, skill.power, skill.element);
        const result = applyDamage(target, damage, events);
        events = result.events;
        characters = characters.map(c => c.id === target.id ? result.target : c);
        hitTargets.push(result.target);
        
        if (target.position) {
          floatingTexts.push(createFloatingText(target.position, damage, 'damage'));
        }
      }
      
      if (skill.effectType === 'debuff') {
        if (skill.name.includes('燃烧') || skill.name.includes('印记')) {
          const burnEffect: Omit<StatusEffect, 'id'> = {
            type: 'burn',
            duration: 3,
            value: skill.power,
            sourceElement: skill.element,
          };
          const updated = addStatusEffect(target, burnEffect);
          characters = characters.map(c => c.id === target.id ? updated : c);
          events.push({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'status' as const,
            message: `${target.name} 陷入燃烧状态！每回合受到 ${skill.power} 点伤害`,
            data: { targetId: target.id, effect: 'burn' },
          });
          hitTargets.push(updated);
        } else if (skill.name.includes('冰冻')) {
          const paralyzeEffect: Omit<StatusEffect, 'id'> = {
            type: 'paralyze',
            duration: 1,
            value: 0,
            sourceElement: skill.element,
          };
          const updated = addStatusEffect(target, paralyzeEffect);
          characters = characters.map(c => c.id === target.id ? updated : c);
          events.push({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'status' as const,
            message: `${target.name} 被冰冻，无法行动1回合！`,
            data: { targetId: target.id, effect: 'paralyze' },
          });
          hitTargets.push(updated);
        } else if (skill.name.includes('毒雾')) {
          const poisonEffect: Omit<StatusEffect, 'id'> = {
            type: 'poison',
            duration: 3,
            value: skill.power,
            sourceElement: skill.element,
          };
          const aoeTargets = findCharactersInRange({ ...state, characters }, targetPos, skill.aoeRange, 'all')
            .filter(c => c.team !== source.team);
          
          aoeTargets.forEach(t => {
            const updated = addStatusEffect(t, poisonEffect);
            characters = characters.map(c => c.id === t.id ? updated : c);
            hitTargets.push(updated);
            events.push({
              id: uuidv4(),
              timestamp: Date.now(),
              type: 'status' as const,
              message: `${t.name} 中毒！每回合受到 ${skill.power} 点伤害`,
              data: { targetId: t.id, effect: 'poison' },
            });
          });
        }
      }
    }
  } else if (skill.effectType === 'heal' || skill.effectType === 'buff') {
    const target = characters.find(c => c.position?.x === targetPos.x && c.position?.y === targetPos.y && c.isAlive);
    if (target) {
      if (skill.effectType === 'heal') {
        if (skill.name.includes('汲取')) {
          const damage = calculateDamage(source, target, skill.power, skill.element);
          const damageResult = applyDamage(target, damage, events);
          events = damageResult.events;
          const healAmount = damage;
          const healResult = applyHeal(source, healAmount, events);
          events = healResult.events;
          
          characters = characters.map(c => {
            if (c.id === target.id) return damageResult.target;
            if (c.id === source.id) return healResult.target;
            return c;
          });
          
          hitTargets.push(damageResult.target, healResult.target);
          
          if (target.position) {
            floatingTexts.push(createFloatingText(target.position, damage, 'damage'));
          }
          if (source.position) {
            floatingTexts.push(createFloatingText(source.position, healAmount, 'heal'));
          }
        } else {
          const result = applyHeal(target, skill.power, events);
          events = result.events;
          characters = characters.map(c => c.id === target.id ? result.target : c);
          hitTargets.push(result.target);
          
          if (target.position) {
            floatingTexts.push(createFloatingText(target.position, skill.power, 'heal'));
          }
        }
      }
      
      if (skill.effectType === 'buff') {
        if (skill.name.includes('护盾') || skill.name.includes('防御')) {
          const defenseBuff: Omit<StatusEffect, 'id'> = {
            type: 'defense_up',
            duration: skill.name.includes('大地') ? 3 : 2,
            value: skill.power,
            sourceElement: skill.element,
          };
          const updated = addStatusEffect(target, defenseBuff);
          characters = characters.map(c => c.id === target.id ? updated : c);
          events.push({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'status' as const,
            message: `${target.name} 获得防御加成 +${skill.power}！`,
            data: { targetId: target.id, effect: 'defense_up' },
          });
          hitTargets.push(updated);
        } else if (skill.name.includes('疾风') || skill.name.includes('雷神') || skill.name.includes('攻击')) {
          const attackBuff: Omit<StatusEffect, 'id'> = {
            type: 'attack_up',
            duration: skill.name.includes('雷神') ? 1 : 2,
            value: skill.power,
            sourceElement: skill.element,
          };
          const targetChar = skill.targetType === 'self' ? source : target;
          const updated = addStatusEffect(targetChar, attackBuff);
          characters = characters.map(c => c.id === targetChar.id ? updated : c);
          events.push({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'status' as const,
            message: `${targetChar.name} 获得攻击加成 +${skill.power}！`,
            data: { targetId: targetChar.id, effect: 'attack_up' },
          });
          hitTargets.push(updated);
        } else if (skill.name.includes('祝福')) {
          const attackBuff: Omit<StatusEffect, 'id'> = {
            type: 'attack_up',
            duration: 2,
            value: skill.power,
            sourceElement: skill.element,
          };
          const aoeTargets = findCharactersInRange({ ...state, characters }, targetPos, skill.aoeRange, 'all')
            .filter(c => c.team === source.team);
          
          aoeTargets.forEach(t => {
            const updated = addStatusEffect(t, attackBuff);
            characters = characters.map(c => c.id === t.id ? updated : c);
            hitTargets.push(updated);
            events.push({
              id: uuidv4(),
              timestamp: Date.now(),
              type: 'status' as const,
              message: `${t.name} 获得祝福光环，攻击 +${skill.power}！`,
              data: { targetId: t.id, effect: 'attack_up' },
            });
          });
        }
      }
    }
  } else if (skill.effectType === 'aoe_damage') {
    const enemyTeam = source.team === 'A' ? 'B' : 'A';
    const aoeTargets = findCharactersInRange({ ...state, characters }, targetPos, skill.aoeRange, enemyTeam);
    
    aoeTargets.forEach(t => {
      const damage = calculateDamage(source, t, skill.power, skill.element);
      const result = applyDamage(t, damage, events);
      events = result.events;
      characters = characters.map(c => c.id === t.id ? result.target : c);
      hitTargets.push(result.target);
      
      if (t.position) {
        floatingTexts.push(createFloatingText(t.position, damage, 'damage'));
      }
    });
  }
  
  const updatedSource = characters.find(c => c.id === source.id)!;
  const sourceAfterCooldown = applySkillCooldown(updatedSource, skill.id);
  const sourceAfterEnergy = {
    ...sourceAfterCooldown,
    currentEnergy: sourceAfterCooldown.currentEnergy - skill.cost,
  };
  characters = characters.map(c => c.id === source.id ? sourceAfterEnergy : c);
  
  const grid = state.grid.map(row => row.map(cell => {
    const charOnCell = characters.find(c => c.position?.x === cell.coord.x && c.position?.y === cell.coord.y);
    return {
      ...cell,
      characterId: charOnCell?.id || null,
    };
  }));
  
  return {
    updatedState: { ...state, characters, grid },
    events,
    floatingTexts,
    usedElement: skill.element,
    hitTargets,
  };
}
