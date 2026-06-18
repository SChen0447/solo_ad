export interface TopicCard {
  id: string;
  title: string;
  description: string;
  optionCount: number;
  totalVotes: number;
  commentCount: number;
  createdAt: number;
}

export interface VoteOptionData {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface CommentData {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: number;
}

export interface TopicDetailData {
  id: string;
  title: string;
  description: string;
  options: VoteOptionData[];
  totalVotes: number;
  participants: number;
  comments: CommentData[];
  createdAt: number;
}

export interface VoteStatus {
  hasVoted: boolean;
  optionId: string | null;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const TopicApi = {
  getTopics(): Promise<TopicCard[]> {
    return request<TopicCard[]>('/topics');
  },

  getTopic(id: string): Promise<TopicDetailData> {
    return request<TopicDetailData>(`/topics/${id}`);
  },

  createTopic(data: { title: string; description: string; options: string[] }) {
    return request('/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  vote(topicId: string, data: { userId: string; optionId: string }) {
    return request(`/topics/${topicId}/vote`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getVoteStatus(topicId: string, userId: string): Promise<VoteStatus> {
    return request<VoteStatus>(`/topics/${topicId}/vote-status?userId=${encodeURIComponent(userId)}`);
  },

  addComment(
    topicId: string,
    data: { userId: string; nickname: string; text: string }
  ): Promise<{ comment: CommentData; commentCount: number }> {
    return request(`/topics/${topicId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
