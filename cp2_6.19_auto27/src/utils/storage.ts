import type { MoodRecord } from '../types';

const STORAGE_KEY = 'mood_records';

export function loadRecords(): MoodRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: MoodRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records:', e);
  }
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }
  return dates;
}

export function getDominantMood(records: MoodRecord[]): MoodRecord['mood'] | null {
  if (records.length === 0) return null;
  const moodCount: Record<string, number> = {};
  records.forEach(r => {
    moodCount[r.mood] = (moodCount[r.mood] || 0) + 1;
  });
  let maxMood = records[0].mood;
  let maxCount = 0;
  Object.entries(moodCount).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxMood = mood as MoodRecord['mood'];
    }
  });
  return maxMood;
}

export function getAverageMoodValue(records: MoodRecord[], moodConfigs: Record<string, { value: number }>): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + moodConfigs[r.mood].value, 0);
  return sum / records.length;
}
