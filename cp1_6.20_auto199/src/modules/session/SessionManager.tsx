import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '../../types';
import { Socket } from 'socket.io-client';

interface SessionManagerProps {
  users: User[];
  currentUser: User | null;
  roomId: string;
  socket: Socket | null;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

export default function SessionManager({
  users,
  currentUser,
  roomId,
  socket,
}: SessionManagerProps) {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const lastPingRef = useRef<number>(Date.now());
  const latencyRef = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConnectionStatus('connected');
    };
    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };
    const handleConnectError = () => {
      setConnectionStatus('connecting');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    if (socket.connected) {
      setConnectionStatus('connected');
    }

    socket.on('cursor_update', (data: CursorPosition) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    socket.on('pong', () => {
      latencyRef.current = Date.now() - lastPingRef.current;
    });

    const pingInterval = setInterval(() => {
      lastPingRef.current = Date.now();
      socket.emit('ping');
    }, 5000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('cursor_update');
      clearInterval(pingInterval);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleMouseMove = (e: MouseEvent) => {
      socket.emit('cursor_position', {
        roomId,
        userId: currentUser?.id,
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [socket, roomId, currentUser]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const next = new Map(prev);
        for (const [userId, pos] of next) {
          if (now - pos.timestamp > 5000) {
            next.delete(userId);
          }
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const statusConfig = {
    connected: { color: '#4ECDC4', text: '已连接', icon: '✓' },
    disconnected: { color: '#FF6B6B', text: '已断开', icon: '✕' },
    connecting: { color: '#FFD700', text: '连接中...', icon: '◌' },
  };

  const status = statusConfig[connectionStatus];

  return (
    <div className="session-manager">
      <div className="session-status-bar">
        <div className="connection-indicator">
          <span
            className="status-dot"
            style={{ backgroundColor: status.color }}
          />
          <span className="status-text">{status.text}</span>
          {latencyRef.current > 0 && (
            <span className="latency-text">
              {latencyRef.current}ms
            </span>
          )}
        </div>
        <div className="user-cursors">
          {users.filter(u => u.id !== currentUser?.id).map(user => (
            <div
              key={user.id}
              className="user-cursor-chip"
              title={user.name}
            >
              <span
                className="cursor-color"
                style={{ backgroundColor: user.color }}
              />
              <span className="cursor-name">{user.name}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {Array.from(cursors.entries()).map(([userId, pos]) => {
          const user = users.find(u => u.id === userId);
          if (!user || userId === currentUser?.id) return null;
          return (
            <motion.div
              key={userId}
              className="remote-cursor"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: pos.x,
                y: pos.y,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: 'tween',
                ease: 'linear',
                duration: 0.05,
              }}
              style={{
                left: 0,
                top: 0,
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 3L5 18L9.5 14L15 22L18 20L12.5 12L19 12L5 3Z"
                  fill={user.color}
                  stroke="#fff"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="cursor-label"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
