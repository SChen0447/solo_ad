import { useEffect, useRef, useState, useCallback } from 'react';
import type { ExchangeResponse } from '../utils/api';

export type WSMessageType = 
  | { type: 'exchange_request'; data: ExchangeResponse }
  | { type: 'exchange_accepted'; data: ExchangeResponse }
  | { type: 'exchange_rejected'; data: ExchangeResponse }
  | { type: 'crop_wilted'; data: { plotId: string; cropName: string } }
  | { type: 'crop_mature'; data: { plotId: string; cropName: string } };

export function useWebSocket(userId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<WSMessageType[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:3001`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'auth', userId }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessageType;
        setMessages((prev) => [...prev, message]);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [userId]);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId, connect]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    messages,
    clearMessages,
  };
}
