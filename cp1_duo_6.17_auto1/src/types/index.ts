export interface BaseStats {
  maxHp: number
  attack: number
  defense: number
  agility: number
  critRate: number
}

export type EquipmentSlotType = 'weapon' | 'armor' | 'ring' | 'boots'

export type SubStatType = 'critDamage' | 'dodgeRate' | 'lifeSteal' | 'cooldownReduction'

export interface SubStat {
  type: SubStatType
  value: number
}

export interface Equipment {
  id: string
  name: string
  slot: EquipmentSlotType
  icon: string
  baseStats: Partial<BaseStats>
  subStats: SubStat[]
}

export interface EquipmentTemplate {
  id: string
  name: string
  slot: EquipmentSlotType
  icon: string
  baseStats: Partial<BaseStats>
}

export type SkillType = 'active' | 'passive'
export type SkillEffectType = 'damage' | 'heal' | 'shield' | 'buff' | 'debuff'

export interface SkillEffect {
  type: SkillEffectType
  value: number
  duration?: number
  damageMultiplier?: number
  flatDamage?: number
  healPercent?: number
  flatHeal?: number
  shieldPercent?: number
  shieldFlat?: number
}

export interface Skill {
  id: string
  name: string
  icon: string
  type: SkillType
  cooldown: number
  description: string
  effects: SkillEffect[]
}

export interface CharacterState {
  id: string
  name: string
  baseStats: BaseStats
  equipment: Record<EquipmentSlotType, Equipment | null>
  activeSkills: (Skill | null)[]
  passiveSkill: Skill | null
}

export interface CombatCharacter {
  id: string
  name: string
  maxHp: number
  currentHp: number
  attack: number
  defense: number
  agility: number
  critRate: number
  critDamage: number
  dodgeRate: number
  lifeSteal: number
  cooldownReduction: number
  shield: number
  shieldDuration: number
  skillCooldowns: Record<string, number>
  activeSkills: Skill[]
  passiveSkill: Skill | null
  totalDamage: number
  totalHealing: number
  critHits: number
  dodges: number
  skillUsage: Record<string, number>
  isShaking: boolean
}

export interface BattleLogEntry {
  turn: number
  attacker: string
  defender: string
  skill: string
  damage?: number
  healing?: number
  isCrit: boolean
  isDodge: boolean
  shieldAbsorbed?: number
  timestamp: number
}

export interface BattleResult {
  winnerId: string | null
  totalTurns: number
  characters: {
    id: string
    name: string
    finalHp: number
    maxHp: number
    totalDamage: number
    totalHealing: number
    critHits: number
    dodges: number
    skillUsage: Record<string, number>
    comboCount: number
  }[]
  logs: BattleLogEntry[]
  grade: string
  score: number
}

export interface DamageNumber {
  id: string
  value: number
  x: number
  y: number
  isCrit: boolean
  isHeal: boolean
  createdAt: number
}

export interface BattleTurn {
  turn: number
  logs: BattleLogEntry[]
  characterStates: CombatCharacter[]
}
