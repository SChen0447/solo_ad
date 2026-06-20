export interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  condition: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  createdAt: string;
  exchangeRequests: ExchangeRequest[];
}

export interface ExchangeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  message: string;
  createdAt: string;
}

export interface Answer {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  liked: boolean;
  replies: Answer[];
  createdAt: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  answers: Answer[];
  createdAt: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchItems(): Promise<Item[]> {
  return request<Item[]>('/api/items');
}

export function fetchItemById(id: string): Promise<Item> {
  return request<Item>(`/api/items/${id}`);
}

export function postItem(data: Partial<Item>): Promise<Item> {
  return request<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  return request<Item>(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/items/${id}`, { method: 'DELETE' });
}

export function requestExchange(
  itemId: string,
  data: { requesterId: string; requesterName: string; message: string }
): Promise<ExchangeRequest> {
  return request<ExchangeRequest>(`/api/items/${itemId}/exchange`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchQuestions(): Promise<Question[]> {
  return request<Question[]>('/api/questions');
}

export function postQuestion(data: Partial<Question>): Promise<Question> {
  return request<Question>('/api/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteQuestion(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/questions/${id}`, { method: 'DELETE' });
}

export function postAnswer(
  questionId: string,
  data: { content: string; authorId: string; authorName: string; authorAvatar: string; parentId?: string }
): Promise<Answer> {
  return request<Answer>(`/api/questions/${questionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function likeAnswer(
  questionId: string,
  answerId: string,
  userId: string
): Promise<{ likes: number; liked: boolean }> {
  return request<{ likes: number; liked: boolean }>(
    `/api/questions/${questionId}/answers/${answerId}/like`,
    { method: 'POST', body: JSON.stringify({ userId }) }
  );
}
