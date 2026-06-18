import { v4 as uuidv4 } from 'uuid';
import type { Character, Skill, ElementType } from '../types';

interface SkillTemplate {
  name: string;
  element: ElementType;
  cost: number;
  cooldown: number;
  range: number;
  aoeRange: number;
  effectType: 'damage' | 'heal' | 'buff' | 'debuff' | 'aoe_damage';
  power: number;
  description: string;
  targetType: 'enemy' | 'ally' | 'self' | 'position';
}

interface CharacterTemplate {
  name: string;
  avatar: string;
  maxHp: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  skills: SkillTemplate[];
}

const skillTemplates: Record<string, SkillTemplate[]> = {
  fireMage: [
    { name: '火球术', element: 'fire', cost: 20, cooldown: 0, range: 4, aoeRange: 0, effectType: 'damage', power: 30, description: '发射一颗火球造成30点火焰伤害', targetType: 'enemy' },
    { name: '烈焰风暴', element: 'fire', cost: 40, cooldown: 2, range: 3, aoeRange: 1, effectType: 'aoe_damage', power: 25, description: '召唤烈焰风暴，对目标周围1格造成25点AOE火焰伤害', targetType: 'position' },
    { name: '燃烧印记', element: 'fire', cost: 25, cooldown: 1, range: 5, aoeRange: 0, effectType: 'debuff', power: 8, description: '施加燃烧状态，每回合造成8点伤害持续3回合', targetType: 'enemy' },
  ],
  waterMage: [
    { name: '水箭', element: 'water', cost: 15, cooldown: 0, range: 4, aoeRange: 0, effectType: 'damage', power: 25, description: '发射水箭造成25点水系伤害', targetType: 'enemy' },
    { name: '治愈之泉', element: 'water', cost: 30, cooldown: 2, range: 3, aoeRange: 0, effectType: 'heal', power: 35, description: '治愈目标恢复35点生命值', targetType: 'ally' },
    { name: '冰霜护盾', element: 'water', cost: 25, cooldown: 1, range: 2, aoeRange: 0, effectType: 'buff', power: 10, description: '为目标施加冰霜护盾，增加10点防御持续2回合', targetType: 'ally' },
  ],
  windArcher: [
    { name: '风刃', element: 'wind', cost: 18, cooldown: 0, range: 5, aoeRange: 0, effectType: 'damage', power: 22, description: '发射风刃造成22点风系伤害', targetType: 'enemy' },
    { name: '疾风步', element: 'wind', cost: 20, cooldown: 1, range: 0, aoeRange: 0, effectType: 'buff', power: 15, description: '增加自身15点攻击持续2回合', targetType: 'self' },
    { name: '龙卷风', element: 'wind', cost: 45, cooldown: 3, range: 4, aoeRange: 2, effectType: 'aoe_damage', power: 18, description: '召唤龙卷风，对目标周围2格造成18点AOE风系伤害', targetType: 'position' },
  ],
  thunderWarrior: [
    { name: '雷击', element: 'thunder', cost: 22, cooldown: 0, range: 3, aoeRange: 0, effectType: 'damage', power: 28, description: '召唤雷电攻击敌人造成28点雷系伤害', targetType: 'enemy' },
    { name: '连锁闪电', element: 'thunder', cost: 35, cooldown: 2, range: 4, aoeRange: 1, effectType: 'aoe_damage', power: 20, description: '释放连锁闪电，对目标周围1格造成20点AOE雷系伤害', targetType: 'enemy' },
    { name: '雷神之力', element: 'thunder', cost: 30, cooldown: 1, range: 0, aoeRange: 0, effectType: 'buff', power: 20, description: '获得雷神之力，增加20点攻击持续1回合', targetType: 'self' },
  ],
  earthKnight: [
    { name: '岩石冲击', element: 'earth', cost: 20, cooldown: 0, range: 2, aoeRange: 0, effectType: 'damage', power: 32, description: '召唤岩石冲击敌人造成32点土系伤害', targetType: 'enemy' },
    { name: '大地护盾', element: 'earth', cost: 28, cooldown: 2, range: 1, aoeRange: 0, effectType: 'buff', power: 15, description: '召唤大地护盾，增加15点防御持续3回合', targetType: 'ally' },
    { name: '地震', element: 'earth', cost: 50, cooldown: 3, range: 3, aoeRange: 2, effectType: 'aoe_damage', power: 22, description: '引发地震，对目标周围2格造成22点AOE土系伤害', targetType: 'position' },
  ],
  lightPriest: [
    { name: '圣光术', element: 'light', cost: 15, cooldown: 0, range: 4, aoeRange: 0, effectType: 'damage', power: 20, description: '发射圣光造成20点光系伤害', targetType: 'enemy' },
    { name: '神圣治愈', element: 'light', cost: 35, cooldown: 1, range: 4, aoeRange: 0, effectType: 'heal', power: 45, description: '神圣之力治愈目标恢复45点生命值', targetType: 'ally' },
    { name: '祝福光环', element: 'light', cost: 30, cooldown: 2, range: 2, aoeRange: 1, effectType: 'buff', power: 10, description: '施加祝福光环，增加周围友军10点攻击持续2回合', targetType: 'position' },
  ],
  darkAssassin: [
    { name: '暗影突袭', element: 'dark', cost: 20, cooldown: 0, range: 3, aoeRange: 0, effectType: 'damage', power: 26, description: '从暗影中突袭造成26点暗系伤害', targetType: 'enemy' },
    { name: '生命汲取', element: 'dark', cost: 30, cooldown: 1, range: 4, aoeRange: 0, effectType: 'damage', power: 22, description: '汲取目标生命造成22点伤害并恢复等量生命', targetType: 'enemy' },
    { name: '毒雾', element: 'dark', cost: 35, cooldown: 2, range: 3, aoeRange: 1, effectType: 'debuff', power: 10, description: '释放毒雾，使目标周围1格中毒每回合10点伤害持续3回合', targetType: 'position' },
  ],
  iceMage: [
    { name: '冰锥', element: 'water', cost: 18, cooldown: 0, range: 4, aoeRange: 0, effectType: 'damage', power: 24, description: '发射冰锥造成24点水系伤害', targetType: 'enemy' },
    { name: '暴风雪', element: 'water', cost: 40, cooldown: 2, range: 4, aoeRange: 2, effectType: 'aoe_damage', power: 16, description: '召唤暴风雪，对目标周围2格造成16点AOE水系伤害', targetType: 'position' },
    { name: '冰冻', element: 'water', cost: 28, cooldown: 1, range: 3, aoeRange: 0, effectType: 'debuff', power: 0, description: '冰冻目标使其麻痹1回合无法行动', targetType: 'enemy' },
  ],
};

