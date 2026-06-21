import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addWeeks,
  isSameWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getRecords } from './storage';

export interface WeekDayData {
  day: string;
  minutes: number;
  rank: number;
}

export interface MonthDayData {
  day: string;
  minutes: number;
  date: string;
}

export function getWeeklyData(referenceDate: Date = new Date()): WeekDayData[] {
  const records = getRecords();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dayMinutes: { day: string; minutes: number }[] = days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'EEEEEE', { locale: zhCN });
    const dayRecords = records.filter((r) => r.date === dateStr);
    const total = dayRecords.reduce((s, r) => s + r.durationMinutes, 0);
    return { day: dayLabel, minutes: total };
  });

  const sorted = [...dayMinutes].sort((a, b) => b.minutes - a.minutes);
  const rankMap = new Map<string, number>();
  sorted.forEach((item, idx) => {
    rankMap.set(item.day, idx + 1);
  });

  return dayMinutes.map((item) => ({
    ...item,
    rank: rankMap.get(item.day)!,
  }));
}

export function getMonthlyData(
  referenceDate: Date = new Date()
): MonthDayData[] {
  const records = getRecords();
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'd');
    const dayRecords = records.filter((r) => r.date === dateStr);
    const total = dayRecords.reduce((s, r) => s + r.durationMinutes, 0);
    return { day: dayLabel, minutes: total, date: dateStr };
  });
}

export function isThisWeekMoreThanLast(): boolean {
  const records = getRecords();
  const now = new Date();

  const thisWeekTotal = records
    .filter((r) => isSameWeek(new Date(r.date), now, { weekStartsOn: 1 }))
    .reduce((s, r) => s + r.durationMinutes, 0);

  const lastWeekTotal = records
    .filter((r) =>
      isSameWeek(new Date(r.date), addWeeks(now, -1), { weekStartsOn: 1 })
    )
    .reduce((s, r) => s + r.durationMinutes, 0);

  return thisWeekTotal > lastWeekTotal && lastWeekTotal > 0;
}
