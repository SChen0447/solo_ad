import { create } from 'zustand';
import axios from 'axios';
import type {
  CombatUnit,
  LogEntry,
  BattleStats,
  SimulateRequest,
  SimulateResponse,
  Skill,
} from '../types';
import {
  createDefaultCharacter,
  createDefaultMonster,
  createDefaultSkill,
  generateId,
} from '../types';

interface GameState {
  characters: CombatUnit[];
  monsters: CombatUnit[];
  selectedCharacterIds: string[];
  selectedMonsterIds: string[];
  isSimulating: boolean;
  currentRound: number;
  battleLogs: LogEntry[];
  battleStats: BattleStats | null;
  winner: 'characters' | 'monsters' | 'draw' | null;
  totalRounds: number;
  logFilter: string;
  jumpToRound: number | null;
  simulationError: string | null;

  addCharacter: () => void;
  addMonster: () => void;
  removeCharacter: (id: string) => void;
  removeMonster: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<CombatUnit>) => void;
  updateMonster: (id: string, updates: Partial<CombatUnit>) => void;
  toggleCharacterSelection: (id: string) => void;
  toggleMonsterSelection: (id: string) => void;
  updateCharacterSkill: (charId: string, skillId: string, updates: Partial<Skill>) => void;
  updateMonsterSkill: (monId: string, skillId: string, updates: Partial<Skill>) => void;
  addCharacterSkill: (charId: string) => void;
  addMonsterSkill: (monId: string) => void;
  removeCharacterSkill: (charId: string, skillId: string) => void;
  removeMonsterSkill: (monId: string, skillId: string) => void;

  startSimulation: () => Promise<void>;
  resetSimulation: () => void;
  setLogFilter: (filter: string) => void;
  setJumpToRound: (round: number | null) => void;

  exportReport: () => string;
}

