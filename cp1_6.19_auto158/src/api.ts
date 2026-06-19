import axios from 'axios';
import type { Okr, Kr } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export async function fetchOkrs(): Promise<Okr[]> {
  const res = await api.get<Okr[]>('/okrs');
  return res.data;
}

export async function createOkr(data: {
  title: string;
  owner: string;
  period: string;
}): Promise<Okr> {
  const res = await api.post<Okr>('/okrs', data);
  return res.data;
}

export async function updateOkr(
  id: string,
  data: { title?: string; owner?: string; period?: string }
): Promise<Okr> {
  const res = await api.put<Okr>(`/okrs/${id}`, data);
  return res.data;
}

export async function addKr(
  okrId: string,
  data: {
    description: string;
    owner: string;
    dueDate: string;
    progress?: number;
  }
): Promise<Kr> {
  const res = await api.post<Kr>(`/okrs/${okrId}/kr`, data);
  return res.data;
}

export async function updateKr(
  krId: string,
  data: {
    description?: string;
    owner?: string;
    dueDate?: string;
    progress?: number;
  }
): Promise<Kr> {
  const res = await api.put<Kr>(`/kr/${krId}`, data);
  return res.data;
}

export async function addCheckin(
  krId: string,
  data: {
    comment: string;
    progress: number;
  }
): Promise<Kr> {
  const res = await api.post<Kr>(`/kr/${krId}/checkin`, data);
  return res.data;
}
