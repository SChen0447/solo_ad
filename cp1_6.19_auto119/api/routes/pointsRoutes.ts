import { Router, type Request, type Response } from 'express';
import * as pointsService from '../modules/points/pointsService.js';

const router = Router();

router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await pointsService.getByUserId(req.params.userId);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch points transactions' });
  }
});

export default router;
