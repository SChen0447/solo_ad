import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import { User, UserCursor, Comment, WebSocketMessage } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  connect: (roomCode: string, user: User) => void;
  disconnect: () => void;
  sendContentUpdate: (content: string) => void;
  sendCursorUpdate: (cursor: UserCursor) => void;
  sendCommentAdd: (comment: Omit<Comment, 'id' | 'userId' | 'nickname' | 'color' | 'createdAt'>) => void;
  sendCommentDelete: (commentId: string) => void;
  onContentUpdate: (handler: (content: string, userId: string) => void) => () => void;
  onCursorUpdate: (handler: (cursor: UserCursor) => void) => () => void;
  onCommentAdd: (handler: (comment: Comment) => void) => () => void;
  onCommentDelete: (handler: (commentId: string) => void) => () => void;
  onUsersUpdate: (handler: (users: User[]) => void) => () => void;
  onInit: (handler: (data: { content: string; comments: Comment[]; users: User[]; cursors: UserCursor[] }) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const userRef = useRef<User | null>(null);
  const roomCodeRef = useRef<string>('');
  
  const contentUpdateHandlersRef = useRef<Set<(content: string, userId: string) => void>>(new Set());
  const cursorUpdateHandlersRef = useRef<Set<(cursor: UserCursor) => void>>(new Set());
  const commentAddHandlersRef = useRef<Set<(comment: Comment) => void>>(new Set());
  const commentDeleteHandlersRef = useRef<Set<(commentId: string) => void>>(new Set());
  const usersUpdateHandlersRef = useRef<Set<(users: User[]) => void>>(new Set());
  const initHandlersRef = useRef<Set<(data: { content: string; comments: Comment[]; users: User[]; cursors: UserCursor[] }) => void>>(new Set());

  const connect = useCallback((roomCode: string, user: User) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    userRef.current = user;
    roomCodeRef.current = roomCode;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      if (wsRef.current && userRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'join',
          roomCode: roomCodeRef.current,
          userId: userRef.current.id,
          nickname: userRef.current.nickname,
          color: userRef.current.color
        }));
      }
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'init':
            initHandlersRef.current.forEach(handler => 
              handler({ content: message.content, comments: message.comments, users: message.users, cursors: message.cursors })
            );
            break;
          case 'content-update':
            contentUpdateHandlersRef.current.forEach(handler => 
              handler(message.content, message.userId)
            );
            break;
          case 'cursor-update':
            cursorUpdateHandlersRef.current.forEach(handler => handler(message.cursor));
            break;
          case 'comment-add':
            commentAddHandlersRef.current.forEach(handler => handler(message.comment));
            break;
          case 'comment-delete':
            commentDeleteHandlersRef.current.forEach(handler => handler(message.commentId));
            break;
          case 'users-update':
            usersUpdateHandlersRef.current.forEach(handler => handler(message.users));
            break;
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN && userRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'leave',
          userId: userRef.current.id
        }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const throttleRef = useRef<{ lastSend: number; timer: ReturnType<typeof setTimeout> | null }>({
    lastSend: 0,
    timer: null
  });

  const sendContentUpdate = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !userRef.current) return;
    
    const now = Date.now();
    const minInterval = 50;
    
    const send = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'content-update',
          content,
          userId: userRef.current?.id
        }));
        throttleRef.current.lastSend = Date.now();
      }
    };
    
    if (now - throttleRef.current.lastSend >= minInterval) {
      send();
    } else {
      if (throttleRef.current.timer) {
        clearTimeout(throttleRef.current.timer);
      }
      throttleRef.current.timer = setTimeout(send, minInterval - (now - throttleRef.current.lastSend));
    }
  }, []);

  const sendCursorUpdate = useCallback((cursor: UserCursor) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'cursor-update',
      selection: cursor.selection,
      position: cursor.position
    }));
  }, []);

  const sendCommentAdd = useCallback((comment: Omit<Comment, 'id' | 'userId' | 'nickname' | 'color' | 'createdAt'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'comment-add',
      ...comment
    }));
  }, []);

  const sendCommentDelete = useCallback((commentId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'comment-delete',
      commentId
    }));
  }, []);

  const createHandlerRemover = <T,>(handlersSet: React.MutableRefObject<Set<T>>) => 
    (handler: T) => {
      handlersSet.current.add(handler);
      return () => {
        handlersSet.current.delete(handler);
      };
    };

  const onContentUpdate = createHandlerRemover(contentUpdateHandlersRef);
  const onCursorUpdate = createHandlerRemover(cursorUpdateHandlersRef);
  const onCommentAdd = createHandlerRemover(commentAddHandlersRef);
  const onCommentDelete = createHandlerRemover(commentDeleteHandlersRef);
  const onUsersUpdate = createHandlerRemover(usersUpdateHandlersRef);
  const onInit = createHandlerRemover(initHandlersRef);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    sendContentUpdate,
    sendCursorUpdate,
    sendCommentAdd,
    sendCommentDelete,
    onContentUpdate,
    onCursorUpdate,
    onCommentAdd,
    onCommentDelete,
    onUsersUpdate,
    onInit
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
