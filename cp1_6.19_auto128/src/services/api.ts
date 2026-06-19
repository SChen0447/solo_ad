import type {
  User,
  TravelLocation,
  Journal,
  Photo,
  LoginCredentials,
  RegisterCredentials,
  CreateLocationPayload,
  CreateJournalPayload,
} from '../types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = '请求失败';
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export async function login(credentials: LoginCredentials): Promise<User> {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function register(credentials: RegisterCredentials): Promise<User> {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getLocations(userId: string): Promise<TravelLocation[]> {
  return request<TravelLocation[]>(`/locations?userId=${encodeURIComponent(userId)}`);
}

export async function createLocation(
  payload: CreateLocationPayload
): Promise<TravelLocation> {
  return request<TravelLocation>('/locations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLocation(
  id: string,
  payload: Partial<CreateLocationPayload>
): Promise<TravelLocation> {
  return request<TravelLocation>(`/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLocation(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/locations/${id}`, {
    method: 'DELETE',
  });
}

export async function getJournals(
  userId: string,
  locationId?: string
): Promise<Journal[]> {
  const params = new URLSearchParams({ userId });
  if (locationId) params.set('locationId', locationId);
  return request<Journal[]>(`/journals?${params.toString()}`);
}

export async function getJournal(id: string): Promise<Journal> {
  return request<Journal>(`/journals/${id}`);
}

export async function createJournal(
  payload: CreateJournalPayload
): Promise<Journal> {
  return request<Journal>('/journals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateJournal(
  id: string,
  payload: Partial<CreateJournalPayload>
): Promise<Journal> {
  return request<Journal>(`/journals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteJournal(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/journals/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadPhotos(files: File[]): Promise<Photo[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = '上传失败';
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
