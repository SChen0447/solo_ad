import type { PurchaseRequest, CreateRequestDto, UpdateStatusDto } from '../backend/types';

const API_BASE = '/api';

export async function fetchRequests(): Promise<PurchaseRequest[]> {
  const response = await fetch(`${API_BASE}/requests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch requests');
  }
  return response.json();
}

export async function createRequest(data: CreateRequestDto): Promise<PurchaseRequest> {
  const response = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create request');
  }
  return response.json();
}

export async function updateStatus(
  id: string,
  status: UpdateStatusDto['status']
): Promise<PurchaseRequest> {
  const response = await fetch(`${API_BASE}/requests/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update status');
  }
  return response.json();
}
