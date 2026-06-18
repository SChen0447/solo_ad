import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const joinAuction = (itemId: string) => {
  initSocket();
  socket?.emit('auction:join', itemId);
};

export const leaveAuction = (itemId: string) => {
  socket?.emit('auction:leave', itemId);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
