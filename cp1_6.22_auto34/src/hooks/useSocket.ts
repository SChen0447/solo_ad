import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store';
import type { PlayerColor, Position, ChatMessage } from '@/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

type EventHandler = (...args: unknown[]) => void;

export function useSocket() {
  const [connected, setConnected] = useState<ConnectionStatus>('disconnected');
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeMove = useGameStore((s) => s.makeMove);
  const addChatMessage = useGameStore((s) => s.addChatMessage);
  const joinRoomStore = useGameStore((s) => s.joinRoom);
  const setTimeoutLoss = useGameStore((s) => s.setTimeoutLoss);
  const addToast = useGameStore((s) => s.addToast);
  const nickname = useGameStore((s) => s.nickname);
  const currentRoomId = useGameStore((s) => s.currentRoomId);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: string, handler: EventHandler) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(event);
      }
    }
  }, []);

  const joinRoom = useCallback(
    (roomId: string, nick?: string) => {
      const name = nick || nickname;
      const success = joinRoomStore(roomId, name);
      if (success) {
        emit('player-joined', { roomId, nickname: name });
        addToast(`Joined room ${roomId}`, 'success');
      } else {
        addToast(`Failed to join room ${roomId}`, 'error');
      }
      return success;
    },
    [joinRoomStore, nickname, emit, addToast]
  );

  const makeMoveAndCheck = useCallback(
    (roomId: string, position: Position, player: PlayerColor) => {
      const winLine = makeMove(roomId, position, player);
      emit('move', { roomId, position, player });
      if (winLine) {
        emit('game-end', { roomId, winner: player, winLine });
        addToast(`${player} wins!`, 'success');
      }
      return winLine;
    },
    [makeMove, emit, addToast]
  );

  const sendChat = useCallback(
    (roomId: string, text: string, color: PlayerColor) => {
      const message: ChatMessage = {
        sender: nickname,
        color,
        text,
        timestamp: Date.now(),
      };
      addChatMessage(roomId, message);
      emit('chat', { roomId, message });
    },
    [nickname, addChatMessage, emit]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      emit('leave-room', { roomId, nickname });
    },
    [emit, nickname]
  );

  useEffect(() => {
    setConnected('connected');

    const handleTimeout = (data: unknown) => {
      const { roomId, loser } = data as { roomId: string; loser: PlayerColor };
      setTimeoutLoss(roomId, loser);
      addToast(`${loser} ran out of time`, 'info');
    };

    on('timeout', handleTimeout);

    return () => {
      off('timeout', handleTimeout);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [on, off, setTimeoutLoss, addToast]);

  useEffect(() => {
    if (connected !== 'reconnecting') return;

    const timer = setTimeout(() => {
      setConnected('connected');
      addToast('Reconnected', 'success');
    }, 2000);

    reconnectTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
    };
  }, [connected, addToast]);

  useEffect(() => {
    if (connected !== 'connected' || !currentRoomId) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.03) {
        setConnected('reconnecting');
        addToast('Connection lost, reconnecting...', 'error');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, currentRoomId, addToast]);

  return {
    connected,
    emit,
    on,
    off,
    joinRoom,
    makeMove: makeMoveAndCheck,
    sendChat,
    leaveRoom,
  };
}
