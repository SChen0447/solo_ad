export type Emotion = 'happy' | 'sad' | 'anxious' | 'calm' | 'excited';

export interface Record {
  id: string;
  text: string;
  timestamp: string;
  emotion: Emotion;
  isStarred: boolean;
}

export interface DailyEmotionData {
  date: string;
  happy: number;
  sad: number;
  anxious: number;
  calm: number;
  excited: number;
}

export interface WordFrequency {
  word: string;
  count: number;
}

export interface WeeklyReport {
  dailyData: DailyEmotionData[];
  wordFrequency: WordFrequency[];
}

const BASE_URL = 'http://localhost:3001';

export async function fetchRecords(): Promise<Record[]> {
  const res = await fetch(`${BASE_URL}/api/records`);
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
}

export async function createRecord(text: string, emotion?: Emotion): Promise<Record> {
  const res = await fetch(`${BASE_URL}/api/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, emotion }),
  });
  if (!res.ok) throw new Error('Failed to create record');
  return res.json();
}

export async function updateRecord(
  id: string,
  data: { text?: string; emotion?: Emotion }
): Promise<Record> {
  const res = await fetch(`${BASE_URL}/api/records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update record');
  return res.json();
}

export async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/records/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete record');
}

export async function toggleStar(id: string): Promise<Record> {
  const res = await fetch(`${BASE_URL}/api/records/${id}/star`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to toggle star');
  return res.json();
}

export async function fetchWeeklyReport(): Promise<WeeklyReport> {
  const res = await fetch(`${BASE_URL}/api/report/weekly`);
  if (!res.ok) throw new Error('Failed to fetch weekly report');
  return res.json();
}
