import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { store, User, Document, Version, Comment, Activity, CursorPosition, UserRole, ConflictData } from './store';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const PORT = process.env.PORT || 3001;

interface SocketData {
  userId?: string;
  currentDocId?: string;
  currentWorkspaceId?: string;
}

declare module 'socket.io' {
  interface Socket {
    data: SocketData;
  }
}

const userSockets = new Map<string, Set<string>>();

function addUserSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId) || new Set();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
}

function removeUserSocket(userId: string, socketId: string) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }
}

function isUserOnline(userId: string): boolean {
  return (userSockets.get(userId)?.size || 0) > 0;
}

function getOnlineMembers(workspaceId: string): string[] {
  const workspace = store.getWorkspace(workspaceId);
  if (!workspace) return [];
  return workspace.members
    .map((m) => m.userId)
    .filter((uid) => isUserOnline(uid));
}

function broadcastToWorkspace(workspaceId: string, event: string, data: any, excludeSocketId?: string) {
  const workspace = store.getWorkspace(workspaceId);
  if (!workspace) return;

  workspace.members.forEach((member) => {
    const sockets = userSockets.get(member.userId);
    if (sockets) {
      sockets.forEach((sid) => {
        if (sid !== excludeSocketId) {
          io.to(sid).emit(event, data);
        }
      });
    }
  });
}

