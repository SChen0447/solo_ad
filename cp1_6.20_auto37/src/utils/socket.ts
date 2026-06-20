import { io, Socket } from 'socket.io-client';
import type { Feedback } from './api';

let socket: Socket | null = null;

interface LikeUpdateData {
  id: string;
  likes: number;
}

type NewFeedbackCallback = (feedback: Feedback) => void;
type LikeUpdateCallback = (data: LikeUpdateData) => void;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onNewFeedback = (callback: NewFeedbackCallback): (() => void) => {
  const socketInstance = initSocket();
  
  const handler = (feedback: Feedback) => {
    callback(feedback);
  };
  
  socketInstance.on('new_feedback', handler);
  
  return () => {
    socketInstance.off('new_feedback', handler);
  };
};

export const onLikeUpdate = (callback: LikeUpdateCallback): (() => void) => {
  const socketInstance = initSocket();
  
  const handler = (data: LikeUpdateData) => {
    callback(data);
  };
  
  socketInstance.on('like_update', handler);
  
  return () => {
    socketInstance.off('like_update', handler);
  };
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  onNewFeedback,
  onLikeUpdate,
};
