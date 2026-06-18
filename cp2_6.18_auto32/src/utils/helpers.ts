export interface Task {
  id: string;
  name: string;
  estimatedHours: number;
  completed: boolean;
  assignee: string;
  color: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  startDate: string;
  tasks: Task[];
}

const SOFT_COLORS = [
  '#fde68a',
  '#a7f3d0',
  '#bfdbfe',
  '#fecaca',
  '#ddd6fe',
  '#fbcfe8',
  '#bae6fd',
  '#fed7aa',
  '#bbf7d0',
  '#c7d2fe',
];

export function generateRandomColor(): string {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export interface WorkHoursStats {
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
}

export function calculateWorkHours(tasks: Task[]): WorkHoursStats {
  const totalHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const completedHours = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const remainingHours = totalHours - completedHours;
  const completionPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  return {
    totalHours,
    completedHours,
    remainingHours,
    completionPercent,
    totalTasks,
    completedTasks,
  };
}

export function getUniqueAssignees(tasks: Task[]): string[] {
  const set = new Set<string>();
  tasks.forEach(t => {
    if (t.assignee && t.assignee.trim()) {
      set.add(t.assignee.trim());
    }
  });
  return Array.from(set);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export function getDateRange(startDate: string, tasks: Task[]): Date[] {
  const totalHours = tasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
  const span = Math.max(7, Math.ceil(totalHours / 8) + 2);
  const dates: Date[] = [];
  for (let i = 0; i < span; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}
