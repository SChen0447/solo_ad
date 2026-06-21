import type {
  Gift,
  GiftDetail,
  GiftCategory,
  LogisticsEntry,
  MatchSuggestion,
  Exchange,
  Stats,
} from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function fetchGifts(): Promise<Gift[]> {
  return request<Gift[]>('/gifts');
}

export async function fetchGiftDetail(id: string): Promise<GiftDetail> {
  return request<GiftDetail>(`/gifts/${id}`);
}

export async function createGift(data: {
  name: string;
  photoUrl: string;
  value: number;
  city: string;
  category: GiftCategory;
  owner: string;
}): Promise<Gift> {
  return request<Gift>('/gifts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMatches(): Promise<MatchSuggestion[]> {
  return request<MatchSuggestion[]>('/exchanges/matches');
}

export async function confirmExchange(
  giftAId: string,
  giftBId: string
): Promise<Exchange> {
  return request<Exchange>('/exchanges/confirm', {
    method: 'POST',
    body: JSON.stringify({ giftAId, giftBId }),
  });
}

export async function fetchExchanges(): Promise<Exchange[]> {
  return request<Exchange[]>('/exchanges');
}

export async function addLogistics(data: {
  giftId: string;
  company: string;
  trackingNumber: string;
  statusText: string;
}): Promise<LogisticsEntry> {
  return request<LogisticsEntry>('/logistics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchLogistics(giftId: string): Promise<LogisticsEntry[]> {
  return request<LogisticsEntry[]>(`/logistics/${giftId}`);
}

export async function fetchStats(): Promise<Stats> {
  return request<Stats>('/stats');
}
