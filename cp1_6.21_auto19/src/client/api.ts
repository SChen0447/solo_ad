const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function setToken(token: string): void {
  localStorage.setItem('token', token);
}

function removeToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getToken,
  setToken,
  removeToken,

  auth: {
    register: (username: string, password: string) =>
      request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    login: (username: string, password: string) =>
      request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<any>('/auth/me'),
  },

  recipes: {
    list: (params: {
      page?: number;
      limit?: number;
      sort?: string;
      cuisine?: string;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      return request<any>(`/recipes?${searchParams.toString()}`);
    },
    get: (id: string) => request<any>(`/recipes/${id}`),
    create: (data: any) =>
      request<any>('/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/recipes/${id}`, {
        method: 'DELETE',
      }),
    myRecipes: () => request<any>('/user/recipes'),
  },

  ratings: {
    get: (recipeId: string) => request<any>(`/recipes/${recipeId}/rating`),
    rate: (recipeId: string, score: number) =>
      request<any>(`/recipes/${recipeId}/rating`, {
        method: 'POST',
        body: JSON.stringify({ score }),
      }),
  },

  favorites: {
    list: () => request<any>('/favorites'),
    toggle: (recipeId: string) =>
      request<any>(`/recipes/${recipeId}/favorite`, {
        method: 'POST',
      }),
    status: (recipeId: string) =>
      request<any>(`/recipes/${recipeId}/favorite/status`),
  },

  history: {
    list: () => request<any>('/user/history'),
    add: (recipeId: string, recipeTitle: string) =>
      request<any>('/user/history', {
        method: 'POST',
        body: JSON.stringify({ recipeId, recipeTitle }),
      }),
  },
};
