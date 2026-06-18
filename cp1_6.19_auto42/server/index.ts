import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface User {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

interface DrawElement {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  thickness: number;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

interface StickyNoteElement {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

type CanvasElement = DrawElement | StickyNoteElement | ImageElement;

interface WSMessage {
  type: string;
  payload: any;
}

const app = express();
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const users = new Map<string, User>();
const clients = new Map<string, WebSocket>();
let canvasElements: CanvasElement[] = [];

const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const adjectives = ['快乐的', '闪亮的', '温柔的', '勇敢的', '聪明的', '可爱的', '神秘的', '热情的', '冷静的', '活泼的'];
const nouns = ['小猫', '画家', '设计师', '诗人', '梦想家', '艺术家', '魔法师', '探险家', '创作者', '思想者'];

function generateRandomUser(): User {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  return {
    id: uuidv4(),
    nickname: `${adj}${noun}${num}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuidv4()}`,
    color,
  };
}

function broadcast(message: WSMessage, excludeId?: string) {
  const data = JSON.stringify(message);
  clients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  const user = generateRandomUser();
  users.set(user.id, user);
  clients.set(user.id, ws);

  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      user,
      users: Array.from(users.values()),
      elements: canvasElements,
    },
  }));

  broadcast({
    type: 'user_joined',
    payload: user,
  }, user.id);

  ws.on('message', (raw) => {
    try {
      const message: WSMessage = JSON.parse(raw.toString());

      switch (message.type) {
        case 'draw_stroke': {
          const element: DrawElement = {
            id: message.payload.id || uuidv4(),
            type: 'stroke',
            points: message.payload.points,
            color: message.payload.color,
            thickness: message.payload.thickness,
            userId: user.id,
            lastModifiedBy: user.id,
            modifiedAt: Date.now(),
          };
          const existingIdx = canvasElements.findIndex(e => e.id === element.id);
          if (existingIdx >= 0) {
            canvasElements[existingIdx] = element;
          } else {
            canvasElements.push(element);
          }
          broadcast({ type: 'draw_stroke', payload: element }, user.id);
          break;
        }
        case 'add_sticky': {
          const element: StickyNoteElement = {
            id: uuidv4(),
            type: 'sticky',
            x: message.payload.x,
            y: message.payload.y,
            width: 200,
            height: 160,
            text: message.payload.text || '',
            userId: user.id,
            lastModifiedBy: user.id,
            modifiedAt: Date.now(),
          };
          canvasElements.push(element);
          broadcast({ type: 'add_sticky', payload: element });
          break;
        }
        case 'update_sticky': {
          const idx = canvasElements.findIndex(e => e.id === message.payload.id);
          if (idx >= 0 && canvasElements[idx].type === 'sticky') {
            const sticky = canvasElements[idx] as StickyNoteElement;
            sticky.text = message.payload.text;
            sticky.x = message.payload.x ?? sticky.x;
            sticky.y = message.payload.y ?? sticky.y;
            sticky.lastModifiedBy = user.id;
            sticky.modifiedAt = Date.now();
            broadcast({ type: 'update_sticky', payload: sticky });
          }
          break;
        }
        case 'add_image': {
          const element: ImageElement = {
            id: uuidv4(),
            type: 'image',
            x: message.payload.x,
            y: message.payload.y,
            width: message.payload.width,
            height: message.payload.height,
            dataUrl: message.payload.dataUrl,
            userId: user.id,
            lastModifiedBy: user.id,
            modifiedAt: Date.now(),
          };
          canvasElements.push(element);
          broadcast({ type: 'add_image', payload: element });
          break;
        }
        case 'cursor': {
          broadcast({
            type: 'cursor',
            payload: { userId: user.id, x: message.payload.x, y: message.payload.y },
          }, user.id);
          break;
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  });

  ws.on('close', () => {
    users.delete(user.id);
    clients.delete(user.id);
    broadcast({
      type: 'user_left',
      payload: user.id,
    });
  });
});

app.get('/api/canvas', (req, res) => {
  res.json({ elements: canvasElements });
});

app.post('/api/canvas', (req, res) => {
  if (Array.isArray(req.body.elements)) {
    canvasElements = req.body.elements;
    broadcast({ type: 'canvas_synced', payload: { elements: canvasElements } });
    res.json({ success: true, count: canvasElements.length });
  } else {
    res.status(400).json({ error: 'Invalid format' });
  }
});

const PORT = 4001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
