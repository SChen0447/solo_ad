import { CalendarDay } from '../types';
import { DiaryEntry } from '../types';

export function generateCalendarGrid(year: number, month: number, diaries: DiaryEntry[] = []): CalendarDay[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const today = new Date();
  const todayStr = formatDateKey(today);
  
  const diaryMap = new Map<string, DiaryEntry>();
  diaries.forEach(d => diaryMap.set(d.date, d));
  
  const grid: CalendarDay[][] = [];
  let currentDay = 1;
  let prevMonthDay = new Date(year, month, 0).getDate();
  
  for (let row = 0; row < 6; row++) {
    const week: CalendarDay[] = [];
    
    for (let col = 0; col < 7; col++) {
      let date: Date;
      let dayNum: number;
      let isCurrentMonth: boolean;
      
      if (row === 0 && col < startDayOfWeek) {
        dayNum = prevMonthDay - startDayOfWeek + col + 1;
        date = new Date(year, month - 1, dayNum);
        isCurrentMonth = false;
      } else if (currentDay > daysInMonth) {
        dayNum = currentDay - daysInMonth;
        date = new Date(year, month + 1, dayNum);
        isCurrentMonth = false;
        currentDay++;
      } else {
        dayNum = currentDay;
        date = new Date(year, month, dayNum);
        isCurrentMonth = true;
        currentDay++;
      }
      
      const dateStr = formatDateKey(date);
      const diary = diaryMap.get(dateStr);
      
      week.push({
        date,
        day: dayNum,
        isCurrentMonth,
        isToday: dateStr === todayStr,
        hasDiary: !!diary,
        moodColor: diary?.moodColor,
      });
    }
    
    grid.push(week);
  }
  
  return grid;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

export function getRecentDays(days: number): Date[] {
  const result: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(d);
  }
  
  return result;
}

export function getMonthName(month: number): string {
  const names = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return names[month];
}
