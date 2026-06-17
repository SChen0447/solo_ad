import { create } from 'zustand'
import {
  BaseStats,
  BattleResult,
  BattleTurn,
  CharacterState,
  Equipment,
  EquipmentSlotType,
  Skill
} from '../types'
import { skillPool } from '../data/skillPool'

export type AppView = 'edit' | 'battle' | 'result'
export type CharId = 'character1' | 'character2'

interface AppState {
  view: AppView
  character1: CharacterState
  character2: CharacterState
  battleTurns: BattleTurn[]
  battleResult: BattleResult | null
  setView: (view: AppView) => void
  updateCharacterBaseStats: (charId: CharId, stats: Partial<BaseStats>) => void
  equipItem: (charId: CharId, slot: EquipmentSlotType, equipment: Equipment) => void
  unequipItem: (charId: CharId, slot: EquipmentSlotType) => void
  setActiveSkill: (charId: CharId, index: number, skill: Skill | null) => void
  setPassiveSkill: (charId: CharId, skill: Skill | null) => void
  setBattleData: (turns: BattleTurn[], result: BattleResult) => void
  resetBattle: () => void
}

const createDefaultCharacter = (id: string, name: string): CharacterState => ({
  id,
  name,
  baseStats: {
    maxHp: 1500,
    attack: 100,
    defense: 50,
    agility: 50,
    critRate: 15
  },
  equipment: {
    weapon: null,
    armor: null,
    ring: null,
    boots: null
  },
  activeSkills: [skillPool[0], skillPool[3], null],
  passiveSkill: skillPool[10]
})

export const useAppStore = create<AppState>((set) => ({
  view: 'edit',
  character1: createDefaultCharacter('char1', '角色A'),
  character2: createDefaultCharacter('char2', '角色B'),
  battleTurns: [],
  battleResult: null,

  setView: (view) => set({ view }),

  updateCharacterBaseStats: (charId, stats) =>
    set((state) => {
      const char = state[charId]
      return {
        [charId]: {
          ...char,
          baseStats: {
            ...char.baseStats,
            ...stats
          }
        }
      }
    }),

  equipItem: (charId, slot, equipment) =>
    set((state) => {
      const char = state[charId]
      return {
        [charId]: {
          ...char,
          equipment: {
            ...char.equipment,
            [slot]: equipment
          }
        }
      }
    }),

  unequipItem: (charId, slot) =>
    set((state) => {
      const char = state[charId]
      return {
        [charId]: {
          ...char,
          equipment: {
            ...char.equipment,
            [slot]: null
          }
        }
      }
    }),

  setActiveSkill: (charId, index, skill) =>
    set((state) => {
      const char = state[charId]
      const skills = [...char.activeSkills]
      skills[index] = skill
      return {
        [charId]: {
          ...char,
          activeSkills: skills
        }
      }
    }),

  setPassiveSkill: (charId, skill) =>
    set((state) => {
      const char = state[charId]
      return {
        [charId]: {
          ...char,
          passiveSkill: skill
        }
      }
    }),

  setBattleData: (turns, result) =>
    set({
      battleTurns: turns,
      battleResult: result
    }),

  resetBattle: () =>
    set({
      battleTurns: [],
      battleResult: null,
      view: 'edit'
    })
}))
