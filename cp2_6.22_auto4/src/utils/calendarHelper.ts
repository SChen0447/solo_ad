import type { DiaryEntry } from '../App';

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEntry: boolean;
  moodColor?: string;
  dateKey: string;
}

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

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function generateCalendarGrid(
  year: number,
  month: number,
  entries: DiaryEntry[]
): CalendarDay[][] {
  const today = new Date();
  const entryMap = new Map<string, DiaryEntry>();
  entries.forEach(e => entryMap.set(e.date, e));

  const firstDay = new Date(year, month, 1);
  const startWeekDay = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startWeekDay);

  const rows: CalendarDay[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: CalendarDay[] = [];
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + idx);
      const key = formatDate(d);
      const entry = entryMap.get(key);
      week.push({
        date: d,
        dayOfWeek: d.getDay(),
        isCurrentMonth: d.getMonth() === month,
        isToday: isSameDay(d, today),
        hasEntry: !!entry,
        moodColor: entry?.moodColor,
        dateKey: key,
      });
    }
    rows.push(week);
  }
  return rows;
}

export function getLast7Days(baseDate: Date = new Date()): Date[] {
  const result: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    result.push(d);
  }
  return result;
}

export function getMonthName(month: number): string {
  const names = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return names[month] || '';
}

export function getWeekDayName(day: number): string {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return names[day] || '';
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let newYear = year;
  let newMonth = month + delta;
  while (newMonth < 0) {
    newMonth += 12;
    newYear--;
  }
  while (newMonth > 11) {
    newMonth -= 12;
    newYear++;
  }
  return { year: newYear, month: newMonth };
}
