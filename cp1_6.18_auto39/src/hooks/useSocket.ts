import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import type { QueueItem, DeviceStatus } from '../types';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { setQueue, updateDeviceStatus, setOnlineCount, addNotification } = useStore();

  const connect = useCallback((nickname: string, isAdmin: boolean) => {
    if (socketRef.current) return;

    const socket = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', { nickname, isAdmin });
      useStore.getState().setCurrentUser({ nickname, isAdmin, socketId: socket.id });
    });

    socket.on('device:status', (data: { deviceId: string; status: DeviceStatus; remainingMinutes?: number; currentUser?: string; maintenanceReason?: string }) => {
      updateDeviceStatus(data.deviceId, data.status, data.remainingMinutes, data.currentUser, data.maintenanceReason);
    });

    socket.on('queue:update', (data: { deviceId: string; queue: QueueItem[] }) => {
      setQueue(data.deviceId, data.queue);
    });

    socket.on('device:free', (data: { deviceId: string; deviceName: string }) => {
      const notification = {
        id: uuidv4(),
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        message: `您的${data.deviceName}已空闲，请尽快使用！`,
      };
      addNotification(notification);
    });

    socket.on('users:count', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    return socket;
  }, [setQueue, updateDeviceStatus, setOnlineCount, addNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, getSocket };
}
