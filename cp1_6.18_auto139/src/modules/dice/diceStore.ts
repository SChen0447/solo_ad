import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiceConfig, DiceResult } from './DiceRoller';

export interface DiceRecord {
  id: string;
  timestamp: number;
  config: DiceConfig;
  result: DiceResult;
  isJudge: boolean;
}

interface DiceState {
  history: DiceRecord[];
  addRecord: (record: Omit<DiceRecord, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  getStats: () => {
    totalRolls: number;
    average: number;
    distribution: Record<number, number>;
  };
  importRecords: (records: DiceRecord[]) => void;
}

export const useDiceStore = create<DiceState>()(
  persist(
    (set, get) => ({
      history: [],
      addRecord: (record) => {
        const newRecord: DiceRecord = {
          ...record,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({
          history: [newRecord, ...state.history].slice(0, 100),
        }));
      },
      clearHistory: () => set({ history: [] }),
      getStats: () => {
        const { history } = get();
        const totalRolls = history.length;
        const average =
          totalRolls > 0
            ? Math.round(
                (history.reduce((s, r) => s + r.result.total, 0) / totalRolls) *
                  100
              ) / 100
            : 0;
        const distribution: Record<number, number> = {};
        for (let i = 1; i <= 20; i++) distribution[i] = 0;
        history.forEach((r) => {
          r.result.rolls.forEach((v) => {
            if (v >= 1 && v <= 20) distribution[v] = (distribution[v] || 0) + 1;
          });
        });
        return { totalRolls, average, distribution };
      },
      importRecords: (records) =>
        set((state) => ({
          history: [...records, ...state.history].slice(0, 100),
        })),
    }),
    { name: 'dice-soul-codex-dice' }
  )
);
