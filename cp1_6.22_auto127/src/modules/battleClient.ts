import { io, Socket } from 'socket.io-client';
import type { BattleSnapshot, CommandPayload, BattleStartPayload, BattleEndPayload, MatchFoundPayload } from '../../shared/types';

export function connectSocket(playerId: string): Socket {
  return io('http://localhost:3001', {
    query: { playerId }
  });
}

export function joinQueue(socket: Socket, data: { playerId: string; fleetId: string; power: number; ships: string[] }): void {
  socket.emit('join-queue', data);
}

export function leaveQueue(socket: Socket, playerId: string): void {
  socket.emit('leave-queue', { playerId });
}

export function sendCommand(socket: Socket, roomId: string, command: CommandPayload): void {
  socket.emit('command', { ...command, roomId });
}

export function onMatchFound(socket: Socket, callback: (data: MatchFoundPayload) => void): void {
  socket.on('match-found', callback);
}

export function onBattleStart(socket: Socket, callback: (data: BattleStartPayload) => void): void {
  socket.on('battle-start', callback);
}

export function onBattleUpdate(socket: Socket, callback: (snapshot: BattleSnapshot) => void): void {
  socket.on('battle-update', callback);
}

export function onBattleEnd(socket: Socket, callback: (data: BattleEndPayload) => void): void {
  socket.on('battle-end', callback);
}

export function disconnectSocket(socket: Socket): void {
  socket.disconnect();
}
