export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Member {
  id: string;
  name: string;
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

export interface DashboardStats {
  totalProjects: number;
  totalMembers: number;
  last7DaysHours: number;
  changePercent: number;
}

export interface RankingItem {
  memberId: string;
  name: string;
  weeklyHours: number;
}

export interface TrendPoint {
  date: string;
  totalHours: number;
}

export interface AnomalyItem {
  date: string;
  hours: number;
  reason: string;
}

export interface MemberDetail {
  member: Member;
  dailyRecords: { date: string; hours: number }[];
  anomalies: AnomalyItem[];
}

export interface DailyTotal {
  memberId: string;
  date: string;
  total: number;
}

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>(`${BASE}/projects`);
}

export function fetchMembers(projectId?: string): Promise<Member[]> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return request<Member[]>(`${BASE}/members${qs}`);
}

export function fetchTimeRecords(params?: {
  memberId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TimeRecord[]> {
  const parts: string[] = [];
  if (params?.memberId) parts.push(`memberId=${encodeURIComponent(params.memberId)}`);
  if (params?.projectId) parts.push(`projectId=${encodeURIComponent(params.projectId)}`);
  if (params?.startDate) parts.push(`startDate=${encodeURIComponent(params.startDate)}`);
  if (params?.endDate) parts.push(`endDate=${encodeURIComponent(params.endDate)}`);
  const qs = parts.length ? `?${parts.join('&')}` : '';
  return request<TimeRecord[]>(`${BASE}/records${qs}`);
}

export function submitTimeRecord(data: {
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
}): Promise<TimeRecord> {
  return request<TimeRecord>(`${BASE}/records`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchMemberDetail(id: string): Promise<MemberDetail> {
  return request<MemberDetail>(`${BASE}/members/${encodeURIComponent(id)}/detail`);
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>(`${BASE}/dashboard/stats`);
}

export function fetchDashboardRanking(): Promise<RankingItem[]> {
  return request<RankingItem[]>(`${BASE}/dashboard/ranking`);
}

export function fetchDashboardTrend(): Promise<TrendPoint[]> {
  return request<TrendPoint[]>(`${BASE}/dashboard/trend`);
}

export function fetchMemberDailyTotal(
  memberId: string,
  date: string
): Promise<DailyTotal> {
  return request<DailyTotal>(
    `${BASE}/members/${encodeURIComponent(memberId)}/daily-total?date=${encodeURIComponent(date)}`
  );
}
