export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TeamMember {
  id: string;
  name: string;
  avatarColor: string;
  capacity: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  storyPoints: number;
  sprintId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalStoryPoints: number;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface Workload {
  memberId: string;
  memberName: string;
  avatarColor: string;
  assignedCount: number;
  remainingPoints: number;
  capacity: number;
}

export interface SprintData {
  sprint: Sprint;
  burndown: BurndownPoint[];
  workload: Workload[];
  stats: { doneCount: number; totalCount: number };
}

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiService = {
  getTasks: (): Promise<Task[]> => request<Task[]>('/tasks'),

  createTask: (
    data: Partial<Pick<Task, 'title' | 'description' | 'assigneeId' | 'priority' | 'storyPoints'>>
  ): Promise<Task> =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Task> =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateTaskStatus: (id: string, status: TaskStatus): Promise<Task> =>
    request<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteTask: (id: string): Promise<Task> =>
    request<Task>(`/tasks/${id}`, { method: 'DELETE' }),

  getMembers: (): Promise<TeamMember[]> => request<TeamMember[]>('/members'),

  getSprintData: (): Promise<SprintData> => request<SprintData>('/sprint'),
};
