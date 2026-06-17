import type { MoodRecord } from '../types';
import { generateId, getDateKey } from '../types';

const STORAGE_KEY = 'mood-diary-records';
const MAX_RECORDS = 100;

export function getRecords(): MoodRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return generateMockRecords();
    const parsed = JSON.parse(raw) as MoodRecord[];
    if (!Array.isArray(parsed)) return generateMockRecords();
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return generateMockRecords();
  }
}

export function saveRecord(
  mood: MoodRecord['mood'],
  energy: number
): MoodRecord {
  const now = Date.now();
  const record: MoodRecord = {
    id: generateId(),
    mood,
    energy,
    timestamp: now,
    dateKey: getDateKey(new Date(now)),
  };

  const records = getRecords();
  const updated = [record, ...records].slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return record;
}

export function deleteRecord(id: string): MoodRecord[] {
  const records = getRecords();
  const updated = records.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

function generateMockRecords(): MoodRecord[] {
  const records: MoodRecord[] = [];
  const moods: MoodRecord['mood'][] = [
    'happy',
    'calm',
    'excited',
    'grateful',
    'anxious',
    'sad',
    'angry',
    'tired',
  ];
  const now = Date.now();

  for (let i = 0; i < 28; i++) {
    const dayMs = i * 86400000;
    const hourOffset = Math.floor(Math.random() * 12) + 6;
    const ts = now - dayMs + hourOffset * 3600000;
    records.push({
      id: generateId() + i,
      mood: moods[Math.floor(Math.random() * moods.length)],
      energy: Math.floor(Math.random() * 8) + 2,
      timestamp: ts,
      dateKey: getDateKey(new Date(ts)),
    });
  }

  const extraCount = Math.floor(Math.random() * 12) + 3;
  for (let i = 0; i < extraCount; i++) {
    const minutesAgo = Math.floor(Math.random() * 2880) + 1;
    const ts = now - minutesAgo * 60000;
    records.push({
      id: generateId() + 'x' + i,
      mood: moods[Math.floor(Math.random() * moods.length)],
      energy: Math.floor(Math.random() * 9) + 1,
      timestamp: ts,
      dateKey: getDateKey(new Date(ts)),
    });
  }

  const sorted = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  return sorted;
}
