import { v4 as uuidv4 } from 'uuid';
import type { Member } from '../../types';

const members: Member[] = [];

const memberNames = [
  '张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄丽',
  '周涛', '吴敏', '徐强', '孙红', '胡军', '朱琳', '高峰', '林涛',
  '郭敏', '何平', '罗晶', '梁晨'
];

function initMembers() {
  if (members.length > 0) return;
  memberNames.forEach((name) => {
    members.push({
      id: uuidv4(),
      name,
      points: Math.floor(Math.random() * 150) + 10,
      tasksCompleted: Math.floor(Math.random() * 20),
      toolsReturnedOnTime: Math.floor(Math.random() * 10),
    });
  });
}

initMembers();

export function getMemberIds(): string[] {
  return members.map((m) => m.id);
}

export function getMemberNames(): string[] {
  return members.map((m) => m.name);
}

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
