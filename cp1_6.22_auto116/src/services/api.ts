export interface Holiday {
  id: string;
  name: string;
  date: string;
  country: string;
  countryFlag: string;
  description: string;
}

export interface Activity {
  id: string;
  holidayId: string;
  date: string;
  title: string;
  note: string;
  likes: number;
  liked: boolean;
  comments: string[];
  createdAt: number;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(errorData.error || '请求失败');
  }

  return response.json();
}

export const api = {
  getHolidays: (): Promise<Holiday[]> => {
    return request<Holiday[]>('/holidays');
  },

  getActivities: (): Promise<Activity[]> => {
    return request<Activity[]>('/activities');
  },

  createActivity: (data: {
    holidayId?: string;
    date: string;
    title: string;
    note?: string;
  }): Promise<Activity> => {
    return request<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteActivity: (id: string): Promise<Activity> => {
    return request<Activity>(`/activities/${id}`, {
      method: 'DELETE'
    });
  },

  likeActivity: (id: string): Promise<Activity> => {
    return request<Activity>(`/activities/${id}/like`, {
      method: 'POST'
    });
  },

  commentActivity: (id: string, comment: string): Promise<Activity> => {
    return request<Activity>(`/activities/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }
};
