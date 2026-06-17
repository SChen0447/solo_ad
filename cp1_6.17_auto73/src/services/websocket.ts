import type { Idea, Weights, WebSocketEventType } from '../types';

type MessageHandler = (data: unknown) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<WebSocketEventType, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isManualClose = false;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.isManualClose = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/updates`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const type = message.type as WebSocketEventType;
          const handlers = this.handlers.get(type);
          if (handlers) {
            handlers.forEach((handler) => handler(message.data));
          }
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };

      this.socket.onclose = () => {
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        }
      };
    } catch (error) {
      console.error('WebSocket连接失败:', error);
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on(eventType: WebSocketEventType, handler: MessageHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  onIdeaCreated(handler: (idea: Idea) => void): () => void {
    return this.on('idea_created', handler as MessageHandler);
  }

  onIdeaUpdated(handler: (idea: Idea) => void): () => void {
    return this.on('idea_updated', handler as MessageHandler);
  }

  onMatrixUpdated(handler: (idea: Idea) => void): () => void {
    return this.on('matrix_updated', handler as MessageHandler);
  }

  onWeightsUpdated(handler: (data: { weights: Weights; ideas: Idea[] }) => void): () => void {
    return this.on('weights_updated', handler as MessageHandler);
  }
}

export const wsService = new WebSocketService();
