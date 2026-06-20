import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';

export type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  socketId?: string;
}

export interface WorkspaceMember {
  userId: string;
  role: UserRole;
  joinedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  members: WorkspaceMember[];
  documentIds: string[];
  inviteCode: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  delta: any;
  createdAt: number;
  updatedAt: number;
  lastEditorId: string;
  version: number;
}

export interface Version {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  delta: any;
  createdBy: string;
  createdAt: number;
  message: string;
  changes?: string;
}

export interface CommentReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  position?: number;
  createdAt: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  replies: CommentReply[];
}

export interface Activity {
  id: string;
  workspaceId: string;
  userId: string;
  type: 'edit' | 'comment' | 'version' | 'rollback' | 'permission';
  documentId?: string;
  content?: string;
  position?: number;
  createdAt: number;
}

export interface CursorPosition {
  userId: string;
  documentId: string;
  index: number;
  length: number;
  timestamp: number;
}

export interface ConflictData {
  id: string;
  documentId: string;
  user1Id: string;
  user2Id: string;
  baseContent: string;
  user1Content: string;
  user2Content: string;
  rangeStart: number;
  rangeEnd: number;
  createdAt: number;
}

class MemoryStore {
  private users: Map<string, User> = new Map();
  private workspaces: Map<string, Workspace> = new Map();
  private documents: Map<string, Document> = new Map();
  private versions: Map<string, Version[]> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private activities: Map<string, Activity[]> = new Map();
  private cursors: Map<string, Map<string, CursorPosition>> = new Map();
  private conflicts: Map<string, ConflictData> = new Map();
  private inviteToWorkspace: Map<string, string> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly USER_COLORS = [
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#E67E22', '#34495E', '#FF6B6B', '#4ECDC4',
  ];

  private readonly DEFAULT_DOC_CONTENT = `
    <h1>欢迎使用协作文档</h1>
    <p>这是一个支持多人实时协作的在线文档平台。您可以：</p>
    <ul>
      <li>实时编辑文档，查看其他用户的光标位置</li>
      <li>创建版本快照，随时回滚到历史版本</li>
      <li>添加评论，与团队成员讨论</li>
      <li>管理工作空间权限</li>
    </ul>
    <h2>开始使用</h2>
    <p>邀请您的团队成员加入工作空间，开始协作吧！</p>
  `;

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const user1: User = {
      id: 'user-demo-1',
      name: '张三',
      avatar: 'Z',
      color: this.USER_COLORS[0],
    };
    const user2: User = {
      id: 'user-demo-2',
      name: '李四',
      avatar: 'L',
      color: this.USER_COLORS[1],
    };
    const user3: User = {
      id: 'user-demo-3',
      name: '王五',
      avatar: 'W',
      color: this.USER_COLORS[2],
    };

    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
    this.users.set(user3.id, user3);

    const workspaceId = uuidv4();
    const inviteCode = this.generateInviteCode();

    const workspace: Workspace = {
      id: workspaceId,
      name: '产品团队工作空间',
      ownerId: user1.id,
      createdAt: Date.now(),
      members: [
        { userId: user1.id, role: 'owner', joinedAt: Date.now() },
        { userId: user2.id, role: 'editor', joinedAt: Date.now() },
        { userId: user3.id, role: 'commenter', joinedAt: Date.now() },
      ],
      documentIds: [],
      inviteCode,
    };

    this.workspaces.set(workspaceId, workspace);
    this.inviteToWorkspace.set(inviteCode, workspaceId);

    const doc1 = this.createDocument(workspaceId, user1.id, '产品需求文档');
    const doc2 = this.createDocument(workspaceId, user1.id, '版本规划');

    workspace.documentIds = [doc1.id, doc2.id];

    this.createVersion(doc1.id, user1.id, '初始版本');
    this.createVersion(doc2.id, user1.id, '初始版本');

