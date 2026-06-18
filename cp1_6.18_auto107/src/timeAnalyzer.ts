import {
  TimelineEvent,
  EventCategory,
  WeeklyGoal,
  RecommendedEvent,
  DailyStats,
  CATEGORY_LABELS,
} from './timelineStore';

const ALL_CATEGORIES: EventCategory[] = [
  'sleep',
  'work',
  'study',
  'exercise',
  'leisure',
  'other',
];

const PRODUCTIVE_CATEGORIES: EventCategory[] = ['work', 'study', 'exercise'];

export function computeDailyStats(events: TimelineEvent[]): DailyStats[] {
  const byDate = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const arr = byDate.get(e.date) || [];
    arr.push(e);
    byDate.set(e.date, arr);
  }

  const stats: DailyStats[] = [];
  for (const [date, dayEvents] of byDate) {
    const categoryMinutes: Record<EventCategory, number> = {
      sleep: 0,
      work: 0,
      study: 0,
      exercise: 0,
      leisure: 0,
      other: 0,
    };
    let totalProductive = 0;
    for (const e of dayEvents) {
      const mins = e.duration * 60;
      categoryMinutes[e.category] += mins;
      if (PRODUCTIVE_CATEGORIES.includes(e.category)) {
        totalProductive += mins;
      }
    }
    const utilizationPercent = Math.round((totalProductive / 1440) * 100);
    stats.push({ date, categoryMinutes, utilizationPercent });
  }

  stats.sort((a, b) => a.date.localeCompare(b.date));
  return stats;
}

export function filterStatsByRange(
  stats: DailyStats[],
  mode: 'day' | 'week' | 'month',
  referenceDate: string
): DailyStats[] {
  const ref = new Date(referenceDate);
  if (isNaN(ref.getTime())) return stats;

  if (mode === 'day') {
    return stats.filter((s) => s.date === referenceDate);
  }

  if (mode === 'week') {
    const dayOfWeek = ref.getDay();
    const weekStart = new Date(ref);
    weekStart.setDate(ref.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return stats.filter((s) => {
      const d = new Date(s.date);
      return d >= weekStart && d <= weekEnd;
    });
  }

  return stats.filter((s) => {
    const d = new Date(s.date);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  });
}

export function generateRecommendations(
  events: TimelineEvent[],
  goals: WeeklyGoal[],
  referenceDate: string
): RecommendedEvent[] {
  if (goals.length === 0) return [];

  const ref = new Date(referenceDate);
  const dayOfWeek = ref.getDay();
  const weekStart = new Date(ref);
  weekStart.setDate(ref.getDate() - dayOfWeek);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }

  const weekEvents = events.filter((e) => weekDates.includes(e.date));

  const categoryCount: Record<EventCategory, number> = {
    sleep: 0,
    work: 0,
    study: 0,
    exercise: 0,
    leisure: 0,
    other: 0,
  };
  for (const e of weekEvents) {
    categoryCount[e.category]++;
  }

  const recommendations: RecommendedEvent[] = [];

  for (const goal of goals) {
    const remaining = goal.targetCount - categoryCount[goal.category];
    if (remaining <= 0) continue;

    const categoryEvents = weekEvents.filter((e) => e.category === goal.category);
    const avgDuration =
      categoryEvents.length > 0
        ? categoryEvents.reduce((sum, e) => sum + e.duration, 0) / categoryEvents.length
        : goal.category === 'exercise'
          ? 1
          : goal.category === 'study'
            ? 2
            : 1;

    const slotsNeeded = Math.min(remaining, 3);

    for (let s = 0; s < slotsNeeded; s++) {
      const targetDate = weekDates[Math.min(dayOfWeek + s + 1, 6)];
      const dayEvents = weekEvents.filter((e) => e.date === targetDate);
      const busySlots = dayEvents.map((e) => ({
        start: e.startHour,
        end: e.startHour + e.duration,
      }));

      let slotHour = findFreeSlot(busySlots, avgDuration, 7, 22);
      if (slotHour === null) {
        slotHour = findFreeSlot(busySlots, avgDuration, 0, 7);
      }

      if (slotHour !== null) {
        recommendations.push({
          id: `rec-${goal.category}-${s}`,
          title: `${CATEGORY_LABELS[goal.category]}时间`,
          category: goal.category,
          startHour: slotHour,
          duration: avgDuration,
          date: targetDate,
        });
      }
    }
  }

  return recommendations;
}

function findFreeSlot(
  busy: { start: number; end: number }[],
  duration: number,
  rangeStart: number,
  rangeEnd: number
): number | null {
  const sorted = [...busy].sort((a, b) => a.start - b.start);

  let current = rangeStart;
  for (const b of sorted) {
    if (b.start > current && b.start - current >= duration) {
      return current;
    }
    current = Math.max(current, b.end);
  }
  if (rangeEnd - current >= duration) {
    return current;
  }
  return null;
}

export function parseCSVToEvents(csvText: string): TimelineEvent[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const events: TimelineEvent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    events.push({
      id: row.id || `csv-${i}`,
      title: row.title || '导入事件',
      note: row.note || '',
      category: (ALL_CATEGORIES.includes(row.category as EventCategory)
        ? row.category
        : 'other') as EventCategory,
      startHour: parseFloat(row.starthour) || 0,
      duration: parseFloat(row.duration) || 1,
      date: row.date || '2024-01-01',
    });
  }

  return events;
}

export function parseJSONToEvents(jsonText: string): TimelineEvent[] {
  try {
    const data = JSON.parse(jsonText);
    const arr = Array.isArray(data) ? data : data.events || [];
    return arr
      .map((item: Record<string, unknown>, idx: number) => ({
        id: (item.id as string) || `json-${idx}`,
        title: (item.title as string) || '导入事件',
        note: (item.note as string) || '',
        category: ALL_CATEGORIES.includes(item.category as EventCategory)
          ? (item.category as EventCategory)
          : 'other',
        startHour: typeof item.startHour === 'number' ? item.startHour : 0,
        duration: typeof item.duration === 'number' ? item.duration : 1,
        date: (item.date as string) || '2024-01-01',
      }))
      .filter(
        (e: TimelineEvent) =>
          e.startHour >= 0 && e.startHour < 24 && e.duration > 0
      );
  } catch {
    return [];
  }
}

export function exportEventsToJSON(events: TimelineEvent[]): {
  json: string;
  sizeKB: string;
  count: number;
} {
  const json = JSON.stringify(events, null, 2);
  const sizeBytes = new Blob([json]).size;
  const sizeKB = (sizeBytes / 1024).toFixed(1);
  return { json, sizeKB, count: events.length };
}
