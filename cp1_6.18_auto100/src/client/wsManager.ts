import type { ScoreState, User, CursorInfo } from './types.js';
import { useStore } from './store.js';

type MessageType =
  | { type: 'join'; payload: { roomId: string; userName: string } }
  | { type: 'cursor'; payload: { cursor: CursorInfo | null } }
  | { type: 'scoreUpdate'; payload: { score: ScoreState } };

type ServerMessage =
  | { type: 'joined'; payload: { user: User; roomId: string; score: ScoreState; users: User[] } }
  | { type: 'userJoined'; payload: { user: User; users: User[] } }
  | { type: 'userLeft'; payload: { userId: string; users: User[]; leftUser: User } }
  | { type: 'cursorUpdate'; payload: { userId: string; cursor: CursorInfo | null; user?: User } }
  | { type: 'scoreUpdate'; payload: { score: ScoreState; fromUserId: string } }
  | { type: 'error'; payload: { message: string } };

class WSManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private cursorBroadcastTimer: number | null = null;
  private pendingCursor: CursorInfo | null = null;
  private lastScoreSnapshot: string | null = null;

  connect(roomId: string, userName: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.send({ type: 'join', payload: { roomId, userName } });
      this.startCursorBroadcast();
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg: ServerMessage = JSON.parse(evt.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('WS message parse error', e);
      }
    };

    this.ws.onclose = () => {
      this.stopCursorBroadcast();
    };

    this.ws.onerror = (err) => {
      console.error('WS error', err);
    };
  }

  disconnect() {
    this.stopCursorBroadcast();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.lastScoreSnapshot = null;
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'joined': {
        useStore.getState().joinRoom(
          msg.payload.roomId,
          msg.payload.user,
          msg.payload.score,
          msg.payload.users
        );
        break;
      }
      case 'userJoined': {
        useStore.getState().setUsers(msg.payload.users);
        useStore.getState().pushNotification(
          `${msg.payload.user.name} 加入了房间`,
          'join'
        );
        break;
      }
      case 'userLeft': {
        useStore.getState().setUsers(msg.payload.users);
        useStore.getState().setRemoteCursor(msg.payload.userId, null);
        useStore.getState().pushNotification(
          `${msg.payload.leftUser.name} 离开了房间`,
          'leave'
        );
        break;
      }
      case 'cursorUpdate': {
        useStore.getState().setRemoteCursor(msg.payload.userId, msg.payload.cursor);
        break;
      }
      case 'scoreUpdate': {
        const { score, fromUserId } = msg.payload;
        const state = useStore.getState();
        if (fromUserId !== state.currentUser?.id) {
          score.tracks.forEach((track) => {
            track.notes.forEach((note) => {
              state.markNoteJustUpdated(note.id);
            });
          });
          state.setScore(score);
        }
        break;
      }
      case 'error': {
        console.error('WS server error:', msg.payload.message);
        break;
      }
    }
  }

  private send(msg: MessageType) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendScore(score: ScoreState) {
    const snap = JSON.stringify(score);
    if (snap === this.lastScoreSnapshot) return;
    this.lastScoreSnapshot = snap;
    this.send({ type: 'scoreUpdate', payload: { score } });
  }

  setCursor(cursor: CursorInfo | null) {
    this.pendingCursor = cursor;
  }

  private startCursorBroadcast() {
    this.cursorBroadcastTimer = window.setInterval(() => {
      if (this.pendingCursor !== null) {
        this.send({ type: 'cursor', payload: { cursor: this.pendingCursor } });
      }
    }, 100);
  }

  private stopCursorBroadcast() {
    if (this.cursorBroadcastTimer !== null) {
      clearInterval(this.cursorBroadcastTimer);
      this.cursorBroadcastTimer = null;
    }
  }
}

export const wsManager = new WSManager();
