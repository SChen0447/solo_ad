import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CharacterAttributes } from '../character/characterStore';

export type JudgeResult = '大成功' | '成功' | '失败' | '大失败';

export interface Skill {
  name: string;
  attrs: [keyof CharacterAttributes, keyof CharacterAttributes];
}

export const SKILLS: Skill[] = [
  { name: '潜行', attrs: ['敏捷', '智力'] },
  { name: '察觉', attrs: ['感知', '智力'] },
  { name: '说服', attrs: ['魅力', '感知'] },
  { name: '威吓', attrs: ['力量', '魅力'] },
  { name: '欺骗', attrs: ['魅力', '智力'] },
  { name: '表演', attrs: ['魅力', '敏捷'] },
  { name: '运动', attrs: ['力量', '体质'] },
  { name: '杂技', attrs: ['敏捷', '力量'] },
  { name: '奥秘', attrs: ['智力', '感知'] },
  { name: '历史', attrs: ['智力', '感知'] },
  { name: '自然', attrs: ['智力', '感知'] },
  { name: '宗教', attrs: ['智力', '感知'] },
  { name: '调查', attrs: ['智力', '感知'] },
  { name: '洞悉', attrs: ['感知', '魅力'] },
  { name: '医药', attrs: ['感知', '智力'] },
  { name: '驯兽', attrs: ['感知', '魅力'] },
  { name: '求生', attrs: ['感知', '体质'] },
  { name: '手艺', attrs: ['智力', '敏捷'] },
  { name: '巧手', attrs: ['敏捷', '智力'] },
  { name: '攀爬', attrs: ['力量', '敏捷'] },
];

export function calcSkillBonus(
  skill: Skill,
  attrs: CharacterAttributes
): number {
  const mod1 = Math.floor((attrs[skill.attrs[0]] - 10) / 2);
  const mod2 = Math.floor((attrs[skill.attrs[1]] - 10) / 2);
  return mod1 + mod2;
}

export interface JudgeLog {
  id: string;
  timestamp: number;
  skillName: string;
  dc: number;
  rollResult: number;
  bonus: number;
  total: number;
  result: JudgeResult;
}

interface JudgeState {
  logs: JudgeLog[];
  addLog: (log: Omit<JudgeLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  importLogs: (logs: JudgeLog[]) => void;
}

export const useJudgeStore = create<JudgeState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) => {
        const newLog: JudgeLog = {
          ...log,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({ logs: [newLog, ...state.logs] }));
      },
      clearLogs: () => set({ logs: [] }),
      importLogs: (logs) =>
        set((state) => ({ logs: [...logs, ...state.logs] })),
    }),
    { name: 'dice-soul-codex-judge' }
  )
);
