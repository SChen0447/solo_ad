import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (autoConnect) {
      socketRef.current = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [autoConnect]);

  const joinSong = useCallback((songId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-song', songId);
    }
  }, []);

  const leaveSong = useCallback((songId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-song', songId);
    }
  }, []);

  const addAnnotation = useCallback((songId: string, partId: string, annotation: any) => {
    if (socketRef.current) {
      socketRef.current.emit('annotation:add', { songId, partId, annotation });
    }
  }, []);

  const deleteAnnotation = useCallback((songId: string, partId: string, annotationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('annotation:delete', { songId, partId, annotationId });
    }
  }, []);

  const onAnnotationAdded = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('annotation:added', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('annotation:added', callback);
      }
    };
  }, []);

  const onAnnotationDeleted = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('annotation:deleted', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('annotation:deleted', callback);
      }
    };
  }, []);

  const joinRehearsal = useCallback((rehearsalId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-rehearsal', rehearsalId);
    }
  }, []);

  const leaveRehearsal = useCallback((rehearsalId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-rehearsal', rehearsalId);
    }
  }, []);

  const startRehearsal = useCallback((rehearsalId: string, startTime: number) => {
    if (socketRef.current) {
      socketRef.current.emit('rehearsal:start', { rehearsalId, startTime });
    }
  }, []);

  const stopRehearsal = useCallback((rehearsalId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('rehearsal:stop', { rehearsalId });
    }
  }, []);

  const tickRehearsal = useCallback((rehearsalId: string, elapsed: number, currentSongIndex: number) => {
    if (socketRef.current) {
      socketRef.current.emit('rehearsal:tick', { rehearsalId, elapsed, currentSongIndex });
    }
  }, []);

  const changeSong = useCallback((rehearsalId: string, songIndex: number) => {
    if (socketRef.current) {
      socketRef.current.emit('rehearsal:song-change', { rehearsalId, songIndex });
    }
  }, []);

  const submitRating = useCallback((rehearsalId: string, songId: string, score: number, feedback: string) => {
    if (socketRef.current) {
      socketRef.current.emit('rehearsal:rating', { rehearsalId, songId, score, feedback });
    }
  }, []);

  const onRehearsalStarted = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('rehearsal:started', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('rehearsal:started', callback);
      }
    };
  }, []);

  const onRehearsalStopped = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('rehearsal:stopped', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('rehearsal:stopped', callback);
      }
    };
  }, []);

  const onRehearsalTicking = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('rehearsal:ticking', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('rehearsal:ticking', callback);
      }
    };
  }, []);

  const onSongChanged = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('rehearsal:song-changed', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('rehearsal:song-changed', callback);
      }
    };
  }, []);

  const onRatingReceived = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('rehearsal:rating-received', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('rehearsal:rating-received', callback);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinSong,
    leaveSong,
    addAnnotation,
    deleteAnnotation,
    onAnnotationAdded,
    onAnnotationDeleted,
    joinRehearsal,
    leaveRehearsal,
    startRehearsal,
    stopRehearsal,
    tickRehearsal,
    changeSong,
    submitRating,
    onRehearsalStarted,
    onRehearsalStopped,
    onRehearsalTicking,
    onSongChanged,
    onRatingReceived,
  };
}
