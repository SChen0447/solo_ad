export interface ArchiveFile {
  id: string
  fileName: string
  fileSize: number
  fileType: 'pdf' | 'jpg' | 'png' | 'svg' | 'txt'
  uploadTime: string
  tags: string[]
  notes: string
  importance: number
  dataUrl?: string
}

export interface FileStats {
  total: number
  todayCount: number
  typeDistribution: Record<string, number>
}

export interface SearchParams {
  fileTypes?: string[]
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  importance?: number
}

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function uploadFile(file: File): Promise<ArchiveFile> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/files`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchFiles(): Promise<ArchiveFile[]> {
  return request<ArchiveFile[]>('/files')
}

export async function fetchFile(id: string): Promise<ArchiveFile> {
  return request<ArchiveFile>(`/files/${id}`)
}

export async function updateFile(
  id: string,
  data: { tags?: string[]; notes?: string; importance?: number }
): Promise<ArchiveFile> {
  return request<ArchiveFile>(`/files/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function searchFiles(params: SearchParams): Promise<ArchiveFile[]> {
  return request<ArchiveFile[]>('/files/search', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function fetchStats(): Promise<FileStats> {
  return request<FileStats>('/files/stats')
}
