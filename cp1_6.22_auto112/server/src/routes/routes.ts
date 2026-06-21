import { Router, Request, Response } from 'express';
import { getRoutes, getRouteById, createRoute } from '../data/store';
import { RoutePoint } from '../types';

const router = Router();

function calculateDistance(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  
  let total = 0;
  const R = 6371;
  
  for (let i = 1; i < points.length; i++) {
    const dLat = (points[i].lat - points[i-1].lat) * Math.PI / 180;
    const dLng = (points[i].lng - points[i-1].lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(points[i-1].lat * Math.PI / 180) * Math.cos(points[i].lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    total += R * c;
  }
  
  return Math.round(total * 10) / 10;
}

function calculateElevationGain(points: RoutePoint[]): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = (points[i].elevation || 0) - (points[i-1].elevation || 0);
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

router.get('/', (_req: Request, res: Response) => {
  const routes = getRoutes();
  res.json({ routes });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const route = getRouteById(id);
  
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  
  res.json({ route });
});

router.post('/', (req: Request, res: Response) => {
  const { name, description, duration, difficulty, points, author } = req.body;
  
  if (!name || !points || points.length < 2) {
    res.status(400).json({ error: 'Name and at least 2 points are required' });
    return;
  }
  
  const distance = calculateDistance(points);
  const elevationGain = calculateElevationGain(points);
  
  const route = createRoute({
    name,
    description: description || '',
    distance,
    duration: duration || `${Math.ceil(distance / 4)}小时`,
    difficulty: difficulty || 'medium',
    points,
    elevationGain,
    author: author || '匿名用户'
  });
  
  res.status(201).json({ route });
});

export default router;
