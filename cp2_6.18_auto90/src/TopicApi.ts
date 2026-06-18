export interface TopicListItem {
  id: string;
  title: string;
  description: string;
  optionsCount: number;
  totalVotes: number;
  commentsCount: number;
  createdAt: number;
}

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  content: string;
  nickname: string;
  timestamp: number;
}

export interface TopicDetail {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  comments: Comment[];
  voters: string[];
  createdAt: number;
}

export interface CreateTopicData {
  title: string;
  description: string;
  options: string[];
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(data.error || '请求失败');
  }
  return response.json();
}

export const TopicApi = {
  getTopics: (): Promise<TopicListItem[]> => request<TopicListItem[]>('/topics'),

  getTopicDetail: (id: string): Promise<TopicDetail> => request<TopicDetail>(`/topics/${id}`),

  createTopic: (data: CreateTopicData): Promise<TopicDetail> =>
    request<TopicDetail>('/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  vote: (topicId: string, optionId: string, nickname: string): Promise<TopicDetail> =>
    request<TopicDetail>(`/topics/${topicId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, nickname }),
    }),

  addComment: (topicId: string, content: string, nickname: string): Promise<Comment> =>
    request<Comment>(`/topics/${topicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, nickname }),
    }),
};
