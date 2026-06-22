import { v4 as uuidv4 } from 'uuid';
import { User } from './types';

const AVATAR_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#4ade80',
  '#34d399',
  '#2dd4bf',
  '#22d3ee',
  '#38bdf8',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb7185'
];

const ADJECTIVES = ['快乐的', '聪明的', '勇敢的', '可爱的', '温柔的', '活泼的', '冷静的', '热情的', '幽默的', '认真的'];
const NOUNS = ['小猫', '小狗', '小熊', '小兔', '小鹿', '小象', '小狐狸', '小松鼠', '小企鹅', '小海豚'];

class UserManager {
  private users: Map<string, User> = new Map();
  private boardUsers: Map<string, Set<string>> = new Map();

  generateRandomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
  }

  getRandomColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  createUser(): User {
    const userId = uuidv4();
    const token = uuidv4();
    const user: User = {
      id: userId,
      name: this.generateRandomName(),
      avatarColor: this.getRandomColor(),
      token,
      boardId: null,
      socketId: null
    };
    this.users.set(userId, user);
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  verifyToken(token: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.token === token);
  }

  updateUserName(userId: string, newName: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;
    user.name = newName;
    return user;
  }

  joinBoard(userId: string, boardId: string, socketId: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    if (user.boardId && user.boardId !== boardId) {
      this.leaveBoard(userId);
    }

    user.boardId = boardId;
    user.socketId = socketId;

    if (!this.boardUsers.has(boardId)) {
      this.boardUsers.set(boardId, new Set());
    }
    this.boardUsers.get(boardId)!.add(userId);

    return user;
  }

  leaveBoard(userId: string): void {
    const user = this.users.get(userId);
    if (!user || !user.boardId) return;

    const boardUsers = this.boardUsers.get(user.boardId);
    if (boardUsers) {
      boardUsers.delete(userId);
      if (boardUsers.size === 0) {
        this.boardUsers.delete(user.boardId);
      }
    }

    user.boardId = null;
    user.socketId = null;
  }

  getBoardUsers(boardId: string): User[] {
    const userIds = this.boardUsers.get(boardId);
    if (!userIds) return [];
    return Array.from(userIds)
      .map(id => this.users.get(id))
      .filter((u): u is User => u !== undefined);
  }

  getBoardUserCount(boardId: string): number {
    const userIds = this.boardUsers.get(boardId);
    return userIds ? userIds.size : 0;
  }

  removeUser(userId: string): void {
    this.leaveBoard(userId);
    this.users.delete(userId);
  }

  getUserBySocketId(socketId: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.socketId === socketId);
  }
}

export const userManager = new UserManager();
