export interface Project {
  id: string
  name: string
  members: string[]
}

export interface Member {
  id: string
  name: string
}

export interface TimeRecord {
  id: string
  projectId: string
  memberId: string
  date: string
  hours: number
}

export interface DashboardStats {
  totalProjects: number
  totalMembers: number
  last7DaysHours: number
  projectChange: number
  memberChange: number
  weekChange: number
}

export interface TopMember {
  member: Member
  hours: number
}

export interface DailyTrendItem {
  date: string
  total: number
}

export interface DashboardData {
  stats: DashboardStats
  topMembers: TopMember[]
  dailyTrend: DailyTrendItem[]
}

export interface DailyRecord {
  date: string
  hours: number
}

export interface AbnormalRecord {
  date: string
  hours: number
  reason: string
}

export interface MemberDetail {
  member: Member
  dailyRecords: DailyRecord[]
  abnormalRecords: AbnormalRecord[]
  weeklyHours: number[]
  projects: Project[]
}

const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>('/projects')
}

export function fetchMembers(projectId?: string): Promise<Member[]> {
  const url = projectId ? `/members?projectId=${projectId}` : '/members'
  return request<Member[]>(url)
}

export function fetchTimeRecords(params?: {
  memberId?: string
  projectId?: string
  dateRange?: string
}): Promise<TimeRecord[]> {
  const queryParams = new URLSearchParams()
  if (params?.memberId) queryParams.set('memberId', params.memberId)
  if (params?.projectId) queryParams.set('projectId', params.projectId)
  if (params?.dateRange) queryParams.set('dateRange', params.dateRange)

  const queryString = queryParams.toString()
  const url = queryString ? `/records?${queryString}` : '/records'
  return request<TimeRecord[]>(url)
}

export function submitTimeRecord(data: {
  projectId: string
  memberId: string
  date: string
  hours: number
}): Promise<TimeRecord> {
  return request<TimeRecord>('/records', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchMemberDetail(id: string): Promise<MemberDetail> {
  return request<MemberDetail>(`/members/${id}/detail`)
}

export function fetchDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard')
}
