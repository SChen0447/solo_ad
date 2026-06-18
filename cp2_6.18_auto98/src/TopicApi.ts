export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  options: VoteOption[];
  comments: Comment[];
  createdAt: number;
  voters: string[];
}

const API_BASE = '/api';

export const TopicApi = {
  async getTopics(): Promise<Topic[]> {
    const response = await fetch(`${API_BASE}/topics`);
    if (!response.ok) {
      throw new Error('Failed to fetch topics');
    }
    return response.json();
  },

  async getTopic(id: string): Promise<Topic> {
    const response = await fetch(`${API_BASE}/topics/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch topic');
    }
    return response.json();
  },

  async createTopic(data: { title: string; description: string; options: string[] }): Promise<Topic> {
    const response = await fetch(`${API_BASE}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create topic');
    }
    return response.json();
  },

  async vote(topicId: string, optionId: string, userId: string): Promise<{ success: boolean; topic: Topic }> {
    const response = await fetch(`${API_BASE}/topics/${topicId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ optionId, userId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to vote');
    }
    return response.json();
  },

  async addComment(topicId: string, content: string, author: string): Promise<Comment> {
    const response = await fetch(`${API_BASE}/topics/${topicId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, author }),
    });
    if (!response.ok) {
      throw new Error('Failed to add comment');
    }
    return response.json();
  },
};
