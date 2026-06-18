export interface TopicOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  avatarColor: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  options: TopicOption[];
  comments: Comment[];
  createdAt: string;
  votedUsers: string[];
}

const API_BASE = '/api';

export async function fetchTopics(): Promise<Topic[]> {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error('Failed to fetch topics');
  return res.json();
}

export async function fetchTopicDetail(id: string): Promise<Topic> {
  const res = await fetch(`${API_BASE}/topics/${id}`);
  if (!res.ok) throw new Error('Failed to fetch topic detail');
  return res.json();
}

export async function createTopic(data: {
  title: string;
  description: string;
  options: string[];
}): Promise<Topic> {
  const res = await fetch(`${API_BASE}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create topic');
  return res.json();
}

export async function voteTopic(
  topicId: string,
  optionId: string,
  userId: string
): Promise<Topic> {
  const res = await fetch(`${API_BASE}/topics/${topicId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionId, userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to vote');
  }
  return res.json();
}

export async function addComment(
  topicId: string,
  author: string,
  content: string,
  avatarColor: string
): Promise<Comment> {
  const res = await fetch(`${API_BASE}/topics/${topicId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, content, avatarColor }),
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}
