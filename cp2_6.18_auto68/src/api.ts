export interface Project {
  id: string
  name: string
}

export interface Member {
  id: string
  name: string
  projectId: string
}

export interface TimeRecord {
  id: string
  memberId: string
  projectId: string
  date: string
  hours: number
}

export interface DashboardSummary {
  totalProjects: number
  totalMembers: number
  last7DaysHours: number
  projectChange: number
  memberChange: number
  hoursChange: number
}

export interface MemberRanking {
  memberId: string
  memberName: string
  weekHours: number
}

export interface DailyTrend {
  date: string
  totalHours: number
}

export interface AnomalyRecord {
  date: string
  hours: number
  reason: string
}

export interface MemberDetail {
  member: Member
  records: TimeRecord[]
  anomalies: AnomalyRecord[]
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects')
}

export function fetchMembers(projectId?: string): Promise<Member[]> {
  const params = projectId ? `?projectId=${projectId}` : ''
  return request<Member[]>(`/api/members${params}`)
}

export function fetchTimeRecords(memberId?: string, dateRange?: string): Promise<TimeRecord[]> {
  const params = new URLSearchParams()
  if (memberId) params.set('memberId', memberId)
  if (dateRange) params.set('dateRange', dateRange)
  const qs = params.toString()
  return request<TimeRecord[]>(`/api/records${qs ? '?' + qs : ''}`)
}

export function submitTimeRecord(data: {
  memberId: string
  projectId: string
  date: string
  hours: number
}): Promise<TimeRecord> {
  return request<TimeRecord>('/api/records', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchMemberDetail(id: string): Promise<MemberDetail> {
  return request<MemberDetail>(`/api/members/${id}/detail`)
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>('/api/dashboard/summary')
}

export function fetchDashboardRankings(): Promise<MemberRanking[]> {
  return request<MemberRanking[]>('/api/dashboard/rankings')
}

export function fetchDashboardTrend(): Promise<DailyTrend[]> {
  return request<DailyTrend[]>('/api/dashboard/trend')
}
