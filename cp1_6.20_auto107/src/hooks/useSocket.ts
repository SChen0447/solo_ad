import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { OnlineUser, Comment } from '../types';

interface SocketEvents {
  onUserJoined?: (user: OnlineUser, allUsers: OnlineUser[]) => void;
  onUserLeft?: (sid: string, allUsers: OnlineUser[]) => void;
  onOnlineUsersList?: (users: OnlineUser[]) => void;
  onTranslationUpdated?: (data: { doc_id: string; paragraph_index: number; translation: string }) => void;
  onParagraphLocked?: (data: { doc_id: string; paragraph_index: number; user_id: string }) => void;
  onParagraphUnlocked?: (data: { doc_id: string; paragraph_index: number }) => void;
  onNewComment?: (data: { doc_id: string; comment: Comment }) => void;
  onReviewStatusUpdated?: (data: { doc_id: string; paragraph_index: number; status: string }) => void;
}

export const useSocket = (docId?: string, events: SocketEvents = {}) => {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback((userId: string, userName: string) => {
    if (!docId) return;

    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_document', {
        doc_id: docId,
        user_id: userId,
        user_name: userName,
      });
    });

    if (events.onUserJoined) {
      socket.on('user_joined', (data: { user: OnlineUser; online_users: OnlineUser[] }) => {
        events.onUserJoined!(data.user, data.online_users);
      });
    }

    if (events.onUserLeft) {
      socket.on('user_left', (data: { sid: string; online_users: OnlineUser[] }) => {
        events.onUserLeft!(data.sid, data.online_users);
      });
    }

    if (events.onOnlineUsersList) {
      socket.on('online_users_list', (data: { online_users: OnlineUser[] }) => {
        events.onOnlineUsersList!(data.online_users);
      });
    }

    if (events.onTranslationUpdated) {
      socket.on('translation_updated', events.onTranslationUpdated);
    }

    if (events.onParagraphLocked) {
      socket.on('paragraph_locked', events.onParagraphLocked);
    }

    if (events.onParagraphUnlocked) {
      socket.on('paragraph_unlocked', events.onParagraphUnlocked);
    }

    if (events.onNewComment) {
      socket.on('new_comment', events.onNewComment);
    }

    if (events.onReviewStatusUpdated) {
      socket.on('review_status_updated', events.onReviewStatusUpdated);
    }

    return socket;
  }, [docId, events]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const lockParagraph = useCallback((paragraphIndex: number, userId: string) => {
    if (socketRef.current && docId) {
      socketRef.current.emit('lock_paragraph', {
        doc_id: docId,
        paragraph_index: paragraphIndex,
        user_id: userId,
      });
    }
  }, [docId]);

  const unlockParagraph = useCallback((paragraphIndex: number) => {
    if (socketRef.current && docId) {
      socketRef.current.emit('unlock_paragraph', {
        doc_id: docId,
        paragraph_index: paragraphIndex,
      });
    }
  }, [docId]);

  const getOnlineUsers = useCallback(() => {
    if (socketRef.current && docId) {
      socketRef.current.emit('get_online_users', { doc_id: docId });
    }
  }, [docId]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    lockParagraph,
    unlockParagraph,
    getOnlineUsers,
    socket: socketRef.current,
  };
};
