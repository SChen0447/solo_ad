export interface User {
  id: number;
  email: string;
}

export interface TimeSession {
  start: string;
  end: string | null;
}

export interface Task {
  id: number;
  name: string;
  estimated_duration: number;
  material_link: string | null;
  material_content: string | null;
  is_completed: boolean;
  is_reviewed: boolean;
  completed_at: string | null;
  total_time_spent: number;
  time_sessions: TimeSession[];
  created_at: string;
  reviewed_at: string | null;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  time_slots: string[];
  total_days: number;
  completed_tasks: number;
  total_tasks: number;
  tasks?: Task[];
  created_at: string;
}

export interface Reminder {
  id: number;
  task_id: number;
  task_name: string;
  due_date: string;
  is_read: boolean;
  review_stage: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'LOADING'; payload: boolean }
  | { type: 'AUTH_ERROR' };

export interface WeeklyDataPoint {
  day: string;
  minutes: number;
}

export interface PlanStat {
  name: string;
  completed: number;
  total: number;
}

export interface StatsData {
  weekly_data: WeeklyDataPoint[];
  plan_stats: PlanStat[];
  total_learning_days: number;
  streak_days: number;
}

export interface GanttDataPoint {
  date: string;
  hours: number;
  taskName: string;
}
