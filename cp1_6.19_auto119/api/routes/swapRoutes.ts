import { Router, type Request, type Response } from 'express';
import * as swapService from '../modules/swap/swapService.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string | undefined;
    const status = req.query.status as string | undefined;
    const swaps = await swapService.getAll(userId, status);
    res.json({ success: true, data: swaps });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch swaps' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const swap = await swapService.getById(req.params.id);
    if (!swap) {
      res.status(404).json({ success: false, error: 'Swap not found' });
      return;
    }
    res.json({ success: true, data: swap });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch swap' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requesterId, bookOfferedId, bookRequestedId } = req.body;
    if (!requesterId || !bookOfferedId || !bookRequestedId) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }
    const swap = await swapService.create(requesterId, bookOfferedId, bookRequestedId);
    res.status(201).json({ success: true, data: swap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create swap';
    res.status(500).json({ success: false, error: message });
  }
});

router.patch('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const swap = await swapService.accept(req.params.id);
    res.json({ success: true, data: swap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept swap';
    res.status(500).json({ success: false, error: message });
  }
});

router.patch('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const swap = await swapService.reject(req.params.id);
    res.json({ success: true, data: swap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject swap';
    res.status(500).json({ success: false, error: message });
  }
});

router.patch('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const swap = await swapService.complete(req.params.id);
    res.json({ success: true, data: swap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete swap';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
