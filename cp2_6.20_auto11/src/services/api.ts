import type { Animal, AdoptionApplication, Announcement, AdoptFormData } from '@/types'

const API_BASE = '/api'

export async function fetchAnimals(): Promise<Animal[]> {
  const res = await fetch(`${API_BASE}/animals`)
  if (!res.ok) throw new Error('获取动物列表失败')
  return res.json()
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(`${API_BASE}/announcements`)
  if (!res.ok) throw new Error('获取公告失败')
  return res.json()
}

export async function fetchAdoptions(): Promise<AdoptionApplication[]> {
  const res = await fetch(`${API_BASE}/adoptions`)
  if (!res.ok) throw new Error('获取领养申请失败')
  return res.json()
}

export async function submitAdoption(
  animalId: string,
  data: AdoptFormData
): Promise<{ message: string; application: AdoptionApplication }> {
  const res = await fetch(`${API_BASE}/adopt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animalId, ...data })
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || '提交申请失败')
  return result
}

export async function updateAdoptionStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<{ message: string; application: AdoptionApplication }> {
  const res = await fetch(`${API_BASE}/adopt/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || '更新申请状态失败')
  return result
}
