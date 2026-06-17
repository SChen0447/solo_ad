export type MessageHandler = (msg: any) => void;

let ws: WebSocket | null = null;
let messageHandler: MessageHandler | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentRoomId: string = '';
let currentNickname: string = '';

export function connect(roomId: string, nickname: string): void {
  currentRoomId = roomId;
  currentNickname = nickname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.hostname}:3001/ws`;

  if (ws) {
    ws.close();
  }

  ws = new WebSocket(url);

  ws.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    send({ type: 'join', roomId, nickname });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (messageHandler) {
        messageHandler(msg);
      }
    } catch {
      console.error('Failed to parse WebSocket message');
    }
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function send(msg: object): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function onMessage(handler: MessageHandler): void {
  messageHandler = handler;
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  currentRoomId = '';
  currentNickname = '';
}

function scheduleReconnect(): void {
  if (!currentRoomId) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(currentRoomId, currentNickname);
  }, 3000);
}
