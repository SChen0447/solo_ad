import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { PollData } from '../types';

const CLIENT_ID_KEY = 'vote_client_id';

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

interface VoteState {
  socket: Socket | null;
  pollData: PollData | null;
  selectedOptionId: string | null;
  hasVoted: boolean;
  adminToken: string | null;
  isAdminMode: boolean;
  error: string | null;
  connectSocket: () => void;
  joinPoll: (pollId: string) => void;
  setSelectedOption: (optionId: string | null) => void;
  submitVote: () => void;
  resetPoll: () => void;
  destroyPoll: () => void;
  setAdminToken: (token: string) => void;
  toggleAdminMode: () => void;
  clearPoll: () => void;
}

export const useVoteStore = create<VoteState>((set, get) => ({
  socket: null,
  pollData: null,
  selectedOptionId: null,
  hasVoted: false,
  adminToken: null,
  isAdminMode: false,
  error: null,

  connectSocket: () => {
    if (get().socket) return;

    const socket = io({
      transports: ['websocket', 'polling'],
    });
    set({ socket });

    socket.on('pollData', (data: PollData) => {
      const votedKey = `voted_${data.id}`;
      const hasVoted = localStorage.getItem(votedKey) === 'true';
      set({ pollData: data, hasVoted });
    });

    socket.on('voteUpdate', (data: PollData) => {
      set({ pollData: data });
    });

    socket.on('onlineUpdate', ({ onlineCount }: { onlineCount: number }) => {
      const pollData = get().pollData;
      if (pollData) {
        set({ pollData: { ...pollData, onlineCount } });
      }
    });

    socket.on('voted', ({ optionId }: { optionId: string }) => {
      const pollData = get().pollData;
      if (pollData) {
        localStorage.setItem(`voted_${pollData.id}`, 'true');
      }
      set({ hasVoted: true, selectedOptionId: optionId });
    });

    socket.on('pollReset', () => {
      const pollData = get().pollData;
      if (pollData) {
        localStorage.removeItem(`voted_${pollData.id}`);
      }
      set({ hasVoted: false, selectedOptionId: null });
    });

    socket.on('pollDestroyed', () => {
      const pollData = get().pollData;
      if (pollData) {
        set({ pollData: { ...pollData, isDestroyed: true } });
      }
    });

    socket.on('error', ({ message }: { message: string }) => {
      set({ error: message });
      setTimeout(() => set({ error: null }), 3000);
    });
  },

  joinPoll: (pollId: string) => {
    const { socket } = get();
    if (!socket) {
      get().connectSocket();
      setTimeout(() => get().joinPoll(pollId), 100);
      return;
    }
    const clientId = getClientId();
    socket.emit('joinPoll', { pollId, clientId });
  },

  setSelectedOption: (optionId: string | null) => {
    set({ selectedOptionId: optionId });
  },

  submitVote: () => {
    const { socket, pollData, selectedOptionId } = get();
    if (!socket || !pollData || !selectedOptionId) return;

    const clientId = getClientId();
    socket.emit('submitVote', {
      pollId: pollData.id,
      optionId: selectedOptionId,
      clientId,
    });
  },

  resetPoll: () => {
    const { socket, pollData, adminToken } = get();
    if (!socket || !pollData || !adminToken) return;

    socket.emit('resetPoll', {
      pollId: pollData.id,
      adminToken,
    });
  },

  destroyPoll: () => {
    const { socket, pollData, adminToken } = get();
    if (!socket || !pollData || !adminToken) return;

    socket.emit('destroyPoll', {
      pollId: pollData.id,
      adminToken,
    });
  },

  setAdminToken: (token: string) => {
    set({ adminToken: token });
  },

  toggleAdminMode: () => {
    set((state) => ({ isAdminMode: !state.isAdminMode }));
  },

  clearPoll: () => {
    set({
      pollData: null,
      selectedOptionId: null,
      hasVoted: false,
      adminToken: null,
      isAdminMode: false,
    });
  },
}));
