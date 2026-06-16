import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { User, Op, HistoryVersion, Snapshot, SocketState } from '../types';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<SocketState>({
    connected: false,
    userId: null,
    userName: null,
    userColor: null,
  });
  const [code, setCode] = useState<string>('');
  const [version, setVersion] = useState<number>(0);
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<HistoryVersion[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const onInitRef = useRef<((data: {
    userId: string;
    userName: string;
    userColor: string;
    code: string;
    version: number;
    users: User[];
    history: HistoryVersion[];
    snapshots: Snapshot[];
  }) => void) | null>(null);

  const onRemoteEditRef = useRef<((data: {
    userId: string;
    ops: Op[];
    version: number;
    code: string;
    editRange?: { start: number; end: number } | null;
  }) => void) | null>(null);

  const onRemoteCursorRef = useRef<((data: {
    userId: string;
    from: number;
    to: number;
  }) => void) | null>(null);

  const onRemoteUndoRef = useRef<((data: {
    userId: string;
    code: string;
    version: number;
  }) => void) | null>(null);

  const onUserJoinRef = useRef<((data: { user: User }) => void) | null>(null);
  const onUserLeaveRef = useRef<((data: { userId: string }) => void) | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketState((prev) => ({ ...prev, connected: true }));
    });

    socket.on('disconnect', () => {
      setSocketState((prev) => ({ ...prev, connected: false }));
    });

    socket.on('init', (data) => {
      setSocketState({
        connected: true,
        userId: data.userId,
        userName: data.userName,
        userColor: data.userColor,
      });
      setCode(data.code);
      setVersion(data.version);
      setUsers(data.users);
      setHistory(data.history);
      setSnapshots(data.snapshots);
      onInitRef.current?.(data);
    });

    socket.on('remoteEdit', (data) => {
      setCode(data.code);
      setVersion(data.version);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId ? { ...u, editRange: data.editRange || null } : u
        )
      );
      onRemoteEditRef.current?.(data);
    });

    socket.on('remoteCursor', (data) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId
            ? { ...u, cursor: { from: data.from, to: data.to } }
            : u
        )
      );
      onRemoteCursorRef.current?.(data);
    });

    socket.on('remoteUndo', (data) => {
      setCode(data.code);
      setVersion(data.version);
      onRemoteUndoRef.current?.(data);
    });

    socket.on('userJoin', (data) => {
      setUsers((prev) => {
        const existing = prev.find((u) => u.id === data.user.id);
        if (existing) {
          return prev.map((u) =>
            u.id === data.user.id ? { ...u, online: true } : u
          );
        }
        return [...prev, data.user];
      });
      onUserJoinRef.current?.(data);
    });

    socket.on('userLeave', (data) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId ? { ...u, online: false } : u
        )
      );
      onUserLeaveRef.current?.(data);
    });

    socket.on('historyUpdate', (data) => {
      setHistory(data.history);
    });

    socket.on('snapshotSaved', (data) => {
      setSnapshots((prev) => [...prev, data.snapshot]);
    });

    socket.on('snapshotsUpdate', (data) => {
      setSnapshots(data.snapshots);
    });

    socket.on('conflict', (data) => {
      setConflictMessage(data.message);
      setTimeout(() => setConflictMessage(null), 3000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emitEdit = useCallback((ops: Op[]) => {
    if (!socketRef.current || !socketState.userId) return;
    socketRef.current.emit('edit', {
      userId: socketState.userId,
      version,
      ops,
    });
  }, [version, socketState.userId]);

  const emitCursor = useCallback((from: number, to: number) => {
    if (!socketRef.current || !socketState.userId) return;
    socketRef.current.emit('cursor', {
      userId: socketState.userId,
      from,
      to,
    });
  }, [socketState.userId]);

  const emitUndo = useCallback(() => {
    if (!socketRef.current || !socketState.userId) return;
    socketRef.current.emit('undo', { userId: socketState.userId });
  }, [socketState.userId]);

  const emitRedo = useCallback(() => {
    if (!socketRef.current || !socketState.userId) return;
    socketRef.current.emit('redo', { userId: socketState.userId });
  }, [socketState.userId]);

  const emitSaveSnapshot = useCallback((name: string, code: string) => {
    if (!socketRef.current || !socketState.userId) return;
    socketRef.current.emit('saveSnapshot', {
      name,
      code,
      userId: socketState.userId,
    });
  }, [socketState.userId]);

  const onInit = useCallback((callback: NonNullable<typeof onInitRef.current>) => {
    onInitRef.current = callback;
  }, []);

  const onRemoteEdit = useCallback((callback: NonNullable<typeof onRemoteEditRef.current>) => {
    onRemoteEditRef.current = callback;
  }, []);

  const onRemoteCursor = useCallback((callback: NonNullable<typeof onRemoteCursorRef.current>) => {
    onRemoteCursorRef.current = callback;
  }, []);

  const onRemoteUndo = useCallback((callback: NonNullable<typeof onRemoteUndoRef.current>) => {
    onRemoteUndoRef.current = callback;
  }, []);

  const onUserJoin = useCallback((callback: NonNullable<typeof onUserJoinRef.current>) => {
    onUserJoinRef.current = callback;
  }, []);

  const onUserLeave = useCallback((callback: NonNullable<typeof onUserLeaveRef.current>) => {
    onUserLeaveRef.current = callback;
  }, []);

  return {
    socket: socketRef.current,
    socketState,
    code,
    setCode,
    version,
    users,
    history,
    snapshots,
    conflictMessage,
    emitEdit,
    emitCursor,
    emitUndo,
    emitRedo,
    emitSaveSnapshot,
    onInit,
    onRemoteEdit,
    onRemoteCursor,
    onRemoteUndo,
    onUserJoin,
    onUserLeave,
  };
}
