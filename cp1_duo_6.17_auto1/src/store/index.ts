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

interface AppState {
  view: AppView
  character1: CharacterState
  character2: CharacterState
  battleTurns: BattleTurn[]
  battleResult: BattleResult | null
  setView: (view: AppView) => void
  updateCharacterBaseStats: (charId: 'char1' | 'char2', stats: Partial<BaseStats>) => void
  equipItem: (charId: 'char1' | 'char2', slot: EquipmentSlotType, equipment: Equipment) => void
  unequipItem: (charId: 'char1' | 'char2', slot: EquipmentSlotType) => void
  setActiveSkill: (charId: 'char1' | 'char2', index: number, skill: Skill | null) => void
  setPassiveSkill: (charId: 'char1' | 'char2', skill: Skill | null) => void
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
    set((state) => ({
      [charId]: {
        ...state[charId],
        baseStats: {
          ...state[charId].baseStats,
          ...stats
        }
      }
    })),

  equipItem: (charId, slot, equipment) =>
    set((state) => ({
      [charId]: {
        ...state[charId],
        equipment: {
          ...state[charId].equipment,
          [slot]: equipment
        }
      }
    })),

  unequipItem: (charId, slot) =>
    set((state) => ({
      [charId]: {
        ...state[charId],
        equipment: {
          ...state[charId].equipment,
          [slot]: null
        }
      }
    })),

  setActiveSkill: (charId, index, skill) =>
    set((state) => {
      const skills = [...state[charId].activeSkills]
      skills[index] = skill
      return {
        [charId]: {
          ...state[charId],
          activeSkills: skills
        }
      }
    }),

  setPassiveSkill: (charId, skill) =>
    set((state) => ({
      [charId]: {
        ...state[charId],
        passiveSkill: skill
      }
    })),

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
