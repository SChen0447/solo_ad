import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WSMessage, Stroke, Shape, Note } from '../src/types.js';

interface ClientWS extends WebSocket {
  isAlive?: boolean;
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
          this.handleMessage(message, ws);
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

  private handleMessage(message: WSMessage, sender: ClientWS) {
    switch (message.type) {
      case 'stroke-add':
        this.strokes.push(message.payload as Stroke);
        break;
      case 'shape-add':
        this.shapes.push(message.payload as Shape);
        break;
      case 'note-add':
        this.notes.push(message.payload as Note);
        break;
      case 'note-move': {
        const moveNote = message.payload as { id: string; x: number; y: number };
        const noteM = this.notes.find(n => n.id === moveNote.id);
        if (noteM) { noteM.x = moveNote.x; noteM.y = moveNote.y; }
        break;
      }
      case 'note-edit': {
        const editNote = message.payload as { id: string; text: string };
        const noteE = this.notes.find(n => n.id === editNote.id);
        if (noteE) noteE.text = editNote.text;
        break;
      }
      case 'note-delete': {
        const delNote = message.payload as { id: string };
        this.notes = this.notes.filter(n => n.id !== delNote.id);
        break;
      }
      case 'note-color': {
        const colorNote = message.payload as { id: string; color: string };
        const noteC = this.notes.find(n => n.id === colorNote.id);
        if (noteC) noteC.color = colorNote.color as Note['color'];
        break;
      }
      case 'clear':
        this.strokes = [];
        this.shapes = [];
        this.notes = [];
        break;
    }

    this.broadcast(message, sender);
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
