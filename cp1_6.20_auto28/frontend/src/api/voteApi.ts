import axios from 'axios';
import type { Vote, CreateVoteRequest, SubmitVoteRequest } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const voteApi = {
  async createVote(data: CreateVoteRequest): Promise<{ vote: Vote; qrCode: string }> {
    const response = await api.post('/votes', data);
    return response.data;
  },

  async getVote(id: string): Promise<Vote> {
    const response = await api.get(`/votes/${id}`);
    return response.data;
  },

  async getVoteList(): Promise<Vote[]> {
    const response = await api.get('/votes');
    return response.data;
  },

  async submitVote(data: SubmitVoteRequest): Promise<Vote> {
    const response = await api.post('/votes/submit', data);
    return response.data;
  },

  async endVote(id: string): Promise<Vote> {
    const response = await api.post(`/votes/${id}/end`);
    return response.data;
  }
};

export default voteApi;
