import { io, Socket } from 'socket.io-client';

export interface BidUpdate {
  id: string;
  currentPrice: number;
  bidCount: number;
  currentBidder: string;
  timestamp: number;
}

export interface BidMessage {
  itemId: string;
  bidder: string;
  amount: number;
}

export interface BidResponse {
  success: boolean;
  message: string;
  update?: BidUpdate;
}

type BidUpdateCallback = (update: BidUpdate) => void;
type BidResponseCallback = (response: BidResponse) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private currentItemId: string | null = null;
  private bidUpdateListeners: Set<BidUpdateCallback> = new Set();

  connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      if (this.currentItemId) {
        this.joinRoom(this.currentItemId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });

    this.socket.on('bid_update', (update: BidUpdate) => {
      this.bidUpdateListeners.forEach((cb) => {
        try {
          cb(update);
        } catch (e) {
          console.error('[WebSocket] Listener error:', e);
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.bidUpdateListeners.clear();
    this.currentItemId = null;
  }

  joinRoom(itemId: string): void {
    if (this.currentItemId && this.currentItemId !== itemId && this.socket) {
      this.socket.emit('leave_room', this.currentItemId);
    }
    this.currentItemId = itemId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', itemId);
    }
  }

  leaveRoom(itemId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room', itemId);
    }
    if (this.currentItemId === itemId) {
      this.currentItemId = null;
    }
  }

  onBidUpdate(callback: BidUpdateCallback): () => void {
    this.bidUpdateListeners.add(callback);
    return () => {
      this.bidUpdateListeners.delete(callback);
    };
  }

  sendBid(message: BidMessage, callback?: BidResponseCallback): void {
    if (!this.socket || !this.socket.connected) {
      if (callback) {
        callback({
          success: false,
          message: 'WebSocket未连接，请稍后重试',
        });
      }
      return;
    }

    if (callback) {
      this.socket.once('bid_response', callback);
    }

    this.socket.emit('place_bid', message);
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  getCurrentItemId(): string | null {
    return this.currentItemId;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
