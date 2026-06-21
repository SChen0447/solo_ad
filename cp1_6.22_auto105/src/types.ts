export interface User {
  id: string;
  nickname: string;
  avatar: string;
  integral: number;
  creditLevel: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  image: string;
  ownerId: string;
  ownerNickname: string;
  pricePerDay: number;
  status: 'available' | 'reserved' | 'lent';
  createdAt: string;
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskUrgency = 'normal' | 'urgent' | 'very-urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  creatorId: string;
  creatorNickname: string;
  createdAt: string;
  deadline: string;
  status: TaskStatus;
  urgency: TaskUrgency;
  acceptedBy: string[];
  maxAccepts: number;
}

export type RecordType = 'income' | 'expense';

export interface IntegralRecord {
  id: string;
  userId: string;
  type: RecordType;
  amount: number;
  description: string;
  counterpartId: string;
  counterpartNickname: string;
  counterpartAvatar: string;
  createdAt: string;
}

export interface ToolReservation {
  toolId: string;
  startDate: string;
  duration: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  createdAt: string;
}

export const INTEGRAL_RULES = {
  MAX_INTEGRAL: 1000,
  TOOL_LENDING_FEE_RATIO: 0.8,
  TASK_COMPLETION_BONUS: 5,
  NEW_USER_BONUS: 100,
} as const;

export const URGENCY_COLORS: Record<TaskUrgency, string> = {
  'normal': '#ebf8ff',
  'urgent': '#ffeddb',
  'very-urgent': '#fee2e2',
} as const;
