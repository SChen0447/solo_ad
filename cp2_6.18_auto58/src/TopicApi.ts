export interface TopicListItem {
  id: string;
  title: string;
  description: string;
  optionCount: number;
  totalVotes: number;
  commentsCount: number;
  createdAt: number;
  participantCount: number;
}

export interface VoteOptionDetail {
  id: string;
  text: string;
  voteCount: number;
}

export interface Comment {
  id: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface TopicDetail {
  id: string;
  title: string;
  description: string;
  options: VoteOptionDetail[];
  totalVotes: number;
  comments: Comment[];
  createdAt: number;
  participantCount: number;
}

export interface VoteStatus {
  voted: boolean;
  votedOptionId: string | null;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '请求失败');
  }
  return response.json() as Promise<T>;
}

export const TopicApi = {
  getTopics(): Promise<TopicListItem[]> {
    return request<TopicListItem[]>('/topics');
  },

  getTopicDetail(id: string): Promise<TopicDetail> {
    return request<TopicDetail>(`/topics/${id}`);
  },

  createTopic(data: {
    title: string;
    description: string;
    options: string[];
  }): Promise<{ id: string }> {
    return request<{ id: string }>('/topics', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  vote(topicId: string, optionId: string, userId: string): Promise<{
    id: string;
    options: VoteOptionDetail[];
    totalVotes: number;
    participantCount: number;
  }> {
    return request<{
      id: string;
      options: VoteOptionDetail[];
      totalVotes: number;
      participantCount: number;
    }>(`/topics/${topicId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, userId })
    });
  },

  checkVoted(topicId: string, userId: string): Promise<VoteStatus> {
    return request<VoteStatus>(`/topics/${topicId}/voted/${userId}`);
  },

  addComment(topicId: string, userName: string, content: string): Promise<{
    comment: Comment;
    commentsCount: number;
  }> {
    return request<{ comment: Comment; commentsCount: number }>(
      `/topics/${topicId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ userName, content })
      }
    );
  }
};
