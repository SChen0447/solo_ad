import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BaseElement, User, Operation } from '../types';

interface UseSocketOptions {
  boardId: string;
  userId: string;
  onElementsInit?: (elements: BaseElement[]) => void;
  onElementAdded?: (element: BaseElement) => void;
  onElementUpdated?: (data: { elementId: string; updates: Partial<BaseElement> }) => void;
  onElementDeleted?: (elementId: string) => void;
  onElementsRestore?: (data: { elements: BaseElement[]; userId: string }) => void;
  onUserJoined?: (user: User) => void;
  onUserLeft?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  onUsersList?: (users: User[]) => void;
  onBoardUndone?: (data: { operation: Operation; userId: string }) => void;
  onBoardRedone?: (data: { operation: Operation; userId: string }) => void;
  onCursorMoved?: (data: { userId: string; x: number; y: number }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { 
    boardId, 
    userId, 
    onElementsInit,
    onElementAdded,
    onElementUpdated,
    onElementDeleted,
    onElementsRestore,
    onUserJoined,
    onUserLeft,
    onUserUpdated,
    onUsersList,
    onBoardUndone,
    onBoardRedone,
    onCursorMoved
  } = options;

  useEffect(() => {
    if (!boardId || !userId) return;

    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('board:join', { boardId, userId });

    if (onElementsInit) socket.on('elements:init', onElementsInit);
    if (onElementAdded) socket.on('element:added', onElementAdded);
    if (onElementUpdated) socket.on('element:updated', onElementUpdated);
    if (onElementDeleted) socket.on('element:deleted', onElementDeleted);
    if (onElementsRestore) socket.on('elements:restore', onElementsRestore);
    if (onUserJoined) socket.on('user:joined', onUserJoined);
    if (onUserLeft) socket.on('user:left', onUserLeft);
    if (onUserUpdated) socket.on('user:updated', onUserUpdated);
    if (onUsersList) socket.on('users:list', onUsersList);
    if (onBoardUndone) socket.on('board:undone', onBoardUndone);
    if (onBoardRedone) socket.on('board:redone', onBoardRedone);
    if (onCursorMoved) socket.on('cursor:moved', onCursorMoved);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, userId, onElementsInit, onElementAdded, onElementUpdated, onElementDeleted, onElementsRestore, onUserJoined, onUserLeft, onUserUpdated, onUsersList, onBoardUndone, onBoardRedone, onCursorMoved]);

  const sendElementAdd = useCallback((element: BaseElement) => {
    socketRef.current?.emit('element:add', { boardId, element, userId });
  }, [boardId, userId]);

  const sendElementUpdate = useCallback((elementId: string, updates: Partial<BaseElement>) => {
    socketRef.current?.emit('element:update', { boardId, elementId, updates, userId });
  }, [boardId, userId]);

  const sendElementDelete = useCallback((elementId: string) => {
    socketRef.current?.emit('element:delete', { boardId, elementId, userId });
  }, [boardId, userId]);

  const sendUndo = useCallback(() => {
    socketRef.current?.emit('board:undo', { boardId, userId });
  }, [boardId, userId]);

  const sendRedo = useCallback(() => {
    socketRef.current?.emit('board:redo', { boardId, userId });
  }, [boardId, userId]);

  const sendCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit('cursor:move', { boardId, userId, x, y });
  }, [boardId, userId]);

  return {
    sendElementAdd,
    sendElementUpdate,
    sendElementDelete,
    sendUndo,
    sendRedo,
    sendCursorMove
  };
}
