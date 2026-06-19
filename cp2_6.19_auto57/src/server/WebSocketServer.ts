import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  DrawingPath,
  StickyNote,
  WSMessage,
  CanvasSnapshot,
  HistoryState
} from '../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3001;

interface ClientMap {
  [key: string]: WebSocket;
}

const clients: ClientMap = {};

let canvasState: CanvasSnapshot = {
  paths: [],
  notes: []
};

const MAX_HISTORY = 50;
let history: HistoryState[] = [];
let historyIndex = -1;

function saveToHistory() {
  const state: HistoryState = {
    paths: JSON.parse(JSON.stringify(canvasState.paths)),
    notes: JSON.parse(JSON.stringify(canvasState.notes))
  };

  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }

  history.push(state);

  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
}

function broadcast(message: WSMessage, excludeId?: string) {
  const data = JSON.stringify(message);
  Object.entries(clients).forEach(([id, ws]) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendOnlineCount() {
  const count = Object.keys(clients).length;
  broadcast({
    type: 'online-count',
    payload: { count }
  });
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  clients[clientId] = ws;

  console.log(`Client connected: ${clientId}, total: ${Object.keys(clients).length}`);

  ws.send(
    JSON.stringify({
      type: 'snapshot',
      payload: {
        ...canvasState,
        clientId,
        historyIndex
      }
    })
  );

  sendOnlineCount();

  ws.on('message', (rawData: string) => {
    try {
      const message: WSMessage = JSON.parse(rawData);

      switch (message.type) {
        case 'draw-start':
        case 'draw-continue': {
          broadcast(message, clientId);
          break;
        }

        case 'draw-end': {
          const path = message.payload as DrawingPath;
          const existingIndex = canvasState.paths.findIndex((p) => p.id === path.id);
          if (existingIndex >= 0) {
            canvasState.paths[existingIndex] = path;
          } else {
            canvasState.paths.push(path);
          }
          saveToHistory();
          broadcast(message, clientId);
          break;
        }

        case 'add-note': {
          const note = message.payload as StickyNote;
          canvasState.notes.push(note);
          saveToHistory();
          broadcast(message, clientId);
          break;
        }

        case 'update-note': {
          const note = message.payload as StickyNote;
          const idx = canvasState.notes.findIndex((n) => n.id === note.id);
          if (idx >= 0) {
            canvasState.notes[idx] = note;
            saveToHistory();
          }
          broadcast(message, clientId);
          break;
        }

        case 'delete-note': {
          const noteId = message.payload as string;
          canvasState.notes = canvasState.notes.filter((n) => n.id !== noteId);
          saveToHistory();
          broadcast(message, clientId);
          break;
        }

        case 'clear-canvas': {
          canvasState = { paths: [], notes: [] };
          saveToHistory();
          broadcast(message, clientId);
          break;
        }

        case 'undo': {
          if (historyIndex > 0) {
            historyIndex--;
            canvasState = {
              paths: JSON.parse(JSON.stringify(history[historyIndex].paths)),
              notes: JSON.parse(JSON.stringify(history[historyIndex].notes))
            };
            broadcast({
              type: 'snapshot',
              payload: {
                ...canvasState,
                historyIndex
              }
            });
          }
          break;
        }

        case 'redo': {
          if (historyIndex < history.length - 1) {
            historyIndex++;
            canvasState = {
              paths: JSON.parse(JSON.stringify(history[historyIndex].paths)),
              notes: JSON.parse(JSON.stringify(history[historyIndex].notes))
            };
            broadcast({
              type: 'snapshot',
              payload: {
                ...canvasState,
                historyIndex
              }
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    delete clients[clientId];
    console.log(`Client disconnected: ${clientId}, total: ${Object.keys(clients).length}`);
    sendOnlineCount();
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: Object.keys(clients).length });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  saveToHistory();
});
