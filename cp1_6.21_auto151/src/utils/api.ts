const BASE_URL = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export interface User {
  id: string;
  username: string;
}

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  stages: {
    seed: number;
    sprout: number;
    bloom: number;
    harvest: number;
  };
  tasksPerStage: {
    water: number;
    fertilize: number;
    weed: number;
  };
}

export interface Plot {
  id: string;
  row: number;
  col: number;
  status: 'empty' | 'claimed' | 'mature' | 'wilted';
  userId?: string;
  cropId?: string;
  plantedAt?: string;
  currentStage?: string;
  stageProgress?: number;
  missedDays?: number;
  cropName?: string;
  cropEmoji?: string;
  userName?: string;
  seedDays?: number;
  sproutDays?: number;
  bloomDays?: number;
  harvestDays?: number;
  waterPerDay?: number;
  fertilizePerDay?: number;
  weedPerDay?: number;
}

export interface Task {
  id: string;
  plotId: string;
  cropId: string;
  type: 'water' | 'fertilize' | 'weed';
  stage: 'seed' | 'sprout' | 'bloom' | 'harvest';
  scheduledDate: string;
  completed: boolean;
  completedAt?: string;
  cropName?: string;
  cropEmoji?: string;
  row?: number;
  col?: number;
}

export interface InventoryItem {
  id: string;
  userId: string;
  cropId: string;
  quantity: number;
  cropName?: string;
  cropEmoji?: string;
}

export interface ExchangeResponse {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  fromUser: { id: string; username: string };
  toUser: { id: string; username: string };
  offer: { cropId: string; cropName: string; cropEmoji: string; quantity: number };
  request: { cropId: string; cropName: string; cropEmoji: string; quantity: number };
  createdAt?: string;
}

export const api = {
  registerUser: (username: string) =>
    request<User>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  getUser: (id: string) =>
    request<User>(`/users/${id}`),

  getCrops: () =>
    request<Crop[]>('/crops'),

  getPlots: () =>
    request<Plot[]>('/plots'),

  claimPlot: (plotId: string, userId: string, cropId: string) =>
    request<{ plot: Plot; tasks: Task[] }>(`/plots/${plotId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ userId, cropId }),
    }),

  getTasks: (userId: string, date?: string) => {
    const params = new URLSearchParams({ userId });
    if (date) params.set('date', date);
    return request<Task[]>(`/tasks?${params.toString()}`);
  },

  completeTask: (taskId: string) =>
    request<{ task: Task; plot: Plot; newStage?: string; newStatus?: string }>(`/tasks/${taskId}/complete`, {
      method: 'POST',
    }),

  getInventory: (userId: string) =>
    request<InventoryItem[]>(`/inventory?userId=${userId}`),

  harvest: (plotId: string) =>
    request<{ inventory: InventoryItem; harvestQuantity: number }>(`/harvest/${plotId}`, {
      method: 'POST',
    }),

  getMarket: (userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    return request<(InventoryItem & { username: string })[]>(`/exchange/market${params}`);
  },

  requestExchange: (
    fromUserId: string,
    toUserId: string,
    offerCropId: string,
    offerQuantity: number,
    requestCropId: string,
    requestQuantity: number
  ) =>
    request<ExchangeResponse>('/exchange/request', {
      method: 'POST',
      body: JSON.stringify({
        fromUserId,
        toUserId,
        offerCropId,
        offerQuantity,
        requestCropId,
        requestQuantity,
      }),
    }),

  acceptExchange: (exchangeId: string) =>
    request<ExchangeResponse>(`/exchange/${exchangeId}/accept`, {
      method: 'PUT',
    }),

  rejectExchange: (exchangeId: string) =>
    request<ExchangeResponse>(`/exchange/${exchangeId}/reject`, {
      method: 'PUT',
    }),

  getExchanges: (userId: string) =>
    request<ExchangeResponse[]>(`/exchanges?userId=${userId}`),

  getUserPlots: (userId: string) =>
    request<Plot[]>(`/user/plots?userId=${userId}`),
};