const characterTemplates: CharacterTemplate[] = [
  { name: '炎术士', avatar: '🔥', maxHp: 80, maxEnergy: 100, attack: 25, defense: 10, skills: skillTemplates.fireMage },
  { name: '水法师', avatar: '💧', maxHp: 85, maxEnergy: 100, attack: 20, defense: 12, skills: skillTemplates.waterMage },
  { name: '风射手', avatar: '🌪️', maxHp: 75, maxEnergy: 100, attack: 28, defense: 8, skills: skillTemplates.windArcher },
  { name: '雷战士', avatar: '⚡', maxHp: 100, maxEnergy: 100, attack: 30, defense: 15, skills: skillTemplates.thunderWarrior },
  { name: '土骑士', avatar: '🪨', maxHp: 120, maxEnergy: 100, attack: 22, defense: 20, skills: skillTemplates.earthKnight },
  { name: '光祭司', avatar: '✨', maxHp: 70, maxEnergy: 100, attack: 18, defense: 10, skills: skillTemplates.lightPriest },
  { name: '暗刺客', avatar: '🌑', maxHp: 65, maxEnergy: 100, attack: 32, defense: 8, skills: skillTemplates.darkAssassin },
  { name: '冰法师', avatar: '❄️', maxHp: 78, maxEnergy: 100, attack: 22, defense: 11, skills: skillTemplates.iceMage },
];

function createSkill(template: SkillTemplate): Skill {
  return {
    id: uuidv4(),
    name: template.name,
    element: template.element,
    cost: template.cost,
    cooldown: template.cooldown,
    currentCooldown: 0,
    range: template.range,
    aoeRange: template.aoeRange,
    effectType: template.effectType,
    power: template.power,
    description: template.description,
    targetType: template.targetType,
  };
}

function createCharacter(template: CharacterTemplate, team: 'A' | 'B'): Character {
  return {
    id: uuidv4(),
    name: template.name,
    team,
    avatar: template.avatar,
    maxHp: template.maxHp,
    currentHp: template.maxHp,
    maxEnergy: template.maxEnergy,
    currentEnergy: template.maxEnergy,
    attack: template.attack,
    defense: template.defense,
    position: null,
    skills: template.skills.map(createSkill),
    statusEffects: [],
    isAlive: true,
  };
}

export function createTeamA(): Character[] {
  return characterTemplates.slice(0, 5).map(t => createCharacter(t, 'A'));
}

export function createTeamB(): Character[] {
  return characterTemplates.slice(3, 8).map(t => createCharacter(t, 'B'));
}

export function getAllCharacterTemplates(): CharacterTemplate[] {
  return characterTemplates;
}

export function createCharacterById(templateIndex: number, team: 'A' | 'B'): Character {
  const template = characterTemplates[templateIndex % characterTemplates.length];
  return createCharacter(template, team);
}
