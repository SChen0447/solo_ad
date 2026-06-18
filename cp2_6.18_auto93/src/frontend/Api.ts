import { PurchaseRequest, CreateRequestPayload, RequestStatus } from '../backend/types';

const API_BASE = '/api';

export const fetchRequests = async (): Promise<PurchaseRequest[]> => {
  const response = await fetch(`${API_BASE}/requests`);
  if (!response.ok) {
    throw new Error('Failed to fetch requests');
  }
  return response.json();
};

export const createRequest = async (
  payload: CreateRequestPayload
): Promise<PurchaseRequest> => {
  const response = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create request');
  }
  return response.json();
};

export const updateStatus = async (
  id: string,
  status: RequestStatus
): Promise<PurchaseRequest> => {
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
};
