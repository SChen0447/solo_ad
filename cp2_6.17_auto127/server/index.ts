import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json());

interface User {
  id: string;
  nickname: string;
  color: string;
  roomCode: string;
  ws: WebSocket;
}

interface Selection {
  anchorOffset: number;
  focusOffset: number;
  anchorPath: number[];
  focusPath: number[];
}

interface SerializedSelection {
  anchorPath: number[];
  anchorOffset: number;
  focusPath: number[];
  focusOffset: number;
  isCollapsed: boolean;
}

interface UserCursor {
  userId: string;
  nickname: string;
  color: string;
  selection: Selection | null;
  position: { top: number; left: number } | null;
  serializedSelection?: SerializedSelection | null;
}

interface Comment {
  id: string;
  userId: string;
  nickname: string;
  color: string;
  content: string;
  startOffset: number;
  endOffset: number;
  text: string;
  anchorXPath: string;
  focusXPath: string;
  anchorNodeOffset: number;
  focusNodeOffset: number;
  createdAt: number;
}

interface Room {
  code: string;
  content: string;
  users: Map<string, User>;
  cursors: Map<string, UserCursor>;
  comments: Comment[];
  lastUpdate: number;
}

const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>();

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getOrCreateRoom(code: string): Room {
  let room = rooms.get(code);
  if (!room) {
    room = {
      code,
      content: '<p>开始你的故事创作...</p>',
      users: new Map(),
      cursors: new Map(),
      comments: [],
      lastUpdate: Date.now()
    };
    rooms.set(code, room);
  }
  return room;
}

function broadcastToRoom(room: Room, message: object, excludeUserId?: string) {
  room.users.forEach((user) => {
    if (user.ws.readyState === WebSocket.OPEN && user.id !== excludeUserId) {
      user.ws.send(JSON.stringify(message));
    }
  });
}

function getRoomUsersList(room: Room) {
  return Array.from(room.users.values()).map(u => ({
    id: u.id,
    nickname: u.nickname,
    color: u.color
  }));
}

app.post('/api/rooms/create', (req, res) => {
  const { nickname, color } = req.body;
  
  if (!nickname || nickname.length > 12) {
    return res.status(400).json({ error: '昵称必须在1-12字符之间' });
  }
  
  if (!PRESET_COLORS.includes(color)) {
    return res.status(400).json({ error: '无效的颜色选择' });
  }
  
  const code = generateRoomCode();
  const room = getOrCreateRoom(code);
  
  res.json({
    roomCode: code,
    content: room.content,
    comments: room.comments,
    users: getRoomUsersList(room)
  });
});

app.post('/api/rooms/join', (req, res) => {
  const { roomCode, nickname, color } = req.body;
  
  if (!nickname || nickname.length > 12) {
    return res.status(400).json({ error: '昵称必须在1-12字符之间' });
  }
  
  if (!PRESET_COLORS.includes(color)) {
    return res.status(400).json({ error: '无效的颜色选择' });
  }
  
  const code = roomCode.toUpperCase();
  if (!/^[A-Z]{6}$/.test(code)) {
    return res.status(400).json({ error: '房间码必须是6位大写字母' });
  }
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  
  res.json({
    roomCode: code,
    content: room.content,
    comments: room.comments,
    users: getRoomUsersList(room)
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let currentUser: User | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join': {
          const { roomCode, userId, nickname, color } = message;
          const code = roomCode.toUpperCase();
          const room = getOrCreateRoom(code);
          
          currentUser = {
            id: userId,
            nickname,
            color,
            roomCode: code,
            ws
          };
          
          room.users.set(userId, currentUser);
          userToRoom.set(userId, code);
          
          const cursor: UserCursor = {
            userId,
            nickname,
            color,
            selection: null,
            position: null
          };
          room.cursors.set(userId, cursor);
          
          ws.send(JSON.stringify({
            type: 'init',
            content: room.content,
            comments: room.comments,
            users: getRoomUsersList(room),
            cursors: Array.from(room.cursors.values()).filter(c => c.userId !== userId)
          }));
          
          broadcastToRoom(room, {
            type: 'user-join',
            user: { id: userId, nickname, color }
          }, userId);
          
          broadcastToRoom(room, {
            type: 'users-update',
            users: getRoomUsersList(room)
          });
          
          break;
        }
        
        case 'content-update': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomCode);
          if (!room) return;
          
          room.content = message.content;
          room.lastUpdate = Date.now();
          
          broadcastToRoom(room, {
            type: 'content-update',
            userId: currentUser.id,
            content: message.content
          }, currentUser.id);
          
          break;
        }
        
        case 'cursor-update': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomCode);
          if (!room) return;
          
          const cursor = room.cursors.get(currentUser.id);
          if (cursor) {
            cursor.selection = message.selection;
            cursor.position = message.position;
            cursor.serializedSelection = message.serializedSelection;
            
            broadcastToRoom(room, {
              type: 'cursor-update',
              cursor: {
                userId: cursor.userId,
                nickname: cursor.nickname,
                color: cursor.color,
                selection: cursor.selection,
                position: cursor.position,
                serializedSelection: cursor.serializedSelection
              }
            }, currentUser.id);
          }
          
          break;
        }
        
        case 'comment-add': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomCode);
          if (!room) return;
          
          const comment: Comment = {
            id: uuidv4(),
            userId: currentUser.id,
            nickname: currentUser.nickname,
            color: currentUser.color,
            content: message.content.substring(0, 200),
            startOffset: message.startOffset || 0,
            endOffset: message.endOffset || 0,
            text: message.text || '',
            anchorXPath: message.anchorXPath || '',
            focusXPath: message.focusXPath || '',
            anchorNodeOffset: message.anchorNodeOffset || 0,
            focusNodeOffset: message.focusNodeOffset || 0,
            createdAt: Date.now()
          };
          
          room.comments.push(comment);
          
          broadcastToRoom(room, {
            type: 'comment-add',
            comment
          });
          
          break;
        }
        
        case 'comment-delete': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomCode);
          if (!room) return;
          
          room.comments = room.comments.filter(c => c.id !== message.commentId);
          
          broadcastToRoom(room, {
            type: 'comment-delete',
            commentId: message.commentId
          });
          
          break;
        }
        
        case 'leave': {
          if (currentUser) {
            const room = rooms.get(currentUser.roomCode);
            if (room) {
              room.users.delete(currentUser.id);
              room.cursors.delete(currentUser.id);
              userToRoom.delete(currentUser.id);
              
              broadcastToRoom(room, {
                type: 'user-leave',
                userId: currentUser.id
              });
              
              broadcastToRoom(room, {
                type: 'users-update',
                users: getRoomUsersList(room)
              });
              
              if (room.users.size === 0) {
                rooms.delete(currentUser.roomCode);
              }
            }
            currentUser = null;
          }
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      const room = rooms.get(currentUser.roomCode);
      if (room) {
        room.users.delete(currentUser.id);
        room.cursors.delete(currentUser.id);
        userToRoom.delete(currentUser.id);
        
        broadcastToRoom(room, {
          type: 'user-leave',
          userId: currentUser.id
        });
        
        broadcastToRoom(room, {
          type: 'users-update',
          users: getRoomUsersList(room)
        });
        
        if (room.users.size === 0) {
          rooms.delete(currentUser.roomCode);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
