import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types';

const STORAGE_KEY = 'annotation_user';
const COLORS = [
  '#6C63FF', '#A855F7', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
];

export function generateColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function getCurrentUser(): User {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
    }
  }

  const user: User = {
    id: uuidv4(),
    name: `用户${Math.floor(Math.random() * 10000)}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function updateUserName(name: string): User {
  const user = getCurrentUser();
  user.name = name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
