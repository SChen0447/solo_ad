export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  avatarColor: string;
  projectIds: string[];
}

export interface TimeRecord {
  id: string;
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
  createdAt: string;
}

export interface DailyStats {
  date: string;
  hours: number;
}

export interface AnomalyRecord {
  date: string;
  hours: number;
  reason: string;
}

export interface MemberDetail {
  member: Member;
  last30Days: DailyStats[];
  anomalies: AnomalyRecord[];
}

export interface DashboardStats {
  totalProjects: number;
  totalMembers: number;
  last7DaysHours: number;
  totalProjectsChange: number;
  totalMembersChange: number;
  last7DaysHoursChange: number;
}

export interface MemberRanking {
  member: Member;
  weeklyHours: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (!result.success || !result.data) {
    throw new Error(result.error || '请求失败');
  }
  return result.data;
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects');
}

export function fetchMembers(projectId?: string): Promise<Member[]> {
  const url = projectId ? `/api/members?projectId=${projectId}` : '/api/members';
  return request<Member[]>(url);
}

export function fetchTimeRecords(
  memberId?: string,
  dateRange?: string
): Promise<TimeRecord[]> {
  const params = new URLSearchParams();
  if (memberId) params.append('memberId', memberId);
  if (dateRange) params.append('dateRange', dateRange);
  const url = params.toString() ? `/api/records?${params.toString()}` : '/api/records';
  return request<TimeRecord[]>(url);
}

export function submitTimeRecord(data: {
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
}): Promise<TimeRecord> {
  return request<TimeRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchMemberDetail(id: string): Promise<MemberDetail> {
  return request<MemberDetail>(`/api/members/${id}/detail`);
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/dashboard/stats');
}

export function fetchDashboardRanking(): Promise<MemberRanking[]> {
  return request<MemberRanking[]>('/api/dashboard/ranking');
}

export function fetchDashboardTrend(): Promise<DailyStats[]> {
  return request<DailyStats[]>('/api/dashboard/trend');
}
