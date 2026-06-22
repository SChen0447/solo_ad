import type {
  Gift,
  CreateGiftDto,
  MatchSuggestion,
  LogisticsRecord,
  AddLogisticsDto,
  DashboardStats,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export const api = {
  getGifts: (status?: string) =>
    request<Gift[]>(status ? `/gifts?status=${status}` : '/gifts'),

  getGift: (id: string) => request<Gift>(`/gifts/${id}`),

  createGift: (dto: CreateGiftDto) =>
    request<Gift>('/gifts', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getMatches: () => request<MatchSuggestion[]>('/matches'),

  confirmMatch: (matchId: string, gift1Id: string, gift2Id: string) =>
    request<{ success: boolean; gift1: Gift; gift2: Gift }>(
      `/matches/${matchId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ gift1Id, gift2Id }),
      }
    ),

  getLogistics: (giftId: string) =>
    request<LogisticsRecord[]>(`/gifts/${giftId}/logistics`),

  addLogistics: (giftId: string, dto: AddLogisticsDto) =>
    request<LogisticsRecord>(`/gifts/${giftId}/logistics`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getStats: () => request<DashboardStats>('/stats'),
};
