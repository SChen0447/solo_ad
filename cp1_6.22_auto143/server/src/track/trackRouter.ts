import { Router, Request, Response } from 'express';
import { CarStats } from '../types';
import { tracks, calculateTrackMatch } from './trackService';

const router = Router();

router.get('/list', (_req: Request, res: Response) => {
  res.json({ success: true, data: tracks });
});

router.post('/calculate', (req: Request, res: Response) => {
  const { trackId, stats } = req.body as { trackId: string; stats: CarStats };
  if (!trackId || !stats) {
    res.status(400).json({ success: false, error: 'Missing trackId or stats' });
    return;
  }
  const result = calculateTrackMatch(trackId, stats);
  if (!result) {
    res.status(404).json({ success: false, error: 'Track not found' });
    return;
  }
  res.json({ success: true, data: result });
});

export default router;
