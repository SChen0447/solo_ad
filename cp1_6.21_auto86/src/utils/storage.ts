import { v4 as uuidv4 } from 'uuid';

export interface ReadingRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

const STORAGE_KEY = 'reading-tracker-records';

export function getRecords(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReadingRecord[];
  } catch {
    return [];
  }
}

export function addRecord(
  date: string,
  startTime: string,
  endTime: string
): ReadingRecord | null {
  const durationMinutes = calculateDuration(startTime, endTime);
  if (durationMinutes <= 0) return null;

  const record: ReadingRecord = {
    id: uuidv4(),
    date,
    startTime,
    endTime,
    durationMinutes,
  };

  const records = getRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}

export function getWeeklyStats(): Record<string, number> {
  const records = getRecords();
  const stats: Record<string, number> = {};
  for (const r of records) {
    if (!stats[r.date]) stats[r.date] = 0;
    stats[r.date] += r.durationMinutes;
  }
  return stats;
}

export function getTodayMinutes(): number {
  const today = new Date().toISOString().split('T')[0];
  const records = getRecords();
  return records
    .filter((r) => r.date === today)
    .reduce((sum, r) => sum + r.durationMinutes, 0);
}

export function getTotalDays(): number {
  const records = getRecords();
  const uniqueDates = new Set(records.map((r) => r.date));
  return uniqueDates.size;
}

function calculateDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return endMinutes - startMinutes;
}
