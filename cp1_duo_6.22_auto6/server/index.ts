import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { groupNotes } from './brainstormEngine.js';

interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  userId: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

interface CanvasState {
  notes: StickyNote[];
  connections: Connection[];
}

interface Snapshot {
  id: string;
  timestamp: number;
  state: CanvasState;
}

interface WSMessage {
  type: string;
  payload: unknown;
}

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let canvasState: CanvasState = { notes: [], connections: [] };
const snapshots: Snapshot[] = [];
const clients = new Map<string, { ws: WebSocket; userId: string; color: string }>();

const USER_COLORS = [
  '#00e5ff', '#7c4dff', '#ff4081', '#69f0ae',
  '#ffab40', '#18ffff', '#ea80fc', '#b2ff59',
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function broadcast(message: WSMessage, excludeUserId?: string) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function saveSnapshot() {
  const snapshot: Snapshot = {
    id: uuidv4(),
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(canvasState)),
  };
  snapshots.push(snapshot);
  if (snapshots.length > 20) {
    snapshots.shift();
  }
}

setInterval(saveSnapshot, 30000);

app.post('/api/snapshots', (_req, res) => {
  res.json(snapshots);
});

app.post('/api/group', (req, res) => {
  const { texts } = req.body as { texts: string[] };
  if (!texts || !Array.isArray(texts)) {
    res.status(400).json({ error: 'texts must be a string array' });
    return;
  }
  const result = groupNotes(texts);
  res.json(result);
});

wss.on('connection', (ws) => {
  const userId = uuidv4();
  const color = getRandomColor();
  clients.set(userId, { ws, userId, color });

  ws.send(JSON.stringify({
    type: 'init',
    payload: { state: canvasState, userId, color },
  }));

  broadcast({ type: 'user_joined', payload: { userId, color } }, userId);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as WSMessage;

      switch (msg.type) {
        case 'add_note': {
          const note = msg.payload as StickyNote;
          note.id = note.id || uuidv4();
          note.userId = userId;
          canvasState.notes.push(note);
          broadcast({ type: 'note_added', payload: note });
          break;
        }
        case 'update_note': {
          const updated = msg.payload as StickyNote;
          const idx = canvasState.notes.findIndex((n) => n.id === updated.id);
          if (idx !== -1) {
            canvasState.notes[idx] = { ...canvasState.notes[idx], ...updated };
            broadcast({ type: 'note_updated', payload: canvasState.notes[idx] });
          }
          break;
        }
        case 'delete_note': {
          const { id } = msg.payload as { id: string };
          canvasState.notes = canvasState.notes.filter((n) => n.id !== id);
          canvasState.connections = canvasState.connections.filter(
            (c) => c.fromId !== id && c.toId !== id
          );
          broadcast({ type: 'note_deleted', payload: { id } });
          break;
        }
        case 'move_note': {
          const moveData = msg.payload as { id: string; x: number; y: number };
          const noteIdx = canvasState.notes.findIndex((n) => n.id === moveData.id);
          if (noteIdx !== -1) {
            canvasState.notes[noteIdx].x = moveData.x;
            canvasState.notes[noteIdx].y = moveData.y;
            broadcast({ type: 'note_moved', payload: moveData }, userId);
          }
          break;
        }
        case 'add_connection': {
          const conn = msg.payload as Connection;
          conn.id = conn.id || uuidv4();
          canvasState.connections.push(conn);
          broadcast({ type: 'connection_added', payload: conn });
          break;
        }
        case 'delete_connection': {
          const { id: connId } = msg.payload as { id: string };
          canvasState.connections = canvasState.connections.filter((c) => c.id !== connId);
          broadcast({ type: 'connection_deleted', payload: { id: connId } });
          break;
        }
        case 'request_snapshot': {
          const snap: Snapshot = {
            id: uuidv4(),
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(canvasState)),
          };
          ws.send(JSON.stringify({ type: 'snapshot', payload: snap }));
          break;
        }
        case 'request_group': {
          const { texts } = msg.payload as { texts: string[] };
          const result = groupNotes(texts);
          ws.send(JSON.stringify({ type: 'group_result', payload: result }));
          break;
        }
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    clients.delete(userId);
    broadcast({ type: 'user_left', payload: { userId } });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  saveSnapshot();
});
