import { io, Socket } from 'socket.io-client';
import type { ClientEvent, ServerEvent, User } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/ws',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function sendEvent(event: ClientEvent): void {
  const s = getSocket();
  s.emit('event', event);
}

export function joinSession(sessionId: string, user: User): void {
  sendEvent({
    type: 'session:join',
    data: { sessionId, user },
  });
}

export function leaveSession(sessionId: string, userId: string): void {
  sendEvent({
    type: 'session:leave',
    data: { sessionId, userId },
  });
}

export function onServerEvent(callback: (event: ServerEvent) => void): () => void {
  const s = getSocket();
  const handler = (event: ServerEvent) => callback(event);
  s.on('event', handler);
  return () => {
    s.off('event', handler);
  };
}
