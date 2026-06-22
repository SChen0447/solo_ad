import { useEffect, useRef, useCallback, useState } from 'react';
import { Device, WSMessage } from '../types';

interface UseWebSocketReturn {
  devices: Device[];
  updatedDeviceIds: Set<string>;
  connected: boolean;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [updatedDeviceIds, setUpdatedDeviceIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPulse = useCallback((id: string) => {
    setUpdatedDeviceIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
      timeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        switch (data.type) {
          case 'initial':
            if (data.devices) setDevices(data.devices);
            break;
          case 'device_update':
            if (data.device) {
              setDevices((prev) =>
                prev.map((d) => (d.id === data.device!.id ? data.device! : d))
              );
              setUpdatedDeviceIds((prev) => new Set(prev).add(data.device!.id));
              setTimeout(() => clearPulse(data.device!.id), 2000);
            }
            break;
          case 'device_add':
            if (data.device) {
              setDevices((prev) => [data.device!, ...prev]);
            }
            break;
          case 'device_delete':
            if (data.deviceId) {
              setDevices((prev) => prev.filter((d) => d.id !== data.deviceId));
            }
            break;
        }
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    wsRef.current = ws;
  }, [clearPulse]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [connect]);

  return { devices, updatedDeviceIds, connected };
};
