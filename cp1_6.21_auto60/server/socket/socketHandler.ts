import { Server as SocketIOServer, Socket } from 'socket.io';
import * as scoringService from '../services/scoringService';

export function initSocketHandler(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    const initialRanking = scoringService.getRankedIdeas();
    socket.emit('rankingUpdate', initialRanking);

    socket.on('requestRanking', () => {
      const ranked = scoringService.getRankedIdeas();
      socket.emit('rankingUpdate', ranked);
    });

    socket.on('disconnect', () => {
      void socket.id;
    });
  });
}
