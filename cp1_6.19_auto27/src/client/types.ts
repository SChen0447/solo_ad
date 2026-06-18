export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface TaskHistoryEntry {
  status: TaskStatus;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  assignee: string;
  estimatedHours: number;
  createdAt: string;
  history: TaskHistoryEntry[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  members: string[];
  taskCount: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  members: string[];
  tasks: Task[];
  createdAt: string;
}

export interface WorkloadItem {
  member: string;
  taskCount: number;
  remainingHours: number;
  dailyLimit: number;
  isOverloaded: boolean;
}

export interface HealthMetrics {
  onTimeCompletionRate: number;
  avgTurnaroundHours: number;
  blockedTaskRate: number;
  workloads: WorkloadItem[];
  overloadedMembers: string[];
}

export interface SearchResult {
  type: 'project' | 'task';
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
}