    this.addActivity(workspaceId, user1.id, 'edit', doc1.id, '创建了产品需求文档');
    this.addActivity(workspaceId, user1.id, 'edit', doc2.id, '创建了版本规划');
  }

  generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getOrCreateUser(name: string, socketId: string): User {
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.name === name
    );
    if (existingUser) {
      existingUser.socketId = socketId;
      return existingUser;
    }

    const usedColors = Array.from(this.users.values()).map((u) => u.color);
    const availableColors = this.USER_COLORS.filter((c) => !usedColors.includes(c));
    const color = availableColors[0] || this.USER_COLORS[this.users.size % this.USER_COLORS.length];

    const user: User = {
      id: uuidv4(),
      name,
      avatar: name.charAt(0).toUpperCase(),
      color,
      socketId,
    };
    this.users.set(user.id, user);
    return user;
  }

  setUserSocket(userId: string, socketId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.socketId = socketId;
    }
  }

  createWorkspace(name: string, ownerId: string): Workspace {
    const id = uuidv4();
    const inviteCode = this.generateInviteCode();
    const workspace: Workspace = {
      id,
      name,
      ownerId,
      createdAt: Date.now(),
      members: [{ userId: ownerId, role: 'owner', joinedAt: Date.now() }],
      documentIds: [],
      inviteCode,
    };
    this.workspaces.set(id, workspace);
    this.inviteToWorkspace.set(inviteCode, id);
    this.activities.set(id, []);
    return workspace;
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getWorkspaceByInviteCode(inviteCode: string): Workspace | undefined {
    const id = this.inviteToWorkspace.get(inviteCode.toUpperCase());
    return id ? this.workspaces.get(id) : undefined;
  }

  getUserWorkspaces(userId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter((ws) =>
      ws.members.some((m) => m.userId === userId)
    );
  }

  joinWorkspace(inviteCode: string, userId: string, role: UserRole = 'viewer'): Workspace | null {
    const workspace = this.getWorkspaceByInviteCode(inviteCode);
    if (!workspace) return null;

    const existingMember = workspace.members.find((m) => m.userId === userId);
    if (!existingMember) {
      workspace.members.push({ userId, role, joinedAt: Date.now() });
      this.addActivity(workspace.id, userId, 'permission', undefined, `加入了工作空间`);
    }
    return workspace;
  }

  updateMemberRole(workspaceId: string, userId: string, targetUserId: string, role: UserRole): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const operator = workspace.members.find((m) => m.userId === userId);
    if (!operator || (operator.role !== 'owner' && operator.role !== 'editor')) return false;
    if (targetUserId === workspace.ownerId) return false;

    const target = workspace.members.find((m) => m.userId === targetUserId);
    if (target) {
      target.role = role;
      const user = this.getUser(targetUserId);
      this.addActivity(workspaceId, userId, 'permission', undefined,
        `将 ${user?.name || '用户'} 的权限修改为${this.roleLabel(role)}`);
      return true;
    }
    return false;
  }

  removeMember(workspaceId: string, userId: string, targetUserId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const operator = workspace.members.find((m) => m.userId === userId);
    if (!operator || operator.role !== 'owner') return false;
    if (targetUserId === workspace.ownerId) return false;

    const idx = workspace.members.findIndex((m) => m.userId === targetUserId);
    if (idx >= 0) {
      const user = this.getUser(targetUserId);
      workspace.members.splice(idx, 1);
      this.addActivity(workspaceId, userId, 'permission', undefined,
        `移除了 ${user?.name || '用户'}`);
      return true;
    }
    return false;
  }

  hasPermission(workspaceId: string, userId: string, required: UserRole): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const member = workspace.members.find((m) => m.userId === userId);
    if (!member) return false;

    const hierarchy: Record<UserRole, number> = {
      owner: 4,
      editor: 3,
      commenter: 2,
      viewer: 1,
    };
    return hierarchy[member.role] >= hierarchy[required];
  }

  roleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      owner: '所有者',
      editor: '编辑者',
      commenter: '评论者',
      viewer: '查看者',
    };
    return labels[role];
  }

  createDocument(workspaceId: string, userId: string, title: string): Document {
    const id = uuidv4();
    const doc: Document = {
      id,
      workspaceId,
      title,
      content: this.DEFAULT_DOC_CONTENT,
      delta: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastEditorId: userId,
      version: 1,
    };
    this.documents.set(id, doc);
    this.versions.set(id, []);
    this.comments.set(id, []);
    this.cursors.set(id, new Map());

    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.documentIds.push(id);
    }
    return doc;
  }

  getDocument(documentId: string): Document | undefined {
    return this.documents.get(documentId);
  }

  getWorkspaceDocuments(workspaceId: string): Document[] {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return [];
    return workspace.documentIds
      .map((id) => this.documents.get(id))
      .filter((d): d is Document => !!d);
  }

  updateDocument(documentId: string, content: string, delta: any, userId: string): Document | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    doc.content = content;
    doc.delta = delta;
    doc.updatedAt = Date.now();
    doc.lastEditorId = userId;

    return doc;
  }

  updateDocumentTitle(documentId: string, title: string, userId: string): Document | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    doc.title = title;
    doc.updatedAt = Date.now();
    doc.lastEditorId = userId;
    return doc;
  }

  deleteDocument(documentId: string, userId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    if (!this.hasPermission(doc.workspaceId, userId, 'editor')) return false;

    const workspace = this.workspaces.get(doc.workspaceId);
    if (workspace) {
      workspace.documentIds = workspace.documentIds.filter((id) => id !== documentId);
    }
    this.documents.delete(documentId);
    this.versions.delete(documentId);
    this.comments.delete(documentId);
    this.cursors.delete(documentId);
    return true;
  }

  createVersion(documentId: string, userId: string, message: string = ''): Version | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const versionList = this.versions.get(documentId) || [];
    const versionNumber = versionList.length + 1;

    const version: Version = {
      id: uuidv4(),
      documentId,
      versionNumber,
      title: doc.title,
      content: doc.content,
      delta: doc.delta,
      createdBy: userId,
      createdAt: Date.now(),
      message: message || `版本 ${versionNumber}`,
    };

    versionList.push(version);
    this.versions.set(documentId, versionList);
    doc.version = versionNumber;

    const user = this.getUser(userId);
    this.addActivity(doc.workspaceId, userId, 'version', documentId,
      `保存了版本 ${versionNumber}：${version.message}`);

    return version;
  }

  getVersions(documentId: string): Version[] {
    const list = this.versions.get(documentId) || [];
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  getVersion(documentId: string, versionId: string): Version | undefined {
    const list = this.versions.get(documentId) || [];
    return list.find((v) => v.id === versionId);
  }

  rollbackToVersion(documentId: string, versionId: string, userId: string): { document: Document; version: Version } | null {
    const version = this.getVersion(documentId, versionId);
    const doc = this.documents.get(documentId);
    if (!version || !doc) return null;

    doc.content = version.content;
    doc.delta = version.delta;
    doc.title = version.title;
    doc.updatedAt = Date.now();
    doc.lastEditorId = userId;

    const newVersion = this.createVersion(documentId, userId, `回滚到版本 ${version.versionNumber}`);
    if (newVersion) {
      doc.version = newVersion.versionNumber;
    }

    const user = this.getUser(userId);
    this.addActivity(doc.workspaceId, userId, 'rollback', documentId,
      `回滚到版本 ${version.versionNumber}`);

    return { document: doc, version };
  }

  createComment(documentId: string, authorId: string, content: string, position?: number): Comment | null {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const comment: Comment = {
      id: uuidv4(),
      documentId,
      authorId,
      content,
      position,
      createdAt: Date.now(),
      resolved: false,
      replies: [],
    };

    const list = this.comments.get(documentId) || [];
    list.push(comment);
    this.comments.set(documentId, list);

    const user = this.getUser(authorId);
    this.addActivity(doc.workspaceId, authorId, 'comment', documentId,
      `添加了一条评论：${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`, position);

    return comment;
  }

  getComments(documentId: string): Comment[] {
    const list = this.comments.get(documentId) || [];
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  replyComment(documentId: string, commentId: string, authorId: string, content: string): Comment | null {
    const list = this.comments.get(documentId) || [];
    const comment = list.find((c) => c.id === commentId);
    if (!comment) return null;

    comment.replies.push({
      id: uuidv4(),
      authorId,
      content,
      createdAt: Date.now(),
    });
    return comment;
  }

  resolveComment(documentId: string, commentId: string, userId: string): Comment | null {
    const list = this.comments.get(documentId) || [];
    const comment = list.find((c) => c.id === commentId);
    if (!comment) return null;

    comment.resolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = Date.now();
    return comment;
  }

  unresolveComment(documentId: string, commentId: string): Comment | null {
    const list = this.comments.get(documentId) || [];
    const comment = list.find((c) => c.id === commentId);
    if (!comment) return null;

    comment.resolved = false;
    comment.resolvedBy = undefined;
    comment.resolvedAt = undefined;
    return comment;
  }

  addActivity(workspaceId: string, userId: string, type: Activity['type'],
              documentId?: string, content?: string, position?: number): Activity {
    const activity: Activity = {
      id: uuidv4(),
      workspaceId,
      userId,
      type,
      documentId,
      content,
      position,
      createdAt: Date.now(),
    };

    const list = this.activities.get(workspaceId) || [];
    list.unshift(activity);
    if (list.length > 200) list.pop();
    this.activities.set(workspaceId, list);
    return activity;
  }

  getActivities(workspaceId: string, limit: number = 50): Activity[] {
    const list = this.activities.get(workspaceId) || [];
    return list.slice(0, limit);
  }

  updateCursor(userId: string, documentId: string, index: number, length: number): CursorPosition {
    const docCursors = this.cursors.get(documentId) || new Map();
    const cursor: CursorPosition = {
      userId,
      documentId,
      index,
      length,
      timestamp: Date.now(),
    };
    docCursors.set(userId, cursor);
    this.cursors.set(documentId, docCursors);
    return cursor;
  }

  getDocumentCursors(documentId: string, excludeUserId?: string): CursorPosition[] {
    const docCursors = this.cursors.get(documentId);
    if (!docCursors) return [];
    const now = Date.now();
    return Array.from(docCursors.values())
      .filter((c) => c.userId !== excludeUserId && now - c.timestamp < 30000);
  }

  removeCursor(userId: string, documentId: string): void {
    const docCursors = this.cursors.get(documentId);
    if (docCursors) {
      docCursors.delete(userId);
    }
  }

  createConflict(documentId: string, user1Id: string, user2Id: string,
                 baseContent: string, user1Content: string, user2Content: string,
                 rangeStart: number, rangeEnd: number): ConflictData {
    const conflict: ConflictData = {
      id: uuidv4(),
      documentId,
      user1Id,
      user2Id,
      baseContent,
      user1Content,
      user2Content,
      rangeStart,
      rangeEnd,
      createdAt: Date.now(),
    };
    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  getConflict(conflictId: string): ConflictData | undefined {
    return this.conflicts.get(conflictId);
  }

  resolveConflict(conflictId: string, resolvedContent: string, resolverUserId: string): Document | null {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return null;

    const doc = this.documents.get(conflict.documentId);
    if (!doc) return null;

    doc.content = resolvedContent;
    doc.updatedAt = Date.now();
    doc.lastEditorId = resolverUserId;

    this.conflicts.delete(conflictId);
    return doc;
  }

  startAutoSave(documentId: string, userId: string, onSave: () => void): void {
    this.stopAutoSave(documentId);
    const timer = setInterval(() => {
      onSave();
    }, 5 * 60 * 1000);
    this.autoSaveTimers.set(documentId, timer);
  }

  stopAutoSave(documentId: string): void {
    const timer = this.autoSaveTimers.get(documentId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(documentId);
    }
  }

  getWorkspaceMembersWithUsers(workspaceId: string): Array<{ user: User; role: UserRole; joinedAt: number }> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return [];
    return workspace.members
      .map((m) => {
        const user = this.users.get(m.userId);
        return user ? { user, role: m.role, joinedAt: m.joinedAt } : null;
      })
      .filter((m): m is { user: User; role: UserRole; joinedAt: number } => !!m);
  }
}

export const store = new MemoryStore();
export type Store = MemoryStore;
