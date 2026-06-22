import { Router, Request, Response } from 'express';
import { SavedSetup } from '../types';
import { generateRecommendations } from './strategyService';
import { calculateStats } from '../garage/garageService';

const router = Router();

function getDefaultSetups(): SavedSetup[] {
  const presets = [
    {
      id: 'preset-speed',
      name: '极速直线方案',
      selection: {
        engine: 'engine-high-rev',
        tire: 'tire-hard',
        suspension: 'suspension-hard',
        wing: 'wing-low'
      }
    },
    {
      id: 'preset-corner',
      name: '弯道抓地方案',
      selection: {
        engine: 'engine-low-torque',
        tire: 'tire-soft',
        suspension: 'suspension-track',
        wing: 'wing-high'
      }
    },
    {
      id: 'preset-balanced',
      name: '综合平衡方案',
      selection: {
        engine: 'engine-balanced',
        tire: 'tire-slick',
        suspension: 'suspension-balanced',
        wing: 'wing-balanced'
      }
    },
    {
      id: 'preset-rain',
      name: '雨天湿地方案',
      selection: {
        engine: 'engine-balanced',
        tire: 'tire-rain',
        suspension: 'suspension-soft',
        wing: 'wing-high'
      }
    },
    {
      id: 'preset-offroad',
      name: '越野通过方案',
      selection: {
        engine: 'engine-turbo',
        tire: 'tire-rain',
        suspension: 'suspension-offroad',
        wing: 'wing-balanced'
      }
    }
  ];

  return presets.map(p => ({
    ...p,
    stats: calculateStats(p.selection),
    createdAt: Date.now()
  }));
}

router.post('/recommend', (req: Request, res: Response) => {
  const { trackId, setups } = req.body as { trackId: string; setups: SavedSetup[] };
  if (!trackId) {
    res.status(400).json({ success: false, error: 'Missing trackId' });
    return;
  }

  const userSetups = Array.isArray(setups) ? setups : [];
  const defaultSetups = getDefaultSetups();
  const recommendations = generateRecommendations(trackId, [...userSetups, ...defaultSetups]);

  res.json({ success: true, data: recommendations });
});

export default router;
