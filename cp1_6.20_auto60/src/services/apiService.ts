import axios from 'axios';

export interface Topic {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  ideaCount: number;
}

export interface Idea {
  id: string;
  topicId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  createdAt: number;
  likes: string[];
  votes: VoteData;
  avgScore: number;
  gradientColor: string;
}

export interface VoteData {
  [memberId: string]: {
    feasibility: number;
    innovation: number;
    cost: number;
  };
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface CreateTopicRequest {
  title: string;
  description: string;
}

export interface CreateIdeaRequest {
  topicId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorColor: string;
}

export interface SubmitVoteRequest {
  ideaId: string;
  memberId: string;
  feasibility: number;
  innovation: number;
  cost: number;
}

export interface LikeIdeaRequest {
  ideaId: string;
  memberId: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const apiService = {
  getTopics: (): Promise<Topic[]> => {
    return api.get('/topics').then((res) => res.data);
  },

  createTopic: (data: CreateTopicRequest): Promise<Topic> => {
    return api.post('/topics', data).then((res) => res.data);
  },

  getIdeas: (topicId?: string): Promise<Idea[]> => {
    const url = topicId ? `/ideas?topicId=${topicId}` : '/ideas';
    return api.get(url).then((res) => res.data);
  },

  createIdea: (data: CreateIdeaRequest): Promise<Idea> => {
    return api.post('/ideas', data).then((res) => res.data);
  },

  submitVote: (data: SubmitVoteRequest): Promise<Idea> => {
    return api.post('/votes', data).then((res) => res.data);
  },

  likeIdea: (data: LikeIdeaRequest): Promise<Idea> => {
    return api.post('/ideas/like', data).then((res) => res.data);
  },
};
