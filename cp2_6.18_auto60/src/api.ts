export interface Project {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  avatarColor: string;
}

export interface TimeRecord {
  id: string;
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
}

export interface MemberRankingItem {
  member: Member;
  hours: number;
}

export interface TrendDataItem {
  date: string;
  hours: number;
}

export interface DashboardSummary {
  totalProjects: number;
  totalMembers: number;
  projectsChange: number;
  membersChange: number;
  last7Hours: number;
  hoursChange: number;
  trendData: TrendDataItem[];
  memberRanking: MemberRankingItem[];
}

export interface AbnormalRecord {
  date: string;
  hours: number;
  reason: string;
}

export interface MemberProjectInfo {
  id: string;
  name: string;
  totalHours: number;
}

export interface MemberDetail {
  member: Member;
  totalHours: number;
  projects: MemberProjectInfo[];
  dailyRecords: TrendDataItem[];
  abnormalRecords: AbnormalRecord[];
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>('/projects');
}

export function fetchMembers(projectId?: string): Promise<Member[]> {
  const url = projectId ? `/members?projectId=${projectId}` : '/members';
  return request<Member[]>(url);
}

export function fetchTimeRecords(params?: {
  memberId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TimeRecord[]> {
  const searchParams = new URLSearchParams();
  if (params?.memberId) searchParams.append('memberId', params.memberId);
  if (params?.projectId) searchParams.append('projectId', params.projectId);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  
  const queryString = searchParams.toString();
  const url = queryString ? `/records?${queryString}` : '/records';
  return request<TimeRecord[]>(url);
}

export function submitTimeRecord(data: {
  projectId: string;
  memberId: string;
  date: string;
  hours: number;
}): Promise<TimeRecord> {
  return request<TimeRecord>('/records', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function fetchMemberDetail(memberId: string): Promise<MemberDetail> {
  return request<MemberDetail>(`/members/${memberId}/detail`);
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/dashboard/summary');
}
