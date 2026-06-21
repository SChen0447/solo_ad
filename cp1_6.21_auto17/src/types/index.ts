export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export interface Task {
  id: string;
  name: string;
  description: string;
  assignee: string;
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
  startDay: number;
}

export interface Dependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
}

export interface TaskScheduleInfo {
  taskId: string;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  floatTime: number;
  isCritical: boolean;
}

export interface GraphAnalysisResult {
  scheduleInfo: Map<string, TaskScheduleInfo>;
  criticalPath: string[];
  projectDuration: number;
  hasCycle: boolean;
  cyclePath: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  color: string;
}
