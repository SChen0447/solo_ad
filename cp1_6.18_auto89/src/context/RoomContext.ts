import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface RemoteCursor {
  socketId: string;
  name: string;
  color: string;
  offset: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface Version {
  id: string;
  content: string;
  timestamp: number;
  authors: Record<string, string>;
}

export interface RoomUser {
  name: string;
  color: string;
}

interface RoomState {
  socket: Socket | null;
  connected: boolean;
  roomId: string | null;
  inviteCode: string | null;
  userName: string;
  content: string;
  users: Record<string, RoomUser>;
  remoteCursors: Record<string, RemoteCursor>;
  versions: Version[];
  inRoom: boolean;

  connect: (userName: string) => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  updateContent: (content: string, authorKey?: string) => void;
  broadcastCursor: (offset: number, selectionStart?: number, selectionEnd?: number) => void;
  manualSave: () => void;
  setUserName: (name: string) => void;
}

let socketInstance: Socket | null = null;

export const useRoomStore = create<RoomState>((set, get) => ({
  socket: null,
  connected: false,
  roomId: null,
  inviteCode: null,
  userName: '',
  content: '',
  users: {},
  remoteCursors: {},
  versions: [],
  inRoom: false,

  connect: (userName: string) => {
    if (socketInstance?.connected) return;

    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    socketInstance = socket;

    socket.on('connect', () => {
      set({ connected: true, socket });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('room-created', (data) => {
      set({
        roomId: data.roomId,
        inviteCode: data.inviteCode,
        content: data.content,
        users: data.users,
        versions: data.versions,
        inRoom: true,
      });
    });

    socket.on('room-joined', (data) => {
      set({
        roomId: data.roomId,
        inviteCode: data.inviteCode,
        content: data.content,
        users: data.users,
        versions: data.versions,
        inRoom: true,
      });
    });

    socket.on('join-error', (data) => {
      alert(data.message);
    });

    socket.on('content-update', ({ content, socketId }) => {
      const state = get();
      if (socketId !== state.socket?.id) {
        set({ content });
      }
    });

    socket.on('user-joined', ({ socketId, user }) => {
      set((state) => ({
        users: { ...state.users, [socketId]: user },
      }));
    });

    socket.on('user-left', ({ socketId }) => {
      set((state) => {
        const newUsers = { ...state.users };
        delete newUsers[socketId];
        const newCursors = { ...state.remoteCursors };
        delete newCursors[socketId];
        return { users: newUsers, remoteCursors: newCursors };
      });
    });

    socket.on('remote-cursor', ({ socketId, offset, selectionStart, selectionEnd }) => {
      set((state) => {
        const user = state.users[socketId];
        if (!user) return state;
        return {
          remoteCursors: {
            ...state.remoteCursors,
            [socketId]: {
              socketId,
              name: user.name,
              color: user.color,
              offset,
              selectionStart,
              selectionEnd,
            },
          },
        };
      });
    });

    socket.on('version-snapshot', (snapshot) => {
      set((state) => ({
        versions: [...state.versions, snapshot],
      }));
    });

    set({ socket, userName });
  },

  createRoom: () => {
    const { socket, userName } = get();
    if (!socket) return;
    socket.emit('create-room', { userName });
  },

  joinRoom: (code: string) => {
    const { socket, userName } = get();
    if (!socket) return;
    socket.emit('join-room', { roomId: code.toUpperCase(), userName });
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    socketInstance = null;
    set({
      socket: null,
      connected: false,
      roomId: null,
      inviteCode: null,
      content: '',
      users: {},
      remoteCursors: {},
      versions: [],
      inRoom: false,
    });
  },

  updateContent: (content: string, authorKey?: string) => {
    const { socket } = get();
    if (!socket) return;
    set({ content });
    socket.emit('content-change', { content, authorKey });
  },

  broadcastCursor: (offset: number, selectionStart?: number, selectionEnd?: number) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('cursor-move', { offset, selectionStart, selectionEnd });
  },

  manualSave: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('manual-save');
  },

  setUserName: (name: string) => {
    set({ userName: name });
  },
}));
