export interface NodeData {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  traffic: number;
  latency: number;
}

export interface TrafficPacket {
  id: string;
  from: string;
  to: string;
  size: number;
  type: 'TCP' | 'UDP' | 'HTTP';
  timestamp: number;
  duration: number;
}

export interface TrafficData {
  nodes: NodeData[];
  traffic: TrafficPacket[];
}

export interface WSMessage {
  type: 'init' | 'traffic';
  nodes?: NodeData[];
  timestamp?: number;
  packets?: TrafficPacket[];
}

export interface Snapshot {
  timestamp: number;
  nodes: NodeData[];
  traffic: TrafficPacket[];
}

type EventHandler = (data: unknown) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }
}

export const eventBus = new EventBus();

class DataFetcher {
  private nodes: NodeData[] = [];
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async fetchNodes(): Promise<NodeData[]> {
    try {
      const res = await fetch('/data/endpoints');
      const data = await res.json();
      this.nodes = data as NodeData[];
      return this.nodes;
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      return [];
    }
  }

  async fetchTraffic(): Promise<TrafficData> {
    try {
      const res = await fetch('/data/traffic');
      const data = await res.json();
      return data as TrafficData;
    } catch (error) {
      console.error('Failed to fetch traffic:', error);
      return { nodes: [], traffic: [] };
    }
  }

  async fetchSnapshots(from: number, to: number): Promise<Snapshot[]> {
    try {
      const res = await fetch(`/data/snapshots?from=${from}&to=${to}`);
      const data = await res.json();
      return data as Snapshot[];
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
      return [];
    }
  }

  getNodes(): NodeData[] {
    return this.nodes;
  }

  connectWS(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.processMessage(msg);
        } catch (error) {
          console.error('Failed to parse WS message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.ws?.close();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWS();
    }, 3000);
  }

  private processMessage(msg: WSMessage): void {
    if (msg.type === 'init' && msg.nodes) {
      this.nodes = msg.nodes;
      eventBus.emit('nodes:init', msg.nodes);
    } else if (msg.type === 'traffic') {
      if (msg.nodes) {
        this.nodes = msg.nodes;
      }
      eventBus.emit('traffic:update', {
        timestamp: msg.timestamp,
        nodes: msg.nodes,
        packets: msg.packets || [],
      });
    }
  }

  disconnectWS(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const dataFetcher = new DataFetcher();
