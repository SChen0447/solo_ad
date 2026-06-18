import axios from 'axios';
import type {
  Protocol,
  CreateProtocolRequest,
  SignProtocolRequest,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.error || error.message || '请求失败，请稍后重试';
    alert(`请求错误：${message}`);
    return Promise.reject(error);
  }
);

export async function getProtocols(): Promise<Protocol[]> {
  const { data } = await api.get<Protocol[]>('/protocols');
  return data;
}

export async function getProtocolDetail(id: string): Promise<Protocol> {
  const { data } = await api.get<Protocol>(`/protocols/${id}`);
  return data;
}

export async function createProtocol(
  payload: CreateProtocolRequest
): Promise<Protocol> {
  const { data } = await api.post<Protocol>('/protocols', payload);
  return data;
}

export async function signProtocol(
  id: string,
  payload: SignProtocolRequest
): Promise<Protocol> {
  const { data } = await api.post<Protocol>(`/protocols/${id}/sign`, payload);
  return data;
}

export { api };
