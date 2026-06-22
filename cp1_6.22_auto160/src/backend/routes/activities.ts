import { Router, Request, Response } from 'express';
import { mockActivities, getActivityById } from '../data/mockData';
import { Activity, ActivityType, DifficultyLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

let activities: Activity[] = [...mockActivities];

interface FilterQuery {
  date?: string;
  type?: ActivityType;
  difficulty?: DifficultyLevel;
  page?: string;
  pageSize?: string;
}

router.get('/', (req: Request<{}, {}, {}, FilterQuery>, res: Response) => {
  const { date, type, difficulty, page = '1', pageSize = '20' } = req.query;
  
  let filtered = [...activities];
  
  if (date) {
    filtered = filtered.filter(a => a.date === date);
  }
  if (type) {
    filtered = filtered.filter(a => a.type === type);
  }
  if (difficulty) {
    filtered = filtered.filter(a => a.difficulty === difficulty);
  }
  
  const pageNum = parseInt(page, 10);
  const size = parseInt(pageSize, 10);
  const start = (pageNum - 1) * size;
  const paginated = filtered.slice(start, start + size);
  
  res.json({
    data: paginated,
    total: filtered.length,
    page: pageNum,
    pageSize: size
  });
});

router.get('/:id', (req: Request<{ id: string }>, res: Response) => {
  const activity = getActivityById(req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json(activity);
});

router.post('/', (req: Request<{}, {}, Omit<Activity, 'id'>>, res: Response) => {
  const newActivity: Activity = {
    ...req.body,
    id: uuidv4()
  };
  activities.push(newActivity);
  res.status(201).json(newActivity);
});

router.put('/:id', (req: Request<{ id: string }, {}, Partial<Activity>>, res: Response) => {
  const index = activities.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  activities[index] = { ...activities[index], ...req.body };
  res.json(activities[index]);
});

router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  const index = activities.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const deleted = activities.splice(index, 1);
  res.json(deleted[0]);
});

router.get('/:id/register', (req: Request<{ id: string }>, res: Response) => {
  const activity = getActivityById(req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  if (activity.registered >= activity.capacity) {
    res.status(400).json({ error: 'Activity is full' });
    return;
  }
  activity.registered++;
  res.json({ success: true, registered: activity.registered });
});

export default router;
