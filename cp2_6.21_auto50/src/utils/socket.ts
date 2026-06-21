import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function emit(event: string, data?: unknown) {
  return getSocket().emit(event, data);
}

export function on<T = unknown>(event: string, callback: (data: T) => void) {
  getSocket().on(event, callback);
  return () => getSocket().off(event, callback);
}

export function off(event: string, callback?: (data: unknown) => void) {
  if (callback) {
    getSocket().off(event, callback);
  } else {
    getSocket().off(event);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
