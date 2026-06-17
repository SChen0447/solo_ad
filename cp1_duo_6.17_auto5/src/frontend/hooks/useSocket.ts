import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ConceptNode,
  Connection,
  Collaborator,
  RoomState,
} from '../types';
import { useCanvasStore } from '../store';

const SOCKET_URL = 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setRoomState,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorCursor,
    setCurrentUser,
    setRoomId,
  } = useCanvasStore();

  const connect = useCallback(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);
    });

    socket.on('node_add', (node: ConceptNode) => {
      addNode(node);
    });

    socket.on('node_update', (node: ConceptNode) => {
      updateNode(node);
    });

    socket.on('node_delete', (nodeId: string) => {
      deleteNode(nodeId);
    });

    socket.on('connection_add', (connection: Connection) => {
      addConnection(connection);
    });

    socket.on('connection_delete', (connectionId: string) => {
      deleteConnection(connectionId);
    });

    socket.on('user_joined', (user: Collaborator) => {
      addCollaborator(user);
    });

    socket.on('user_left', (userId: string) => {
      removeCollaborator(userId);
    });

    socket.on('cursor_move', (data: { userId: string; x: number; y: number }) => {
      updateCollaboratorCursor(data.userId, data.x, data.y);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socketRef.current = socket;
  }, [
    setRoomState,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorCursor,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const joinRoom = useCallback(
    (roomId: string, user: Omit<Collaborator, 'cursorX' | 'cursorY' | 'lastActive'>) => {
      if (!socketRef.current) return;

      const fullUser: Collaborator = {
        ...user,
        cursorX: 0,
        cursorY: 0,
        lastActive: Date.now(),
      };

      setCurrentUser(fullUser);
      setRoomId(roomId);
      socketRef.current.emit('join_room', { roomId, user: fullUser });
    },
    [setCurrentUser, setRoomId]
  );

  const leaveRoom = useCallback(
    (roomId: string, userId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('leave_room', { roomId, userId });
    },
    []
  );

  const sendNodeAdd = useCallback(
    (roomId: string, node: ConceptNode) => {
      if (!socketRef.current) return;
      socketRef.current.emit('node_add', { roomId, node });
    },
    []
  );

  const sendNodeUpdate = useCallback(
    (roomId: string, node: ConceptNode) => {
      if (!socketRef.current) return;
      socketRef.current.emit('node_update', { roomId, node });
    },
    []
  );

  const sendNodeDelete = useCallback(
    (roomId: string, nodeId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('node_delete', { roomId, nodeId });
    },
    []
  );

  const sendConnectionAdd = useCallback(
    (roomId: string, connection: Connection) => {
      if (!socketRef.current) return;
      socketRef.current.emit('connection_add', { roomId, connection });
    },
    []
  );

  const sendConnectionDelete = useCallback(
    (roomId: string, connectionId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('connection_delete', { roomId, connectionId });
    },
    []
  );

  const sendCursorMove = useCallback(
    (roomId: string, userId: string, x: number, y: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('cursor_move', { roomId, userId, x, y });
    },
    []
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendNodeAdd,
    sendNodeUpdate,
    sendNodeDelete,
    sendConnectionAdd,
    sendConnectionDelete,
    sendCursorMove,
    isConnected: !!socketRef.current?.connected,
  };
}
