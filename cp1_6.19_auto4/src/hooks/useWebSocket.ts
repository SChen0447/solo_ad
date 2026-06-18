import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDocumentStore } from '../state/documentStore';
import type { Comment, DocumentVersion } from '../types';

const SOCKET_URL = '/';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    content,
    comments,
    documentId,
    currentUser,
    setContent,
    setComments,
    setVersions,
    addComment,
    updateCommentStatus,
    restoreVersion,
  } = useDocumentStore();

  const isSyncingRef = useRef(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('join-document', { documentId, username: currentUser });
    });

    socket.on('document-state', (data: { content: string; comments: Comment[]; versions: DocumentVersion[] }) => {
      isSyncingRef.current = true;
      setContent(data.content);
      setComments(data.comments || []);
      setVersions(data.versions || []);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    });

    socket.on('document-sync', (data: { content: string }) => {
      isSyncingRef.current = true;
      setContent(data.content);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    });

    socket.on('comment-added', (comment: Comment) => {
      const existingComments = useDocumentStore.getState().comments;
      if (!existingComments.find((c) => c.id === comment.id)) {
        setComments([...existingComments, comment]);
      }
    });

    socket.on('comment-updated', (data: { commentId: string; status: 'pending' | 'resolved' }) => {
      updateCommentStatus(data.commentId, data.status);
    });

    socket.on('document-restored', (data: { content: string; comments: Comment[] }) => {
      isSyncingRef.current = true;
      setContent(data.content);
      setComments(data.comments);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    });

    socket.on('versions-updated', (versions: DocumentVersion[]) => {
      setVersions(versions);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, currentUser]);

  useEffect(() => {
    if (!socketRef.current || isSyncingRef.current) return;

    const timer = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('document-update', {
          documentId,
          content,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [content, documentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current && content) {
        socketRef.current.emit('autosave', {
          documentId,
          content,
          comments,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [content, comments, documentId]);

  const emitCommentAdd = (comment: Omit<Comment, 'id' | 'timestamp'>) => {
    if (socketRef.current) {
      socketRef.current.emit('comment-add', {
        documentId,
        comment,
      });
    }
  };

  const emitCommentUpdate = (commentId: string, status: 'pending' | 'resolved') => {
    if (socketRef.current) {
      socketRef.current.emit('comment-update', {
        documentId,
        commentId,
        status,
      });
    }
  };

  const emitRestoreVersion = (versionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('version-restore', {
        documentId,
        versionId,
      });
    }
  };

  return {
    emitCommentAdd,
    emitCommentUpdate,
    emitRestoreVersion,
    isSyncing: isSyncingRef.current,
  };
}
