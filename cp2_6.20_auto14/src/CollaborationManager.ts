import { v4 as uuidv4 } from 'uuid';
import type { Path, Point } from './CanvasCore';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline: boolean;
  lastActive: number;
  cursor: Point | null;
  isDrawing: boolean;
  currentPathId: string | null;
  showNameTag: boolean;
  nameTagOpacity: number;
}

type EventHandler = (...args: any[]) => void;

export class CollaborationManager {
  private members: Map<string, Member> = new Map();
  private currentUserId: string;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private simulationInterval: number | null = null;
  private nameTagTimers: Map<string, number> = new Map();

  private mockUsers = [
    { name: '张小明', color: '#0ea5e9', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang' },
    { name: '李小红', color: '#f43f5e', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li' },
    { name: '王小华', color: '#a855f7', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang' },
    { name: '陈小强', color: '#22c55e', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen' },
    { name: '刘小芳', color: '#f59e0b', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liu' },
  ];

  constructor(currentUserId: string, currentUserName: string = '我') {
    this.currentUserId = currentUserId;

    this.addMember({
      id: currentUserId,
      name: currentUserName,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      color: '#0ea5e9',
      isOnline: true,
      lastActive: Date.now(),
      cursor: null,
      isDrawing: false,
      currentPathId: null,
      showNameTag: false,
      nameTagOpacity: 0,
    });

    this.simulateOtherUsers();
  }

  private addMember(member: Member): void {
    this.members.set(member.id, member);
    this.emit('member-joined', member);
  }

  private simulateOtherUsers(): void {
    const numUsers = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...this.mockUsers].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numUsers && i < shuffled.length; i++) {
      const user = shuffled[i];
      const userId = uuidv4();
      setTimeout(() => {
        this.addMember({
          id: userId,
          name: user.name,
          avatar: user.avatar,
          color: user.color,
          isOnline: true,
          lastActive: Date.now(),
          cursor: { x: Math.random() * 800, y: Math.random() * 600 },
          isDrawing: false,
          currentPathId: null,
          showNameTag: false,
          nameTagOpacity: 0,
        });
        this.startUserSimulation(userId);
      }, (i + 1) * 1000);
    }
  }

  private startUserSimulation(userId: string): void {
    const simulateAction = () => {
      const member = this.members.get(userId);
      if (!member || !member.isOnline) return;

      const action = Math.random();

      if (action < 0.6) {
        const newCursor = {
          x: (member.cursor?.x || 400) + (Math.random() - 0.5) * 100,
          y: (member.cursor?.y || 300) + (Math.random() - 0.5) * 100,
        };
        member.cursor = {
          x: Math.max(50, Math.min(1200, newCursor.x)),
          y: Math.max(50, Math.min(800, newCursor.y)),
        };
        member.lastActive = Date.now();
        this.showMemberNameTag(userId);
        this.emit('cursor-moved', userId, member.cursor);
      } else if (action < 0.85 && !member.isDrawing) {
        this.startSimulatedDrawing(userId);
      }

      this.emit('members-updated', this.getMembers());
    };

    const interval = setInterval(simulateAction, 800 + Math.random() * 1200);
    (window as any).simulationIntervals = (window as any).simulationIntervals || [];
    (window as any).simulationIntervals.push(interval);
  }

  private startSimulatedDrawing(userId: string): void {
    const member = this.members.get(userId);
    if (!member) return;

    member.isDrawing = true;
    const pathId = uuidv4();
    member.currentPathId = pathId;
    member.lastActive = Date.now();
    this.showMemberNameTag(userId);

    const startPoint = member.cursor || { x: 200, y: 200 };
    const path: Path = {
      id: pathId,
      points: [{ ...startPoint }],
      color: member.color,
      width: 2 + Math.random() * 3,
      opacity: 0.9,
      userId: userId,
      createdAt: Date.now(),
      glowProgress: 0,
      isComplete: false,
    };

    this.emit('path-started', path);

    let pointCount = 0;
    const maxPoints = 15 + Math.floor(Math.random() * 20);
    let angle = Math.random() * Math.PI * 2;

    const drawPoint = () => {
      const m = this.members.get(userId);
      if (!m || !m.isDrawing || pointCount >= maxPoints) {
        path.isComplete = true;
        path.glowProgress = 0;
        member.isDrawing = false;
        member.currentPathId = null;
        this.emit('path-completed', path);
        this.emit('members-updated', this.getMembers());
        return;
      }

      angle += (Math.random() - 0.5) * 0.8;
      const distance = 10 + Math.random() * 20;
      const newPoint = {
        x: path.points[path.points.length - 1].x + Math.cos(angle) * distance,
        y: path.points[path.points.length - 1].y + Math.sin(angle) * distance,
      };

      path.points.push(newPoint);
      m.cursor = { ...newPoint };
      m.lastActive = Date.now();
      pointCount++;

      this.emit('path-updated', path);
      this.emit('cursor-moved', userId, m.cursor);
      this.emit('members-updated', this.getMembers());

      setTimeout(drawPoint, 50 + Math.random() * 100);
    };

    drawPoint();
  }

  public showMemberNameTag(memberId: string): void {
    const member = this.members.get(memberId);
    if (!member) return;

    member.showNameTag = true;
    member.nameTagOpacity = 1;

    const existingTimer = this.nameTagTimers.get(memberId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.fadeOutNameTag(memberId);
    }, 2000);

    this.nameTagTimers.set(memberId, timer);
    this.emit('members-updated', this.getMembers());
  }

  private fadeOutNameTag(memberId: string): void {
    const member = this.members.get(memberId);
    if (!member) return;

    const startTime = Date.now();
    const duration = 800;
    const startOpacity = 1;

    const animate = () => {
      const m = this.members.get(memberId);
      if (!m) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      m.nameTagOpacity = startOpacity * (1 - progress);

      if (progress >= 1) {
        m.showNameTag = false;
        m.nameTagOpacity = 0;
      } else {
        requestAnimationFrame(animate);
      }

      this.emit('members-updated', this.getMembers());
    };

    requestAnimationFrame(animate);
  }

  public updateCurrentUserCursor(point: Point): void {
    const member = this.members.get(this.currentUserId);
    if (member) {
      member.cursor = point;
      member.lastActive = Date.now();
      this.emit('cursor-moved', this.currentUserId, point);
    }
  }

  public broadcastPath(path: Path): void {
    this.showMemberNameTag(this.currentUserId);
    this.emit('path-broadcast', path);
  }

  public getMembers(): Member[] {
    return Array.from(this.members.values()).filter(m => m.isOnline);
  }

  public getMember(id: string): Member | undefined {
    return this.members.get(id);
  }

  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  public on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  public destroy(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    for (const timer of this.nameTagTimers.values()) {
      clearTimeout(timer);
    }
    this.nameTagTimers.clear();
    this.listeners.clear();
  }
}
