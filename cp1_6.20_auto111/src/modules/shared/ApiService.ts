import axios, { AxiosInstance } from 'axios';
import type { Snippet, Language, Theme } from './editor/types';

class ApiService {
  private client: AxiosInstance;
  private mockSnippets: Snippet[];

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 5000,
    });
    this.mockSnippets = this.initializeMockData();
  }

  private initializeMockData(): Snippet[] {
    const now = Date.now();
    return [
      {
        id: '1',
        title: 'Hello World',
        code: `function greet(name) {\n  console.log('Hello, ' + name + '!');\n}\n\ngreet('World');`,
        language: 'javascript',
        theme: 'vs-dark',
        createdAt: now - 3 * 60 * 1000,
        updatedAt: now - 3 * 60 * 1000,
        author: { id: 'u1', name: 'Alice', avatarColor: '#e74c3c' },
        likes: 5,
        isLiked: false,
        isFavorited: false,
        shortUrl: 'http://codeshare.io/abc123',
      },
      {
        id: '2',
        title: 'Quick Sort Algorithm',
        code: `def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\nprint(quicksort([3, 6, 8, 10, 1, 2, 1]))`,
        language: 'python',
        theme: 'monokai',
        createdAt: now - 30 * 60 * 1000,
        updatedAt: now - 15 * 60 * 1000,
        author: { id: 'u2', name: 'Bob', avatarColor: '#3498db' },
        lastEditor: { id: 'u3', name: 'Charlie', avatarColor: '#2ecc71' },
        likes: 12,
        isLiked: true,
        isFavorited: true,
        shortUrl: 'http://codeshare.io/def456',
      },
      {
        id: '3',
        title: 'Responsive Layout Template',
        code: `<!DOCTYPE html>\n<html>\n<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <style>\n        .container {\n            display: flex;\n            flex-wrap: wrap;\n            gap: 16px;\n            padding: 20px;\n        }\n        .card {\n            flex: 1 1 300px;\n            background: #f0f0f0;\n            padding: 20px;\n            border-radius: 8px;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <div class="card">Card 1</div>\n        <div class="card">Card 2</div>\n        <div class="card">Card 3</div>\n    </div>\n</body>\n</html>`,
        language: 'html',
        theme: 'light',
        createdAt: now - 2 * 60 * 60 * 1000,
        updatedAt: now - 2 * 60 * 60 * 1000,
        author: { id: 'u3', name: 'Charlie', avatarColor: '#2ecc71' },
        likes: 8,
        isLiked: false,
        isFavorited: false,
        shortUrl: 'http://codeshare.io/ghi789',
      },
      {
        id: '4',
        title: 'Generic Utility Functions',
        code: `function identity<T>(arg: T): T {\n  return arg;\n}\n\nfunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\n\ninterface ApiResponse<T> {\n  data: T;\n  status: number;\n  message: string;\n}\n\nfunction fetchData<T>(url: string): Promise<ApiResponse<T>> {\n  return fetch(url).then(res => res.json());\n}`,
        language: 'typescript',
        theme: 'vs-dark',
        createdAt: now - 5 * 60 * 60 * 1000,
        updatedAt: now - 1 * 60 * 60 * 1000,
        author: { id: 'u1', name: 'Alice', avatarColor: '#e74c3c' },
        lastEditor: { id: 'u2', name: 'Bob', avatarColor: '#3498db' },
        likes: 15,
        isLiked: false,
        isFavorited: false,
        shortUrl: 'http://codeshare.io/jkl012',
      },
    ];
  }

  async getSnippets(): Promise<Snippet[]> {
    try {
      const response = await this.client.get<Snippet[]>('/snippets');
      return response.data;
    } catch {
      return this.mockSnippets;
    }
  }

  async getSnippet(id: string): Promise<Snippet | null> {
    try {
      const response = await this.client.get<Snippet>(`/snippets/${id}`);
      return response.data;
    } catch {
      return this.mockSnippets.find(s => s.id === id) || null;
    }
  }

  async createSnippet(data: {
    title: string;
    code: string;
    language: Language;
    theme: Theme;
  }): Promise<Snippet> {
    try {
      const response = await this.client.post<Snippet>('/snippets', data);
      return response.data;
    } catch {
      const now = Date.now();
      const id = Math.random().toString(36).substr(2, 9);
      const newSnippet: Snippet = {
        id,
        title: data.title,
        code: data.code,
        language: data.language,
        theme: data.theme,
        createdAt: now,
        updatedAt: now,
        author: { id: 'current', name: 'You', avatarColor: '#3498db' },
        likes: 0,
        isLiked: false,
        isFavorited: false,
        shortUrl: `http://codeshare.io/${id}`,
      };
      this.mockSnippets.unshift(newSnippet);
      return newSnippet;
    }
  }

  async updateSnippet(id: string, data: Partial<Pick<Snippet, 'code' | 'title' | 'language' | 'theme'>>): Promise<Snippet | null> {
    try {
      const response = await this.client.put<Snippet>(`/snippets/${id}`, data);
      return response.data;
    } catch {
      const idx = this.mockSnippets.findIndex(s => s.id === id);
      if (idx !== -1) {
        this.mockSnippets[idx] = {
          ...this.mockSnippets[idx],
          ...data,
          updatedAt: Date.now(),
        };
        return this.mockSnippets[idx];
      }
      return null;
    }
  }

  async toggleLike(id: string): Promise<{ likes: number; isLiked: boolean } | null> {
    try {
      const response = await this.client.post<{ likes: number; isLiked: boolean }>(`/snippets/${id}/like`);
      return response.data;
    } catch {
      const snippet = this.mockSnippets.find(s => s.id === id);
      if (snippet) {
        snippet.isLiked = !snippet.isLiked;
        snippet.likes += snippet.isLiked ? 1 : -1;
        return { likes: snippet.likes, isLiked: snippet.isLiked };
      }
      return null;
    }
  }

  async toggleFavorite(id: string): Promise<{ isFavorited: boolean } | null> {
    try {
      const response = await this.client.post<{ isFavorited: boolean }>(`/snippets/${id}/favorite`);
      return response.data;
    } catch {
      const snippet = this.mockSnippets.find(s => s.id === id);
      if (snippet) {
        snippet.isFavorited = !snippet.isFavorited;
        return { isFavorited: snippet.isFavorited };
      }
      return null;
    }
  }

  async getFavorites(): Promise<Snippet[]> {
    try {
      const response = await this.client.get<Snippet[]>('/favorites');
      return response.data;
    } catch {
      return this.mockSnippets.filter(s => s.isFavorited);
    }
  }

  async searchSnippets(query: string): Promise<Snippet[]> {
    try {
      const response = await this.client.get<Snippet[]>('/search', { params: { q: query } });
      return response.data;
    } catch {
      const q = query.toLowerCase();
      return this.mockSnippets.filter(
        s => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    }
  }
}

export const apiService = new ApiService();
