import type { Server as IOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { cookingSessions, getUserByToken } from './store';
import type { CookingSession } from './types';

interface StartCookingPayload {
  recipeId: string;
  recipeTitle: string;
  stepId: string;
  stepName: string;
  duration: number;
  token: string;
}

interface JoinSessionPayload {
  sessionId: string;
}

export function setupSocket(io: IOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.emit('active_sessions', getActiveSessions());

    socket.on('start_cooking', (payload: StartCookingPayload) => {
      const user = getUserByToken(payload.token);
      if (!user) {
        socket.emit('error', { message: '未授权' });
        return;
      }

      const existingSession = Array.from(cookingSessions.values()).find(
        (s) =>
          s.userId === user.id &&
          s.recipeId === payload.recipeId &&
          s.stepId === payload.stepId &&
          s.isActive
      );

      if (existingSession) {
        socket.emit('session_updated', existingSession);
        return;
      }

      const session: CookingSession = {
        id: uuidv4(),
        recipeId: payload.recipeId,
        recipeTitle: payload.recipeTitle,
        stepId: payload.stepId,
        stepName: payload.stepName,
        startTime: Date.now(),
        duration: payload.duration,
        remainingTime: payload.duration,
        userId: user.id,
        userName: user.username,
        isActive: true,
        viewers: [socket.id],
      };

      cookingSessions.set(session.id, session);
      socket.join(session.id);

      io.emit('session_started', session);
      socket.emit('session_started', session);

      const timerInterval = setInterval(() => {
        const s = cookingSessions.get(session.id);
        if (!s || !s.isActive) {
          clearInterval(timerInterval);
          return;
        }

        const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
        const remaining = Math.max(0, s.duration - elapsed);
        s.remainingTime = remaining;

        if (remaining <= 0) {
          s.isActive = false;
          clearInterval(timerInterval);
          io.to(session.id).emit('timer_finished', {
            sessionId: session.id,
            recipeTitle: s.recipeTitle,
            stepName: s.stepName,
          });
          io.emit('session_ended', { sessionId: session.id });
          cookingSessions.delete(session.id);
        } else {
          io.to(session.id).emit('timer_tick', {
            sessionId: session.id,
            remainingTime: remaining,
          });
        }
      }, 1000);
    });

    socket.on('join_session', (payload: JoinSessionPayload) => {
      const session = cookingSessions.get(payload.sessionId);
      if (!session || !session.isActive) {
        socket.emit('error', { message: '会话不存在或已结束' });
        return;
      }

      socket.join(session.id);
      if (!session.viewers.includes(socket.id)) {
        session.viewers.push(socket.id);
      }

      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const remaining = Math.max(0, session.duration - elapsed);

      socket.emit('session_joined', {
        ...session,
        remainingTime: remaining,
      });
    });

    socket.on('leave_session', (payload: JoinSessionPayload) => {
      const session = cookingSessions.get(payload.sessionId);
      if (session) {
        socket.leave(session.id);
        session.viewers = session.viewers.filter((id) => id !== socket.id);
      }
    });

    socket.on('get_active_sessions', () => {
      socket.emit('active_sessions', getActiveSessions());
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      cookingSessions.forEach((session) => {
        session.viewers = session.viewers.filter((id) => id !== socket.id);
      });
    });
  });
}

function getActiveSessions(): CookingSession[] {
  return Array.from(cookingSessions.values())
    .filter((s) => s.isActive)
    .map((s) => {
      const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
      const remaining = Math.max(0, s.duration - elapsed);
      return { ...s, remainingTime: remaining };
    })
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 20);
}
