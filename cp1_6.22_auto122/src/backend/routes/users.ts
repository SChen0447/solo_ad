import express from 'express';
import { store } from '../utils/store.js';

const router = express.Router();

router.get('/:id/stats', (req, res) => {
  try {
    const { id } = req.params;
    const stats = store.getUserStats(id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/bids', (req, res) => {
  try {
    const { id } = req.params;
    const bids = store.getUserBids(id);
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
