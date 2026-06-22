/**
 * apiClient - 统一 API 请求封装层
 *
 * 职责：作为前端视图层与后端 API 之间的统一通信层，
 *       封装所有 HTTP 请求逻辑，提供类型安全的接口给各业务模块调用。
 *
 * 调用链路 & 数据流向：
 *   视图层组件 (PlaylistManager / VotePanel / EquipmentGrid)
 *     ↓ 调用
 *   apiClient.{module}.{method}()
 *     ↓ 内部调用
 *   request<T>() 通用请求函数
 *     ↓ 发起
 *   fetch() → 后端 Express API (server/index.ts)
 *     ↓ 返回
 *   Promise<json> 数据
 *     ↓ 传递回
 *   调用方组件 → 更新 state → 重新渲染 UI
 *
 * 模块划分：
 *   - playlist: 曲目管理相关接口
 *   - vote: 投票相关接口
 *   - equipment: 设备库存相关接口
 *
 * 被调用方：各业务模块组件
 * 调用方依赖：浏览器 fetch API、后端 REST 接口
 */

export interface Track {
  id: string;
  name: string;
  artist: string;
  duration: string;
  note: string;
  order: number;
}

export interface VoteResult {
  trackId: string;
  trackName: string;
  count: number;
  percentage: number;
}

export interface VoteSession {
  id: string;
  title: string;
  candidates: { trackId: string; trackName: string }[];
  results: VoteResult[];
  totalVotes: number;
  active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  total: number;
  available: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const apiClient = {
  playlist: {
    getAll: () => request<Track[]>('/api/playlist'),
    add: (data: Omit<Track, 'id' | 'order'>) =>
      request<Track[]>('/api/playlist', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<Track[]>(`/api/playlist/${id}`, { method: 'DELETE' }),
    reorder: (orderedIds: string[]) =>
      request<Track[]>('/api/playlist/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  },
  vote: {
    getCurrent: () => request<VoteSession | null>('/api/vote/current'),
    start: (title: string, candidateIds: string[]) =>
      request<VoteSession>('/api/vote/start', { method: 'POST', body: JSON.stringify({ title, candidateIds }) }),
    cast: (voterId: string, trackId: string) =>
      request<VoteSession>('/api/vote/cast', { method: 'POST', body: JSON.stringify({ voterId, trackId }) }),
    end: () =>
      request<VoteSession>('/api/vote/end', { method: 'POST' }),
  },
  equipment: {
    getAll: () => request<Equipment[]>('/api/equipment'),
    borrow: (id: string) =>
      request<Equipment[]>(`/api/equipment/${id}/borrow`, { method: 'POST' }),
    returnItem: (id: string) =>
      request<Equipment[]>(`/api/equipment/${id}/return`, { method: 'POST' }),
  },
};
