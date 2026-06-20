export interface ExchangeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  message: string;
  createdAt: number;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  exchangeRequests: ExchangeRequest[];
}

export interface Reply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export interface Answer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  replies: Reply[];
}

export interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: number;
  answers: Answer[];
}

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchItems(page = 1, limit = 12) {
  return request<{ items: Item[]; total: number; hasMore: boolean }>(
    `/items?page=${page}&limit=${limit}`
  );
}

export async function fetchItemById(id: string) {
  return request<Item>(`/items/${id}`);
}

export async function postItem(data: {
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  ownerId: string;
  ownerName: string;
}) {
  return request<Item>('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string) {
  return request<{ success: boolean }>(`/items/${id}`, {
    method: 'DELETE',
  });
}

export async function updateItem(id: string, data: Partial<Item>) {
  return request<Item>(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function requestExchange(
  itemId: string,
  data: { requesterId: string; requesterName: string; message?: string }
) {
  return request<{ success: boolean; request: ExchangeRequest }>(
    `/items/${itemId}/request`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function fetchQuestions() {
  return request<Question[]>('/questions');
}

export async function postQuestion(data: {
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
}) {
  return request<Question>('/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(id: string) {
  return request<{ success: boolean }>(`/questions/${id}`, {
    method: 'DELETE',
  });
}

export async function postAnswer(
  questionId: string,
  data: { content: string; authorId: string; authorName: string }
) {
  return request<Answer>(`/questions/${questionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function likeAnswer(
  questionId: string,
  answerId: string,
  userId: string
) {
  return request<{ liked: boolean; likes: number }>(
    `/questions/${questionId}/answers/${answerId}/like`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
}

export async function postReply(
  questionId: string,
  answerId: string,
  data: { content: string; authorId: string; authorName: string }
) {
  return request<Reply>(
    `/questions/${questionId}/answers/${answerId}/replies`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export const CURRENT_USER = {
  id: 'user_001',
  name: '小明邻居',
  avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20cartoon%20neighbor%20avatar%20smiling&image_size=square_hd',
};
