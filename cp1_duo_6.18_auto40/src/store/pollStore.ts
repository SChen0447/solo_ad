import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { PollResult, CreatePollRequest } from '../types';

interface PollState {
  polls: PollResult[];
  currentPoll: PollResult | null;
  selectedOptions: string[];
  hasVoted: boolean;
  error: string | null;
  loading: boolean;
  socket: Socket | null;

  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<void>;
  createPoll: (data: CreatePollRequest) => Promise<PollResult | null>;
  submitVote: (pollId: string, optionIds: string[]) => Promise<void>;
  closePoll: (pollId: string) => Promise<void>;
  setSelectedOptions: (ids: string[]) => void;
  setError: (err: string | null) => void;
  initSocket: () => void;
  disconnectSocket: () => void;
}

export const usePollStore = create<PollState>((set, get) => ({
  polls: [],
  currentPoll: null,
  selectedOptions: [],
  hasVoted: false,
  error: null,
  loading: false,
  socket: null,

  fetchPolls: async () => {
    try {
      set({ loading: true, error: null });
      const res = await axios.get('/api/polls');
      set({ polls: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取投票列表失败', loading: false });
    }
  },

  fetchPoll: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const res = await axios.get(`/api/polls/${id}`);
      set({ currentPoll: res.data, loading: false, selectedOptions: [] });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '获取投票详情失败', loading: false });
    }
  },

  createPoll: async (data: CreatePollRequest) => {
    try {
      set({ loading: true, error: null });
      const res = await axios.post('/api/polls', data);
      set((state) => ({ polls: [res.data, ...state.polls], loading: false }));
      return res.data;
    } catch (err: any) {
      set({ error: err.response?.data?.error || '创建投票失败', loading: false });
      return null;
    }
  },

  submitVote: async (pollId: string, optionIds: string[]) => {
    try {
      set({ loading: true, error: null });
      await axios.post(`/api/polls/${pollId}/vote`, { optionIds });
      set({ hasVoted: true, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '投票失败', loading: false });
    }
  },

  closePoll: async (pollId: string) => {
    try {
      set({ loading: true, error: null });
      const res = await axios.post(`/api/polls/${pollId}/close`);
      set({ currentPoll: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || '关闭投票失败', loading: false });
    }
  },

  setSelectedOptions: (ids: string[]) => {
    set({ selectedOptions: ids });
  },

  setError: (err: string | null) => {
    set({ error: err });
  },

  initSocket: () => {
    if (get().socket) return;
    const socket = io();
    socket.on('result', (poll: PollResult) => {
      set((state) => {
        const newPolls = state.polls.map((p) => (p.id === poll.id ? poll : p));
        const currentPoll = state.currentPoll?.id === poll.id ? poll : state.currentPoll;
        return { polls: newPolls, currentPoll };
      });
    });
    socket.on('pollCreated', (poll: PollResult) => {
      set((state) => ({ polls: [poll, ...state.polls] }));
    });
    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
