import { v4 as uuidv4 } from 'uuid';
import type { Member, Harvest, WeeklyHarvest } from '../../types';

const members: Member[] = [];
const harvests: Harvest[] = [];

const memberNames = [
  '张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄丽',
  '周涛', '吴敏', '徐强', '孙红', '胡军', '朱琳', '高峰', '林涛',
  '郭敏', '何平', '罗晶', '梁晨'
];

function initMembers() {
  if (members.length > 0) return;
  memberNames.forEach((name, idx) => {
    members.push({
      id: uuidv4(),
      name,
      points: Math.floor(Math.random() * 150) + 10,
      tasksCompleted: Math.floor(Math.random() * 20),
      toolsReturnedOnTime: Math.floor(Math.random() * 10),
    });
  });
}

function initHarvests() {
  if (harvests.length > 0) return;
  const products = ['西红柿', '生菜', '黄瓜', '茄子', '辣椒', '豆角', '南瓜', '萝卜'];
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const member = members[Math.floor(Math.random() * members.length)];
    const daysAgo = Math.floor(Math.random() * 28);
    harvests.push({
      id: uuidv4(),
      memberId: member.id,
      memberName: member.name,
      productName: products[Math.floor(Math.random() * products.length)],
      weightG: Math.floor(Math.random() * 800) + 100,
      quantity: Math.floor(Math.random() * 10) + 1,
      recordedAt: new Date(now - daysAgo * 24 * 3600 * 1000).toISOString(),
    });
  }
}

initMembers();
initHarvests();

export function getMembers(): Member[] {
  return [...members];
}

export function getMemberById(id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function getRankings(): Member[] {
  return [...members].sort((a, b) => b.points - a.points);
}

export function addPoints(memberId: string, points: number): void {
  const member = members.find((m) => m.id === memberId);
  if (member) {
    member.points += points;
  }
}

export function incrementTasksCompleted(memberId: string): void {
  const member = members.find((m) => m.id === memberId);
  if (member) {
    member.tasksCompleted += 1;
  }
}

export function incrementToolsReturned(memberId: string): void {
  const member = members.find((m) => m.id === memberId);
  if (member) {
    member.toolsReturnedOnTime += 1;
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
