import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { dataStore, Annotation } from './dataStore.js';

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    socket.on('join-song', (songId: string) => {
      socket.join(`song:${songId}`);
      console.log(`用户 ${socket.id} 加入曲目房间: ${songId}`);
    });

    socket.on('leave-song', (songId: string) => {
      socket.leave(`song:${songId}`);
      console.log(`用户 ${socket.id} 离开曲目房间: ${songId}`);
    });

    socket.on('annotation:add', async (data: { songId: string; partId: string; annotation: Omit<Annotation, 'id' | 'createdAt'> }) => {
      try {
        const annotation = await dataStore.addAnnotation(data.songId, data.partId, data.annotation);
        if (annotation) {
          io.to(`song:${data.songId}`).emit('annotation:added', {
            partId: data.partId,
            annotation,
          });
        }
      } catch (error) {
        console.error('添加注释失败:', error);
      }
    });

    socket.on('annotation:delete', async (data: { songId: string; partId: string; annotationId: string }) => {
      try {
        await dataStore.deleteAnnotation(data.songId, data.partId, data.annotationId);
        io.to(`song:${data.songId}`).emit('annotation:deleted', {
          partId: data.partId,
          annotationId: data.annotationId,
        });
      } catch (error) {
        console.error('删除注释失败:', error);
      }
    });

    socket.on('join-rehearsal', (rehearsalId: string) => {
      socket.join(`rehearsal:${rehearsalId}`);
      console.log(`用户 ${socket.id} 加入排练房间: ${rehearsalId}`);
    });

    socket.on('leave-rehearsal', (rehearsalId: string) => {
      socket.leave(`rehearsal:${rehearsalId}`);
      console.log(`用户 ${socket.id} 离开排练房间: ${rehearsalId}`);
    });

    socket.on('rehearsal:start', (data: { rehearsalId: string; startTime: number }) => {
      io.to(`rehearsal:${data.rehearsalId}`).emit('rehearsal:started', data);
    });

    socket.on('rehearsal:stop', (data: { rehearsalId: string }) => {
      io.to(`rehearsal:${data.rehearsalId}`).emit('rehearsal:stopped', data);
    });

    socket.on('rehearsal:tick', (data: { rehearsalId: string; elapsed: number; currentSongIndex: number }) => {
      socket.to(`rehearsal:${data.rehearsalId}`).emit('rehearsal:ticking', data);
    });

    socket.on('rehearsal:song-change', (data: { rehearsalId: string; songIndex: number }) => {
      io.to(`rehearsal:${data.rehearsalId}`).emit('rehearsal:song-changed', data);
    });

    socket.on('rehearsal:rating', (data: { rehearsalId: string; songId: string; score: number; feedback: string }) => {
      io.to(`rehearsal:${data.rehearsalId}`).emit('rehearsal:rating-received', data);
    });

    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
    });
  });

  return io;
}
