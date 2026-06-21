import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = 'poi-social-platform-secret-key-2024';

interface UserLocation {
  userId: string;
  nickname: string;
  avatarColor: string;
  lat: number;
  lng: number;
  viewport: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  lastUpdate: number;
}

interface ViewingPoiUser {
  userId: string;
  socketId: string;
  poiId: string;
}

const activeUsers = new Map<string, UserLocation>();
const viewingPoiUsers: ViewingPoiUser[] = [];
let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO 未初始化');
  }
  return ioInstance;
};

export const setupSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  ioInstance = io;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('未认证'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Token 无效'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`用户连接: ${userId}`);

    const user: any = db.prepare('SELECT id, nickname, avatar_color FROM users WHERE id = ?').get(userId);
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user_${userId}`);

    socket.on('update_viewport', (data: { minLat: number; maxLat: number; minLng: number; maxLng: number; centerLat: number; centerLng: number }) => {
      const { minLat, maxLat, minLng, maxLng, centerLat, centerLng } = data;

      activeUsers.set(userId, {
        userId,
        nickname: user.nickname,
        avatarColor: user.avatar_color,
        lat: centerLat,
        lng: centerLng,
        viewport: { minLat, maxLat, minLng, maxLng },
        lastUpdate: Date.now(),
      });

      broadcastFriendLocations(userId, io);
    });

    socket.on('view_poi', (poiId: string) => {
      const existingIndex = viewingPoiUsers.findIndex(u => u.userId === userId && u.socketId === socket.id);
      if (existingIndex >= 0) {
        const oldPoiId = viewingPoiUsers[existingIndex].poiId;
        if (oldPoiId !== poiId) {
          socket.leave(`poi_${oldPoiId}`);
          socket.join(`poi_${poiId}`);
        }
        viewingPoiUsers[existingIndex].poiId = poiId;
      } else {
        viewingPoiUsers.push({ userId, socketId: socket.id, poiId });
        socket.join(`poi_${poiId}`);
      }
    });

    socket.on('leave_poi', () => {
      const index = viewingPoiUsers.findIndex(u => u.userId === userId && u.socketId === socket.id);
      if (index >= 0) {
        const poiId = viewingPoiUsers[index].poiId;
        socket.leave(`poi_${poiId}`);
        viewingPoiUsers.splice(index, 1);
      }
    });

    socket.on('disconnect', () => {
      console.log(`用户断开: ${userId}`);
      activeUsers.delete(userId);

      const indices: number[] = [];
      viewingPoiUsers.forEach((u, i) => {
        if (u.userId === userId && u.socketId === socket.id) {
          indices.push(i);
        }
      });
      indices.reverse().forEach(i => viewingPoiUsers.splice(i, 1));

      broadcastFriendLocations(userId, io);
    });
  });

  return io;
};

const getFriends = (userId: string): string[] => {
  const friends: any[] = db.prepare(`
    SELECT following_id
    FROM friendships
    WHERE follower_id = ?
  `).all(userId);
  return friends.map(f => f.following_id);
};

const broadcastFriendLocations = (userId: string, io: SocketIOServer) => {
  const friends = getFriends(userId);
  const friendsReverse = getFollowers(userId);
  const allRelated = [...new Set([...friends, ...friendsReverse])];

  allRelated.forEach(relatedUserId => {
    const relatedSockets = getSocketsByUserId(relatedUserId, io);
    const friendLocations = getActiveFriendsForUser(relatedUserId);

    relatedSockets.forEach(socket => {
      socket.emit('friend_locations_update', friendLocations);
    });
  });
};

const getFollowers = (userId: string): string[] => {
  const followers: any[] = db.prepare(`
    SELECT follower_id
    FROM friendships
    WHERE following_id = ?
  `).all(userId);
  return followers.map(f => f.follower_id);
};

const getSocketsByUserId = (userId: string, io: SocketIOServer): Socket[] => {
  const sockets: Socket[] = [];
  io.sockets.sockets.forEach((socket) => {
    if ((socket as any).userId === userId) {
      sockets.push(socket);
    }
  });
  return sockets;
};

const getActiveFriendsForUser = (userId: string): UserLocation[] => {
  const friends = getFriends(userId);
  const activeFriends: UserLocation[] = [];

  friends.forEach(friendId => {
    const friend = activeUsers.get(friendId);
    if (friend) {
      activeFriends.push(friend);
    }
  });

  return activeFriends;
};

export const broadcastNewFeedEvent = (io: SocketIOServer, event: any) => {
  const { user_id: eventUserId } = event;

  const followers = getFollowers(eventUserId);

  followers.forEach(followerId => {
    const sockets = getSocketsByUserId(followerId, io);
    sockets.forEach(socket => {
      socket.emit('new_feed_event', event);
    });
  });
};

export const broadcastNewComment = (io: SocketIOServer, comment: any, poiId: string) => {
  const viewers = viewingPoiUsers.filter(u => u.poiId === poiId);

  viewers.forEach(viewer => {
    io.to(viewer.socketId).emit('new_comment', { comment, poiId });
  });
};

export { activeUsers, viewingPoiUsers };
