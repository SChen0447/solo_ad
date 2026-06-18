import type { Entry, StatsResult, MoodTrendPoint, EventFrequencyPoint, DateNode } from '@/types';

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function diffDays(a: string, b: string): number {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

export function getMoodColor(level: number | null): string {
  if (level === null) return 'rgba(148, 163, 184, 0.4)';
  const clamped = Math.max(1, Math.min(10, level));
  const t = (clamped - 1) / 9;
  const r = Math.round(59 + (239 - 59) * t);
  const g = Math.round(130 + (68 - 130) * t);
  const b = Math.round(246 + (68 - 246) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getMoodLabel(level: number | null): string {
  if (level === null) return '未记录';
  if (level <= 2) return '非常低落';
  if (level <= 4) return '有点沮丧';
  if (level <= 5) return '平静';
  if (level <= 7) return '还不错';
  if (level <= 9) return '很开心';
  return '超棒！';
}

export function generateDateRange(startDate: string, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    result.push(addDays(startDate, i));
  }
  return result;
}

export function computeStats(entries: Entry[], dateNodes: Record<string, DateNode>, days: number = 30): StatsResult {
  const today = formatDate(new Date());
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(addDays(today, -i));
  }

  const moodTrend: MoodTrendPoint[] = dates.map(date => {
    const node = dateNodes[date];
    return { date, mood: node?.mood ?? null };
  });

  const eventFrequency: EventFrequencyPoint[] = dates.map(date => {
    const node = dateNodes[date];
    return { date, count: node?.entryCount ?? 0 };
  });

  const validMoods = moodTrend.filter(p => p.mood !== null).map(p => p.mood as number);
  const moodAverage = validMoods.length > 0
    ? validMoods.reduce((a, b) => a + b, 0) / validMoods.length
    : null;

  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const node = dateNodes[dates[i]];
    if (node && (node.mood !== null || node.entryCount > 0)) {
      streak++;
    } else {
      break;
    }
  }

  const totalEntries = entries.length;

  return { moodAverage, moodTrend, eventFrequency, totalEntries, streak };
}

export function sortEntriesByTimeDesc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const ta = `${a.date} ${a.time}`;
    const tb = `${b.date} ${b.time}`;
    return tb.localeCompare(ta);
  });
}
