export type Priority = 'P1' | 'P2' | 'P3';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  subtasks: SubTask[];
  comments: Comment[];
  createdAt: number;
}

export interface FilterState {
  keyword: string;
  priorities: Priority[];
  sortOrder: 'asc' | 'desc' | null;
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  'todo': { label: '待办', color: '#6b7280' },
  'in-progress': { label: '进行中', color: '#4f6ef7' },
  'done': { label: '已完成', color: '#10b981' }
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; bgColor: string }> = {
  P1: { label: 'P1', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  P2: { label: 'P2', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  P3: { label: 'P3', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' }
};

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `逾期${Math.abs(days)}天`;
  if (days === 0) return '今天到期';
  if (days === 1) return '明天到期';
  if (days <= 7) return `${days}天后到期`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calculateSubtaskProgress(subtasks: SubTask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

export function filterAndSortTasks(tasks: Task[], filter: FilterState): Task[] {
  let result = tasks.slice();
  if (filter.keyword.trim()) {
    const kw = filter.keyword.toLowerCase().trim();
    result = result.filter(t =>
      t.title.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw)
    );
  }
  if (filter.priorities.length > 0) {
    result = result.filter(t => filter.priorities.includes(t.priority));
  }
  if (filter.sortOrder) {
    result.sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return filter.sortOrder === 'asc' ? da - db : db - da;
    });
  }
  return result;
}

export function moveTask(
  tasks: Task[],
  taskId: string,
  targetStatus: TaskStatus,
  targetIndex: number
): Task[] {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return tasks;
  const sameStatus = task.status === targetStatus;
  let newTasks = tasks.filter(t => t.id !== taskId);
  const updatedTask: Task = { ...task, status: targetStatus };
  const targetTasks = sameStatus
    ? newTasks.filter(t => t.status === targetStatus)
    : newTasks.filter(t => t.status === targetStatus);
  const clampedIndex = Math.min(Math.max(targetIndex, 0), targetTasks.length);
  const before = newTasks.slice(0, newTasks.indexOf(targetTasks[0]) || 0);
  const afterInsert = newTasks.slice((newTasks.indexOf(targetTasks[0]) || 0) + targetTasks.length);
  const newTargetTasks = [...targetTasks];
  newTargetTasks.splice(clampedIndex, 0, updatedTask);
  return [...before, ...newTargetTasks, ...afterInsert];
}
