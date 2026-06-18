interface RoomUser {
  id: string;
  name: string;
  color: string;
  role: 'owner' | 'collaborator';
  socketId: string;
}

interface Room {
  projectId: string;
  ownerId: string;
  users: Map<string, RoomUser>;
}

const COLLABORATOR_COLORS = ['#ff6b6b', '#2ed573', '#ffa502', '#1e90ff', '#a29bfe', '#fd79a8', '#00cec9', '#e17055'];

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToUser: Map<string, { projectId: string; userId: string }> = new Map();

  addUser(projectId: string, user: Omit<RoomUser, 'color'> & { color?: string }): RoomUser {
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, {
        projectId,
        ownerId: user.id,
        users: new Map(),
      });
    }

    const room = this.rooms.get(projectId)!;
    const existingUser = room.users.get(user.id);
    if (existingUser) {
      existingUser.socketId = user.socketId;
      return existingUser;
    }

    const color = user.color || this.assignColor(room.users.size);
    const role = room.users.size === 0 ? 'owner' : 'collaborator';
    const roomUser: RoomUser = {
      id: user.id,
      name: user.name,
      color,
      role,
      socketId: user.socketId,
    };

    room.users.set(user.id, roomUser);
    this.socketToUser.set(user.socketId, { projectId, userId: user.id });

    return roomUser;
  }

  removeUser(projectId: string, userId: string): RoomUser | null {
    const room = this.rooms.get(projectId);
    if (!room) return null;

    const user = room.users.get(userId);
    if (!user) return null;

    room.users.delete(userId);
    this.socketToUser.delete(user.socketId);

    if (room.users.size === 0) {
      this.rooms.delete(projectId);
    }

    return user;
  }

  removeUserBySocketId(projectId: string, socketId: string): RoomUser | null {
    const room = this.rooms.get(projectId);
    if (!room) return null;

    for (const [userId, user] of room.users) {
      if (user.socketId === socketId) {
        room.users.delete(userId);
        this.socketToUser.delete(socketId);
        if (room.users.size === 0) {
          this.rooms.delete(projectId);
        }
        return user;
      }
    }
    return null;
  }

  getUser(projectId: string, userId: string): RoomUser | null {
    return this.rooms.get(projectId)?.users.get(userId) || null;
  }

  getUsers(projectId: string): RoomUser[] {
    return Array.from(this.rooms.get(projectId)?.users.values() || []);
  }

  getUserColor(projectId: string, userId: string): string {
    const room = this.rooms.get(projectId);
    if (!room) return COLLABORATOR_COLORS[0];
    const user = room.users.get(userId);
    if (user) return user.color;
    return this.assignColor(room.users.size);
  }

  isOwner(projectId: string, userId: string): boolean {
    const room = this.rooms.get(projectId);
    return room?.ownerId === userId;
  }

  getUserProjects(socketId: string): string[] {
    const entry = this.socketToUser.get(socketId);
    if (!entry) return [];
    return [entry.projectId];
  }

  private assignColor(index: number): string {
    return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
  }
}