export const useGameStore = create<GameState>((set, get) => ({
  characters: [
    { ...createDefaultCharacter(), id: generateId(), name: '战士', icon: '⚔️' },
    { ...createDefaultCharacter(), id: generateId(), name: '法师', icon: '🧙', attack: 200, defense: 60, maxHp: 800, currentHp: 800 },
  ],
  monsters: [
    { ...createDefaultMonster(), id: generateId(), name: '哥布林', icon: '👹' },
    { ...createDefaultMonster(), id: generateId(), name: '骷髅兵', icon: '💀', maxHp: 600, currentHp: 600 },
  ],
  selectedCharacterIds: [],
  selectedMonsterIds: [],
  isSimulating: false,
  currentRound: 0,
  battleLogs: [],
  battleStats: null,
  winner: null,
  totalRounds: 0,
  logFilter: 'all',
  jumpToRound: null,
  simulationError: null,

  addCharacter: () =>
    set((state) => ({
      characters: [...state.characters, createDefaultCharacter()],
    })),

  addMonster: () =>
    set((state) => ({
      monsters: [...state.monsters, createDefaultMonster()],
    })),

  removeCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
      selectedCharacterIds: state.selectedCharacterIds.filter((cid) => cid !== id),
    })),

  removeMonster: (id) =>
    set((state) => ({
      monsters: state.monsters.filter((m) => m.id !== id),
      selectedMonsterIds: state.selectedMonsterIds.filter((mid) => mid !== id),
    })),

  updateCharacter: (id, updates) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, ...updates, currentHp: updates.maxHp ?? c.currentHp } : c
      ),
    })),

  updateMonster: (id, updates) =>
    set((state) => ({
      monsters: state.monsters.map((m) =>
        m.id === id ? { ...m, ...updates, currentHp: updates.maxHp ?? m.currentHp } : m
      ),
    })),

  toggleCharacterSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedCharacterIds.includes(id);
      if (isSelected) {
        return {
          selectedCharacterIds: state.selectedCharacterIds.filter((cid) => cid !== id),
        };
      }
      if (state.selectedCharacterIds.length >= 4) {
        return state;
      }
      return {
        selectedCharacterIds: [...state.selectedCharacterIds, id],
      };
    }),

  toggleMonsterSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedMonsterIds.includes(id);
      if (isSelected) {
        return {
          selectedMonsterIds: state.selectedMonsterIds.filter((mid) => mid !== id),
        };
      }
      if (state.selectedMonsterIds.length >= 4) {
        return state;
      }
      return {
        selectedMonsterIds: [...state.selectedMonsterIds, id],
      };
    }),

  updateCharacterSkill: (charId, skillId, updates) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === charId
          ? {
              ...c,
              skills: c.skills.map((s) => (s.id === skillId ? { ...s, ...updates } : s)),
            }
          : c
      ),
    })),

  updateMonsterSkill: (monId, skillId, updates) =>
    set((state) => ({
      monsters: state.monsters.map((m) =>
        m.id === monId
          ? {
              ...m,
              skills: m.skills.map((s) => (s.id === skillId ? { ...s, ...updates } : s)),
            }
          : m
      ),
    })),

  addCharacterSkill: (charId) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === charId && c.skills.length < 3
          ? { ...c, skills: [...c.skills, createDefaultSkill(c.skills.length)] }
          : c
      ),
    })),

  addMonsterSkill: (monId) =>
    set((state) => ({
      monsters: state.monsters.map((m) =>
        m.id === monId && m.skills.length < 3
          ? { ...m, skills: [...m.skills, createDefaultSkill(m.skills.length)] }
          : m
      ),
    })),

  removeCharacterSkill: (charId, skillId) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === charId
          ? { ...c, skills: c.skills.filter((s) => s.id !== skillId) }
          : c
      ),
    })),

  removeMonsterSkill: (monId, skillId) =>
    set((state) => ({
      monsters: state.monsters.map((m) =>
        m.id === monId
          ? { ...m, skills: m.skills.filter((s) => s.id !== skillId) }
          : m
      ),
    })),

  startSimulation: async () => {
    const state = get();
    const selectedChars = state.characters.filter((c) =>
      state.selectedCharacterIds.includes(c.id)
    );
    const selectedMons = state.monsters.filter((m) =>
      state.selectedMonsterIds.includes(m.id)
    );

    if (selectedChars.length === 0 || selectedMons.length === 0) {
      set({ simulationError: '请至少选择一个角色和一个怪物' });
      return;
    }

    set({
      isSimulating: true,
      currentRound: 0,
      battleLogs: [],
      battleStats: null,
      winner: null,
      totalRounds: 0,
      simulationError: null,
    });

    try {
      const requestData: SimulateRequest = {
        characters: selectedChars,
        monsters: selectedMons,
        maxRounds: 100,
      };

      const response = await axios.post<SimulateResponse>('/api/simulate', requestData);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || '模拟失败');
      }

      const totalRounds = data.totalRounds;
      const logsPerBatch = Math.ceil(data.logs.length / Math.min(totalRounds, 10));
      let displayedLogs = 0;

      for (let round = 1; round <= totalRounds; round++) {
        const roundLogs = data.logs.filter((l) => l.round <= round);
        displayedLogs = roundLogs.length;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            set({
              currentRound: round,
              battleLogs: roundLogs,
            });
            resolve();
          });
        });

        if (displayedLogs >= data.logs.length) {
          await new Promise((r) => setTimeout(r, 100));
          break;
        }

        if (round % 10 === 0 || round === totalRounds) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      set({
        isSimulating: false,
        battleLogs: data.logs,
        battleStats: data.stats,
        winner: data.winner,
        totalRounds: data.totalRounds,
        currentRound: data.totalRounds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误';
      set({
        isSimulating: false,
        simulationError: message,
      });
    }
  },

  resetSimulation: () =>
    set({
      isSimulating: false,
      currentRound: 0,
      battleLogs: [],
      battleStats: null,
      winner: null,
      totalRounds: 0,
      logFilter: 'all',
      jumpToRound: null,
      simulationError: null,
    }),

  setLogFilter: (filter) => set({ logFilter: filter }),
  setJumpToRound: (round) => set({ jumpToRound: round }),

  exportReport: () => {
    const state = get();
    const report = {
      exportedAt: new Date().toISOString(),
      winner: state.winner,
      totalRounds: state.totalRounds,
      characters: state.characters.filter((c) => state.selectedCharacterIds.includes(c.id)),
      monsters: state.monsters.filter((m) => state.selectedMonsterIds.includes(m.id)),
      stats: state.battleStats,
      logs: state.battleLogs,
    };
    return JSON.stringify(report, null, 2);
  },
}));
