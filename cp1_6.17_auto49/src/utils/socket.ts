import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connect(): Socket {
  if (socket && socket.connected) return socket;
  socket = io({
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emit(event: string, data: unknown): void {
  if (socket) {
    socket.emit(event, data);
  }
}

export function on(event: string, callback: (...args: unknown[]) => void): void {
  if (socket) {
    socket.on(event, callback as (...args: unknown[]) => void);
  }
}

export function off(event: string, callback?: (...args: unknown[]) => void): void {
  if (socket) {
    socket.off(event, callback as (...args: unknown[]) => void);
  }
}

export function getSocket(): Socket | null {
  return socket;
}
