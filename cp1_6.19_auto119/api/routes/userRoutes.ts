import { Router, type Request, type Response } from 'express';
import * as userService from '../modules/user/userService.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderboard = await userService.getLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
