import type { RequestItem, CreateRequestInput, RequestStatus } from '../backend/types';

const API_BASE = '/api';

export async function fetchRequests(): Promise<RequestItem[]> {
  const response = await fetch(`${API_BASE}/requests`);
  if (!response.ok) {
    throw new Error('获取申购单列表失败');
  }
  return response.json();
}

export async function createRequest(
  data: CreateRequestInput
): Promise<RequestItem> {
  const response = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || '创建申购单失败');
  }
  return response.json();
}

export async function updateStatus(
  id: string,
  status: RequestStatus
): Promise<RequestItem> {
  const response = await fetch(`${API_BASE}/requests/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || '更新状态失败');
  }
  return response.json();
}