function broadcastToDocument(documentId: string, event: string, data: any, excludeSocketId?: string) {
  const doc = store.getDocument(documentId);
  if (!doc) return;
  broadcastToWorkspace(doc.workspaceId, event, data, excludeSocketId);
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('user:login', (data: { name: string }, callback) => {
    try {
      const user = store.getOrCreateUser(data.name || '匿名用户', socket.id);
      socket.data.userId = user.id;
      addUserSocket(user.id, socket.id);

      const workspaces = store.getUserWorkspaces(user.id);

      callback?.({
        success: true,
        user,
        workspaces,
      });

      workspaces.forEach((ws) => {
        broadcastToWorkspace(ws.id, 'workspace:user-online', {
          userId: user.id,
          online: true,
          onlineMembers: getOnlineMembers(ws.id),
        });
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('workspace:create', (data: { name: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const workspace = store.createWorkspace(data.name, userId);
      const user = store.getUser(userId);

      callback?.({ success: true, workspace });

      addUserSocket(userId, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('workspace:join', (data: { inviteCode: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const workspace = store.joinWorkspace(data.inviteCode, userId, 'viewer');
      if (!workspace) {
        return callback?.({ success: false, error: '邀请码无效' });
      }

      const members = store.getWorkspaceMembersWithUsers(workspace.id);
      const docs = store.getWorkspaceDocuments(workspace.id);
      const activities = store.getActivities(workspace.id);

      callback?.({
        success: true,
        workspace,
        documents: docs,
        members,
        activities,
      });

      broadcastToWorkspace(workspace.id, 'workspace:member-joined', {
        userId,
        workspaceId: workspace.id,
        members: store.getWorkspaceMembersWithUsers(workspace.id),
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('workspace:enter', (data: { workspaceId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const workspace = store.getWorkspace(data.workspaceId);
      if (!workspace) return callback?.({ success: false, error: '工作空间不存在' });

      const isMember = workspace.members.some((m) => m.userId === userId);
      if (!isMember) return callback?.({ success: false, error: '无权访问' });

      socket.data.currentWorkspaceId = data.workspaceId;

      const members = store.getWorkspaceMembersWithUsers(data.workspaceId);
      const docs = store.getWorkspaceDocuments(data.workspaceId);
      const activities = store.getActivities(data.workspaceId);
      const onlineMembers = getOnlineMembers(data.workspaceId);

      callback?.({
        success: true,
        workspace,
        documents: docs,
        members,
        activities,
        onlineMembers,
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('workspace:update-role', (data: { workspaceId: string; targetUserId: string; role: UserRole }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const ok = store.updateMemberRole(data.workspaceId, userId, data.targetUserId, data.role);
      if (!ok) return callback?.({ success: false, error: '操作失败' });

      const members = store.getWorkspaceMembersWithUsers(data.workspaceId);
      callback?.({ success: true, members });

      broadcastToWorkspace(data.workspaceId, 'workspace:members-updated', { members });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('workspace:remove-member', (data: { workspaceId: string; targetUserId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const ok = store.removeMember(data.workspaceId, userId, data.targetUserId);
      if (!ok) return callback?.({ success: false, error: '操作失败' });

      const members = store.getWorkspaceMembersWithUsers(data.workspaceId);
      callback?.({ success: true, members });

      broadcastToWorkspace(data.workspaceId, 'workspace:members-updated', { members });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:create', (data: { workspaceId: string; title: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      if (!store.hasPermission(data.workspaceId, userId, 'editor')) {
        return callback?.({ success: false, error: '没有创建文档的权限' });
      }

      const doc = store.createDocument(data.workspaceId, userId, data.title || '未命名文档');
      const initialVersion = store.createVersion(doc.id, userId, '初始版本');

      callback?.({ success: true, document: doc, version: initialVersion });

      broadcastToWorkspace(data.workspaceId, 'document:created', {
        document: doc,
        documents: store.getWorkspaceDocuments(data.workspaceId),
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:open', (data: { documentId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'viewer')) {
        return callback?.({ success: false, error: '没有查看权限' });
      }

      socket.data.currentDocId = data.documentId;

      const versions = store.getVersions(data.documentId);
      const comments = store.getComments(data.documentId);
      const cursors = store.getDocumentCursors(data.documentId, userId);
      const role = store.getWorkspace(doc.workspaceId)?.members.find((m) => m.userId === userId)?.role || 'viewer';

      callback?.({
        success: true,
        document: doc,
        versions,
        comments,
        cursors,
        role,
      });

      store.startAutoSave(data.documentId, userId, () => {
        const currentDoc = store.getDocument(data.documentId);
        if (currentDoc) {
          const autoVersion = store.createVersion(data.documentId, userId, '自动保存');
          if (autoVersion) {
            const versions = store.getVersions(data.documentId);
            broadcastToDocument(data.documentId, 'version:created', {
              version: autoVersion,
              versions,
              documentId: data.documentId,
            });
          }
        }
      });

      broadcastToDocument(data.documentId, 'document:user-enter', {
        userId,
        documentId: data.documentId,
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:leave', (data: { documentId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: true });

      store.stopAutoSave(data.documentId);
      store.removeCursor(userId, data.documentId);
      if (socket.data.currentDocId === data.documentId) {
        socket.data.currentDocId = undefined;
      }

      callback?.({ success: true });

      broadcastToDocument(data.documentId, 'document:user-leave', {
        userId,
        documentId: data.documentId,
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:update-title', (data: { documentId: string; title: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'editor')) {
        return callback?.({ success: false, error: '没有编辑权限' });
      }

      const updated = store.updateDocumentTitle(data.documentId, data.title, userId);
      if (!updated) return callback?.({ success: false, error: '更新失败' });

      callback?.({ success: true, document: updated });

      broadcastToDocument(data.documentId, 'document:title-updated', {
        document: updated,
        documentId: data.documentId,
      }, socket.id);

      broadcastToWorkspace(doc.workspaceId, 'workspace:documents-updated', {
        documents: store.getWorkspaceDocuments(doc.workspaceId),
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:edit', (data: { documentId: string; content: string; delta: any }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'editor')) {
        return callback?.({ success: false, error: '没有编辑权限' });
      }

      const updated = store.updateDocument(data.documentId, data.content, data.delta, userId);
      if (!updated) return callback?.({ success: false, error: '更新失败' });

      callback?.({ success: true, document: updated, serverTimestamp: Date.now() });

      broadcastToDocument(data.documentId, 'document:content-updated', {
        content: data.content,
        delta: data.delta,
        documentId: data.documentId,
        userId,
        serverTimestamp: Date.now(),
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('document:delete', (data: { documentId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      const ok = store.deleteDocument(data.documentId, userId);
      if (!ok) return callback?.({ success: false, error: '删除失败或无权限' });

      callback?.({ success: true });

      broadcastToWorkspace(doc.workspaceId, 'workspace:documents-updated', {
        documents: store.getWorkspaceDocuments(doc.workspaceId),
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('cursor:update', (data: { documentId: string; index: number; length: number }) => {
    const { userId } = socket.data;
    if (!userId) return;

    const cursor = store.updateCursor(userId, data.documentId, data.index, data.length);
    const user = store.getUser(userId);

    broadcastToDocument(data.documentId, 'cursor:updated', {
      cursor,
      user,
      documentId: data.documentId,
    }, socket.id);
  });

  socket.on('version:create', (data: { documentId: string; message: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'editor')) {
        return callback?.({ success: false, error: '没有权限' });
      }

      const version = store.createVersion(data.documentId, userId, data.message);
      if (!version) return callback?.({ success: false, error: '创建版本失败' });

      const versions = store.getVersions(data.documentId);
      const activities = store.getActivities(doc.workspaceId);

      callback?.({ success: true, version, versions });

      broadcastToDocument(data.documentId, 'version:created', {
        version,
        versions,
        documentId: data.documentId,
      }, socket.id);

      broadcastToWorkspace(doc.workspaceId, 'workspace:activity-added', {
        activities,
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('version:rollback', (data: { documentId: string; versionId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'editor')) {
        return callback?.({ success: false, error: '没有权限' });
      }

      const result = store.rollbackToVersion(data.documentId, data.versionId, userId);
      if (!result) return callback?.({ success: false, error: '回滚失败' });

      const versions = store.getVersions(data.documentId);
      const activities = store.getActivities(doc.workspaceId);

      callback?.({
        success: true,
        document: result.document,
        version: result.version,
        versions,
      });

      broadcastToDocument(data.documentId, 'document:rollback', {
        document: result.document,
        content: result.document.content,
        delta: result.document.delta,
        versions,
        documentId: data.documentId,
        rolledBackVersion: result.version,
      }, socket.id);

      broadcastToWorkspace(doc.workspaceId, 'workspace:activity-added', { activities });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('comment:create', (data: { documentId: string; content: string; position?: number }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'commenter')) {
        return callback?.({ success: false, error: '没有评论权限' });
      }

      const comment = store.createComment(data.documentId, userId, data.content, data.position);
      if (!comment) return callback?.({ success: false, error: '创建评论失败' });

      const comments = store.getComments(data.documentId);
      const activities = store.getActivities(doc.workspaceId);

      callback?.({ success: true, comment, comments });

      broadcastToDocument(data.documentId, 'comment:created', {
        comment,
        comments,
        documentId: data.documentId,
      }, socket.id);

      broadcastToWorkspace(doc.workspaceId, 'workspace:activity-added', { activities });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('comment:reply', (data: { documentId: string; commentId: string; content: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.getDocument(data.documentId);
      if (!doc) return callback?.({ success: false, error: '文档不存在' });

      if (!store.hasPermission(doc.workspaceId, userId, 'commenter')) {
        return callback?.({ success: false, error: '没有评论权限' });
      }

      const comment = store.replyComment(data.documentId, data.commentId, userId, data.content);
      if (!comment) return callback?.({ success: false, error: '回复失败' });

      const comments = store.getComments(data.documentId);
      callback?.({ success: true, comment, comments });

      broadcastToDocument(data.documentId, 'comment:updated', {
        comment,
        comments,
        documentId: data.documentId,
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('comment:resolve', (data: { documentId: string; commentId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const comment = store.resolveComment(data.documentId, data.commentId, userId);
      if (!comment) return callback?.({ success: false, error: '操作失败' });

      const comments = store.getComments(data.documentId);
      callback?.({ success: true, comment, comments });

      broadcastToDocument(data.documentId, 'comment:updated', {
        comment,
        comments,
        documentId: data.documentId,
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('comment:unresolve', (data: { documentId: string; commentId: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const comment = store.unresolveComment(data.documentId, data.commentId);
      if (!comment) return callback?.({ success: false, error: '操作失败' });

      const comments = store.getComments(data.documentId);
      callback?.({ success: true, comment, comments });

      broadcastToDocument(data.documentId, 'comment:updated', {
        comment,
        comments,
        documentId: data.documentId,
      }, socket.id);
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('conflict:create', (data: Omit<ConflictData, 'id' | 'createdAt'>, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const conflict = store.createConflict(
        data.documentId, data.user1Id, data.user2Id,
        data.baseContent, data.user1Content, data.user2Content,
        data.rangeStart, data.rangeEnd
      );

      callback?.({ success: true, conflict });

      const otherUserId = conflict.user1Id === userId ? conflict.user2Id : conflict.user1Id;
      const sockets = userSockets.get(otherUserId);
      if (sockets) {
        sockets.forEach((sid) => {
          io.to(sid).emit('conflict:detected', { conflict });
        });
      }
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('conflict:resolve', (data: { conflictId: string; resolvedContent: string }, callback) => {
    try {
      const { userId } = socket.data;
      if (!userId) return callback?.({ success: false, error: '未登录' });

      const doc = store.resolveConflict(data.conflictId, data.resolvedContent, userId);
      if (!doc) return callback?.({ success: false, error: '解决冲突失败' });

      callback?.({ success: true, document: doc });

      broadcastToDocument(doc.id, 'conflict:resolved', {
        document: doc,
        content: doc.content,
        delta: doc.delta,
        documentId: doc.id,
        userId,
      });
    } catch (e: any) {
      callback?.({ success: false, error: e.message });
    }
  });

  socket.on('disconnecting', () => {
    const { userId, currentDocId, currentWorkspaceId } = socket.data;

    if (userId && currentDocId) {
      store.stopAutoSave(currentDocId);
      store.removeCursor(userId, currentDocId);
      broadcastToDocument(currentDocId, 'document:user-leave', {
        userId,
        documentId: currentDocId,
      });
    }

    if (userId) {
      removeUserSocket(userId, socket.id);

      if (currentWorkspaceId) {
        broadcastToWorkspace(currentWorkspaceId, 'workspace:user-online', {
          userId,
          online: isUserOnline(userId),
          onlineMembers: getOnlineMembers(currentWorkspaceId),
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

httpServer.listen(PORT, () => {
  console.log(`Collab Doc Server running on http://localhost:${PORT}`);
});
