export type TaskType = '浇水' | '施肥' | '除草' | '采摘';
export type TaskUrgency = '普通' | '紧急' | '非常紧急';
export type TaskStatus = '待认领' | '进行中' | '已完成';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  deadline: string;
  urgency: TaskUrgency;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  completedAt?: string;
}

export type TimePeriod = '上午' | '下午' | '全天';

export interface ToolReservation {
  id: string;
  date: string;
  period: TimePeriod;
  memberId: string;
  memberName: string;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  total: number;
  available: number;
  currentBorrower?: string;
  returnTime?: string;
  reservations: ToolReservation[];
}

export interface Member {
  id: string;
  name: string;
  points: number;
  tasksCompleted: number;
  toolsReturnedOnTime: number;
}

export interface Harvest {
  id: string;
  memberId: string;
  memberName: string;
  productName: string;
  weightG: number;
  quantity: number;
  recordedAt: string;
}

export interface WeeklyHarvest {
  weekLabel: string;
  startDate: string;
  totalWeightG: number;
  totalQuantity: number;
}

export interface CurrentUser {
  id: string;
  name: string;
}
