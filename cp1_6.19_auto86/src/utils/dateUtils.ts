import { format, addDays, isAfter, isBefore, startOfDay, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TimeSlot } from '@/types';

export const getAvailableDates = (): Date[] => {
  const dates: Date[] = [];
  const today = startOfDay(new Date());
  
  for (let i = 1; i <= 7; i++) {
    dates.push(addDays(today, i));
  }
  
  return dates;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
};

export const formatDateDisplay = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年MM月dd日', { locale: zhCN });
};

export const formatDateWithWeekday = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MM月dd日 EEEE', { locale: zhCN });
};

export const getTimeSlotLabel = (slot: TimeSlot): string => {
  const labels = {
    morning: '上午 10:00 - 12:00',
    afternoon: '下午 14:00 - 17:00',
  };
  return labels[slot];
};

export const getTimeSlotStartTime = (slot: TimeSlot): number => {
  return slot === 'morning' ? 10 : 14;
};

export const isDateAvailable = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const checkDate = startOfDay(date);
  const maxDate = addDays(today, 7);
  
  return isAfter(checkDate, today) && isBefore(checkDate, maxDate);
};

export const getHoursUntilPickup = (pickupDate: string, timeSlot: TimeSlot): number => {
  const date = parseISO(pickupDate);
  const startHour = getTimeSlotStartTime(timeSlot);
  date.setHours(startHour, 0, 0, 0);
  
  const now = new Date();
  return Math.max(0, differenceInHours(date, now));
};

export const getMinutesUntilPickup = (pickupDate: string, timeSlot: TimeSlot): number => {
  const date = parseISO(pickupDate);
  const startHour = getTimeSlotStartTime(timeSlot);
  date.setHours(startHour, 0, 0, 0);
  
  const now = new Date();
  return Math.max(0, differenceInMinutes(date, now));
};

export const isPickupSoon = (pickupDate: string, timeSlot: TimeSlot, minutesThreshold = 30): boolean => {
  const minutesUntil = getMinutesUntilPickup(pickupDate, timeSlot);
  return minutesUntil > 0 && minutesUntil <= minutesThreshold;
};

export const formatCountdown = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.ceil(hours * 60);
    return `${minutes} 分钟`;
  }
  if (hours < 24) {
    return `${Math.floor(hours)} 小时 ${Math.ceil((hours % 1) * 60)} 分钟`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} 天 ${Math.floor(remainingHours)} 小时`;
};

export const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待取书',
    'picked-up': '已取书',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

export const getStockStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'in-stock': '有货',
    'low-stock': '库存紧张',
    'out-of-stock': '缺货',
  };
  return statusMap[status] || status;
};
