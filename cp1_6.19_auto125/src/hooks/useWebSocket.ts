import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../types';

interface UseWebSocketReturn {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  connected: boolean;
  joinRoom: (roomId: string, playerName: string) => void;
  buildMiner: () => void;
  buildTower: () => void;
  upgradeBase: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    socket.on('joined', ({ playerId: pid }: { playerId: string; roomId: string }) => {
      setPlayerId(pid);
    });

    socket.on('error', (err: { message: string }) => {
      console.error('Socket error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', { roomId, playerName });
    }
  }, []);

  const buildMiner = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('buildMiner');
    }
  }, []);

  const buildTower = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('buildTower');
    }
  }, []);

  const upgradeBase = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('upgradeBase');
    }
  }, []);

  return {
    socket: socketRef.current,
    gameState,
    playerId,
    connected,
    joinRoom,
    buildMiner,
    buildTower,
    upgradeBase,
  };
}
