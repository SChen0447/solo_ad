import { v4 as uuidv4 } from 'uuid';
import type { Harvest, WeeklyHarvest } from '../../types';
import { addPoints } from './memberService';

const harvests: Harvest[] = [];

const products = ['西红柿', '生菜', '黄瓜', '茄子', '辣椒', '豆角', '南瓜', '萝卜'];

export function initHarvests(memberIds: string[], memberNames: string[]) {
  if (harvests.length > 0) return;
  if (memberIds.length === 0) return;
  const now = Date.now();
  const MS_PER_DAY = 24 * 3600 * 1000;
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const weekStartMs = now - (weekOffset + 1) * 7 * MS_PER_DAY;
    const countPerWeek = 6 + Math.floor(Math.random() * 4);
    for (let j = 0; j < countPerWeek; j++) {
      const idx = Math.floor(Math.random() * memberIds.length);
      const dayOffset = Math.floor(Math.random() * 7);
      harvests.push({
        id: uuidv4(),
        memberId: memberIds[idx],
        memberName: memberNames[idx],
        productName: products[Math.floor(Math.random() * products.length)],
        weightG: Math.floor(Math.random() * 800) + 100,
        quantity: Math.floor(Math.random() * 10) + 1,
        recordedAt: new Date(weekStartMs + dayOffset * MS_PER_DAY).toISOString(),
      });
    }
  }
}

export function addHarvest(data: Omit<Harvest, 'id' | 'recordedAt'>): Harvest {
  const harvest: Harvest = {
    ...data,
    id: uuidv4(),
    recordedAt: new Date().toISOString(),
  };
  harvests.push(harvest);
  const pointsEarned = Math.floor(harvest.weightG / 100);
  addPoints(harvest.memberId, pointsEarned);
  return harvest;
}

export function getHarvests(): Harvest[] {
  return [...harvests];
}

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeeklyHarvests(): WeeklyHarvest[] {
  const weeks: WeeklyHarvest[] = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(getWeekStart(now));
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const filtered = harvests.filter((h) => {
      const hd = new Date(h.recordedAt);
      return hd >= weekStart && hd < weekEnd;
    });
    const totalWeightG = filtered.reduce((s, h) => s + h.weightG, 0);
    const totalQuantity = filtered.reduce((s, h) => s + h.quantity, 0);
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}周`;
    weeks.push({
      weekLabel: label,
      startDate: weekStart.toISOString().slice(0, 10),
      totalWeightG,
      totalQuantity,
    });
  }
  return weeks;
}
