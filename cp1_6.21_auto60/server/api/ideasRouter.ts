import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import * as scoringService from '../services/scoringService';
import { CreateIdeaDTO, SubmitScoreDTO, SortType } from '../../shared/types';

let io: SocketIOServer | null = null;

export function setSocketServer(socketIo: SocketIOServer): void {
  io = socketIo;
}

const router = Router();

function broadcastRankingUpdate(): void {
  if (io) {
    const ranked = scoringService.getRankedIdeas();
    io.emit('rankingUpdate', ranked);
  }
}

function broadcastNewIdea(ideaId: string): void {
  if (io) {
    io.emit('newIdea', { ideaId });
  }
}

router.get('/', (req: Request, res: Response) => {
  const sortType = (req.query.sort as SortType) || 'score';
  const searchQuery = (req.query.search as string) || '';
  const ideas = scoringService.getAllIdeas(sortType, searchQuery);
  res.json(ideas);
});

router.get('/:id', (req: Request, res: Response) => {
  const idea = scoringService.getIdeaById(req.params.id);
  if (!idea) {
    res.status(404).json({ error: 'Idea not found' });
    return;
  }
  res.json(idea);
});

router.post('/', (req: Request, res: Response) => {
  const dto = req.body as CreateIdeaDTO;

  if (!dto.title || dto.title.length > 50) {
    res.status(400).json({ error: '标题不能为空且长度不超过50字' });
    return;
  }
  if (!dto.description || dto.description.length > 500) {
    res.status(400).json({ error: '描述不能为空且长度不超过500字' });
    return;
  }
  if (!dto.category) {
    res.status(400).json({ error: '请选择类别' });
    return;
  }

  const idea = scoringService.createIdea(dto);
  broadcastRankingUpdate();
  broadcastNewIdea(idea.id);
  res.status(201).json(idea);
});

router.post('/:id/score', (req: Request, res: Response) => {
  const dto = req.body as SubmitScoreDTO;

  if (
    dto.creativity < 1 || dto.creativity > 10 ||
    dto.feasibility < 1 || dto.feasibility > 10 ||
    dto.influence < 1 || dto.influence > 10
  ) {
    res.status(400).json({ error: '评分必须在1-10之间' });
    return;
  }

  const idea = scoringService.submitScore(req.params.id, dto);
  if (!idea) {
    res.status(404).json({ error: 'Idea not found' });
    return;
  }
  broadcastRankingUpdate();
  res.json(idea);
});

router.post('/:id/adopt', (req: Request, res: Response) => {
  const idea = scoringService.markAsAdopted(req.params.id);
  if (!idea) {
    res.status(404).json({ error: 'Idea not found' });
    return;
  }
  broadcastRankingUpdate();
  res.json(idea);
});

export default router;
