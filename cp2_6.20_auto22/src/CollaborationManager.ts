import { v4 as uuidv4 } from 'uuid';
import type { BrushPath, Point } from './CanvasCore';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline: boolean;
  lastActionAt: number;
  cursorPos?: Point;
  isActing: boolean;
  labelOpacity: number;
}

export interface ActionEvent {
  type: 'draw_start' | 'draw_move' | 'draw_end' | 'cursor_move';
  memberId: string;
  timestamp: number;
  data?: any;
}

type MemberListener = (members: Member[]) => void;
type PathListener = (path: Omit<BrushPath, 'animationProgress' | 'glowProgress' | 'isComplete'>) => void;

const MOCK_MEMBERS: Omit<Member, 'lastActionAt' | 'isActing' | 'labelOpacity'>[] = [
  { id: 'user-1', name: '张小明', avatar: '', color: '#0ea5e9', isOnline: true },
  { id: 'user-2', name: '李晓红', avatar: '', color: '#f43f5e', isOnline: true },
  { id: 'user-3', name: '王大伟', avatar: '', color: '#8b5cf6', isOnline: true },
  { id: 'user-4', name: '陈小芳', avatar: '', color: '#10b981', isOnline: true },
  { id: 'user-5', name: '刘志强', avatar: '', color: '#f59e0b', isOnline: true }
];

const LABEL_FADE_DELAY = 2000;
const LABEL_FADE_DURATION = 800;

function generateAvatar(seed: string, color: string, size: number = 80): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(seed.charAt(0), size / 2, size / 2);

  return canvas.toDataURL();
}

export class CollaborationManager {
  private members: Member[] = [];
  private currentUserId: string;
  private memberListeners: Set<MemberListener> = new Set();
  private pathListeners: Set<PathListener> = new Set();
  private mockIntervalId: number | null = null;
  private labelCheckIntervalId: number | null = null;

  constructor() {
    this.currentUserId = 'user-local-' + uuidv4().slice(0, 8);
    this.initMembers();
    this.startMockSimulation();
    this.startLabelFadeCheck();
  }

  private initMembers() {
    const now = Date.now();
    this.members = MOCK_MEMBERS.map(m => ({
      ...m,
      avatar: generateAvatar(m.name, m.color),
      lastActionAt: 0,
      isActing: false,
      labelOpacity: 0
    }));

    this.members.unshift({
      id: this.currentUserId,
      name: '我',
      avatar: generateAvatar('我', '#0ea5e9'),
      color: '#0ea5e9',
      isOnline: true,
      lastActionAt: now,
      isActing: false,
      labelOpacity: 0
    });
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getMembers(): Member[] {
    return [...this.members];
  }

  onMembersChange(listener: MemberListener): () => void {
    this.memberListeners.add(listener);
    listener(this.getMembers());
    return () => this.memberListeners.delete(listener);
  }

  onRemotePath(listener: PathListener): () => void {
    this.pathListeners.add(listener);
    return () => this.pathListeners.delete(listener);
  }

  broadcastAction(action: Omit<ActionEvent, 'timestamp' | 'memberId'>) {
    const member = this.members.find(m => m.id === this.currentUserId);
    if (member) {
      member.lastActionAt = Date.now();
      member.isActing = true;
      member.labelOpacity = 1;
      if (action.type === 'cursor_move' && action.data) {
        member.cursorPos = action.data;
      }
      this.notifyMembers();
    }
  }

  private notifyMembers() {
    const snapshot = this.getMembers();
    this.memberListeners.forEach(l => l(snapshot));
  }

  private notifyPath(path: Omit<BrushPath, 'animationProgress' | 'glowProgress' | 'isComplete'>) {
    this.pathListeners.forEach(l => l(path));
  }

  private startMockSimulation() {
    this.mockIntervalId = window.setInterval(() => {
      const remoteMembers = this.members.filter(m => m.id !== this.currentUserId && m.isOnline);
      if (remoteMembers.length === 0) return;

      const activeMember = remoteMembers[Math.floor(Math.random() * remoteMembers.length)];
      const action = Math.random();

      if (action < 0.6) {
        activeMember.cursorPos = {
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 600
        };
        activeMember.lastActionAt = Date.now();
        activeMember.isActing = true;
        activeMember.labelOpacity = 1;
      } else if (action < 0.9) {
        this.simulateRemoteDraw(activeMember);
        activeMember.lastActionAt = Date.now();
        activeMember.isActing = true;
        activeMember.labelOpacity = 1;
      }

      this.notifyMembers();
    }, 1500);
  }

  private simulateRemoteDraw(member: Member) {
    const startX = (Math.random() - 0.3) * 600;
    const startY = (Math.random() - 0.3) * 400;
    const points: Point[] = [];
    let x = startX;
    let y = startY;

    for (let i = 0; i < 8 + Math.floor(Math.random() * 12); i++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      points.push({ x, y });
    }

    setTimeout(() => {
      this.notifyPath({
        id: uuidv4(),
        points,
        color: member.color,
        thickness: 3 + Math.random() * 4,
        opacity: 0.8 + Math.random() * 0.2,
        createdAt: Date.now(),
        memberId: member.id
      });
    }, 100);
  }

  private startLabelFadeCheck() {
    this.labelCheckIntervalId = window.setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const member of this.members) {
        const timeSinceAction = now - member.lastActionAt;
        if (member.isActing && timeSinceAction > 100) {
          member.isActing = false;
          changed = true;
        }

        if (timeSinceAction > LABEL_FADE_DELAY && member.labelOpacity > 0) {
          const fadeProgress = Math.min(1, (timeSinceAction - LABEL_FADE_DELAY) / LABEL_FADE_DURATION);
          member.labelOpacity = Math.max(0, 1 - fadeProgress);
          changed = true;
        }
      }

      if (changed) {
        this.notifyMembers();
      }
    }, 50);
  }

  destroy() {
    if (this.mockIntervalId) clearInterval(this.mockIntervalId);
    if (this.labelCheckIntervalId) clearInterval(this.labelCheckIntervalId);
    this.memberListeners.clear();
    this.pathListeners.clear();
  }
}
