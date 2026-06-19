import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSMessage, Stroke, Shape, Note } from '../src/types.js';

interface ClientWS extends WebSocket {
  isAlive?: boolean;
}

const HEX_COLOR_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const CANVAS_BOUND = 100000;
const MIN_WIDTH = 1;
const MAX_WIDTH = 8;
const VALID_SHAPE_TYPES = new Set(['rect', 'circle']);

function isValidShape(payload: unknown): payload is Shape {
  if (!payload || typeof payload !== 'object') return false;
  const s = payload as Record<string, unknown>;
  if (typeof s.id !== 'string' || s.id.length === 0) return false;
  if (typeof s.type !== 'string' || !VALID_SHAPE_TYPES.has(s.type)) return false;
  if (typeof s.startX !== 'number' || !Number.isFinite(s.startX)) return false;
  if (typeof s.startY !== 'number' || !Number.isFinite(s.startY)) return false;
  if (typeof s.endX !== 'number' || !Number.isFinite(s.endX)) return false;
  if (typeof s.endY !== 'number' || !Number.isFinite(s.endY)) return false;
  if (Math.abs(s.startX) > CANVAS_BOUND || Math.abs(s.endX) > CANVAS_BOUND) return false;
  if (Math.abs(s.startY) > CANVAS_BOUND || Math.abs(s.endY) > CANVAS_BOUND) return false;
  if (typeof s.color !== 'string' || !HEX_COLOR_RE.test(s.color)) return false;
  if (typeof s.width !== 'number' || !Number.isInteger(s.width)) return false;
  if (s.width < MIN_WIDTH || s.width > MAX_WIDTH) return false;
  return true;
}

function isValidStroke(payload: unknown): payload is Stroke {
  if (!payload || typeof payload !== 'object') return false;
  const s = payload as Record<string, unknown>;
  if (typeof s.id !== 'string' || s.id.length === 0) return false;
  if (!Array.isArray(s.points) || s.points.length < 2) return false;
  for (const p of s.points as unknown[]) {
    if (!p || typeof p !== 'object') return false;
    const pt = p as Record<string, unknown>;
    if (typeof pt.x !== 'number' || !Number.isFinite(pt.x)) return false;
    if (typeof pt.y !== 'number' || !Number.isFinite(pt.y)) return false;
    if (Math.abs(pt.x) > CANVAS_BOUND || Math.abs(pt.y) > CANVAS_BOUND) return false;
  }
  if (typeof s.color !== 'string' || !HEX_COLOR_RE.test(s.color)) return false;
  if (typeof s.width !== 'number' || !Number.isInteger(s.width)) return false;
  if (s.width < MIN_WIDTH || s.width > MAX_WIDTH) return false;
  return true;
}

export class WhiteboardWebSocketServer {
  private wss: WSServer;
  private strokes: Stroke[] = [];
  private shapes: Shape[] = [];
  private notes: Note[] = [];

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: ClientWS) => {
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      this.sendToClient(ws, {
        type: 'snapshot',
        payload: { strokes: this.strokes, shapes: this.shapes, notes: this.notes },
      });

      this.broadcastUserCount();

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          if (this.handleMessage(message, ws)) {
            this.broadcast(message, ws);
          }
        } catch (e) {
          console.error('Invalid message:', e);
        }
      });

      ws.on('close', () => {
        setTimeout(() => this.broadcastUserCount(), 100);
      });
    });

    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: ClientWS) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  private handleMessage(message: WSMessage, sender: ClientWS): boolean {
    switch (message.type) {
      case 'stroke-add': {
        if (!isValidStroke(message.payload)) {
          console.warn('Rejected invalid stroke-add payload');
          return false;
        }
        this.strokes.push(message.payload as Stroke);
        return true;
      }
      case 'shape-add': {
        if (!isValidShape(message.payload)) {
          console.warn('Rejected invalid shape-add payload');
          return false;
        }
        this.shapes.push(message.payload as Shape);
        return true;
      }
      case 'note-add':
        this.notes.push(message.payload as Note);
        return true;
      case 'note-move': {
        const moveNote = message.payload as { id: string; x: number; y: number };
        const noteM = this.notes.find(n => n.id === moveNote.id);
        if (noteM) { noteM.x = moveNote.x; noteM.y = moveNote.y; }
        return true;
      }
      case 'note-edit': {
        const editNote = message.payload as { id: string; text: string };
        const noteE = this.notes.find(n => n.id === editNote.id);
        if (noteE) noteE.text = editNote.text;
        return true;
      }
      case 'note-delete': {
        const delNote = message.payload as { id: string };
        this.notes = this.notes.filter(n => n.id !== delNote.id);
        return true;
      }
      case 'note-color': {
        const colorNote = message.payload as { id: string; color: string };
        const noteC = this.notes.find(n => n.id === colorNote.id);
        if (noteC) noteC.color = colorNote.color as Note['color'];
        return true;
      }
      case 'clear':
        this.strokes = [];
        this.shapes = [];
        this.notes = [];
        return true;
      default:
        return false;
    }
  }

  private sendToClient(ws: ClientWS, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: WSMessage, sender?: ClientWS) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach((client: ClientWS) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private broadcastUserCount() {
    const count = this.wss.clients.size;
    const message: WSMessage = { type: 'user-count', payload: count };
    const data = JSON.stringify(message);
    this.wss.clients.forEach((client: ClientWS) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
