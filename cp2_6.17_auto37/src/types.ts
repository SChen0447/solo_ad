export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string;
  status: TaskStatus;
  order: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  assignee?: string;
  status?: TaskStatus;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignee?: string;
  status?: TaskStatus;
  order?: number;
}
