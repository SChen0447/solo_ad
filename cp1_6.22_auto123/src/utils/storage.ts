import type { HistoryRecord } from '@/types';

const HISTORY_KEY = 'workplace_health_history';

export const loadHistory = (): HistoryRecord[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    console.error('Failed to load history from localStorage');
  }
  return generateMockHistory();
};

export const saveHistory = (history: HistoryRecord[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    console.error('Failed to save history to localStorage');
  }
};

export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const incrementTodaySession = (history: HistoryRecord[]): HistoryRecord[] => {
  const today = getTodayDateString();
  const existingIndex = history.findIndex((h) => h.date === today);

  if (existingIndex >= 0) {
    const updated = [...history];
    updated[existingIndex] = {
      ...updated[existingIndex],
      completedSessions: updated[existingIndex].completedSessions + 1,
    };
    return updated;
  } else {
    return [...history, { date: today, completedSessions: 1 }];
  }
};

export const getLast7DaysHistory = (history: HistoryRecord[]): HistoryRecord[] => {
  const result: HistoryRecord[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const record = history.find((h) => h.date === dateStr);
    result.push({
      date: dateStr,
      completedSessions: record?.completedSessions || 0,
    });
  }

  return result;
};

const generateMockHistory = (): HistoryRecord[] => {
  const result: HistoryRecord[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      completedSessions: Math.floor(Math.random() * 6) + 1,
    });
  }

  return result;
};
