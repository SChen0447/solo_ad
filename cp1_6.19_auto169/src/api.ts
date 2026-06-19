export interface User {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  tags: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
  status: 'available' | 'borrowed' | 'offline';
  ownerId: string;
  tags: string[];
  createdAt: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  bookIds: string[];
  currentBookId: string | null;
  maxMembers: number;
  ownerId: string;
  members: string[];
  pendingMembers: string[];
  tags: string[];
  progress: Record<string, Record<string, boolean>>;
  totalChapters: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Note {
  id: string;
  circleId: string;
  bookId: string;
  userId: string;
  content: string;
  rating: number;
  tags: string[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

export interface Recommendations {
  books: Book[];
  users: User[];
  userTags: string[];
}

const BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  users: {
    list: () => request<User[]>('/users')
  },

  books: {
    list: (params?: { search?: string; category?: string; excludeOffline?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.category) qs.set('category', params.category);
      if (params?.excludeOffline) qs.set('excludeOffline', 'true');
      const url = `/books${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<Book[]>(url);
    },
    get: (id: string) => request<Book>(`/books/${id}`),
    create: (data: Partial<Book> & { ownerId: string; title: string; author: string; category: string }) =>
      request<Book>('/books', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Book>) =>
      request<Book>(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ success: boolean }>(`/books/${id}`, { method: 'DELETE' })
  },

  circles: {
    list: () => request<Circle[]>('/circles'),
    get: (id: string) => request<Circle>(`/circles/${id}`),
    create: (data: Partial<Circle> & { name: string; ownerId: string }) =>
      request<Circle>('/circles', { method: 'POST', body: JSON.stringify(data) }),
    join: (id: string, userId: string) =>
      request<Circle>(`/circles/${id}/join`, { method: 'POST', body: JSON.stringify({ userId }) }),
    approve: (id: string, userId: string, approverId: string) =>
      request<Circle>(`/circles/${id}/approve`, { method: 'POST', body: JSON.stringify({ userId, approverId }) }),
    updateProgress: (id: string, userId: string, chapter: number, completed: boolean) =>
      request<Circle['progress']>(`/circles/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ userId, chapter, completed })
      })
  },

  notes: {
    list: (params?: { circleId?: string; bookId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.circleId) qs.set('circleId', params.circleId);
      if (params?.bookId) qs.set('bookId', params.bookId);
      const url = `/notes${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<Note[]>(url);
    },
    create: (data: Partial<Note> & { circleId: string; bookId: string; userId: string; content: string }) =>
      request<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    like: (id: string, userId: string) =>
      request<{ likes: string[]; liked: boolean }>(`/notes/${id}/like`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      }),
    addComment: (id: string, userId: string, content: string) =>
      request<Note>(`/notes/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ userId, content })
      })
  },

  recommendations: {
    get: (userId: string) => request<Recommendations>(`/recommendations/${userId}`)
  }
};

export default api;
