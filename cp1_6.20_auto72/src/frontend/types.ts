export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum GanttViewScale {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: User;
  startDate: string;
  endDate: string;
  dependencies: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  fromTaskId: string;
  toTaskId: string;
}

export interface Notification {
  id: string;
  userId: string;
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ProjectCreateRequest {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface TaskCreateRequest {
  projectId: string;
  name: string;
  description?: string;
  priority: TaskPriority;
  assigneeId?: string;
  startDate: string;
  endDate: string;
}

export interface TaskUpdateRequest {
  status?: TaskStatus;
  priority?: TaskPriority;
  name?: string;
  description?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
}

export interface MemberStats {
  userId: string;
  userName: string;
  taskCount: number;
  completedCount: number;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  progress: number;
  memberStats: MemberStats[];
}
