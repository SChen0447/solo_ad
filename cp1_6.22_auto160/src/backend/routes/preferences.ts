import { Router, Request, Response } from 'express';
import { mockActivities, getActivityById } from '../data/mockData';
import { detectConflictsWithList } from '../services/conflictDetector';
import { UserPreference, Recommendation, Activity } from '../types';

const router = Router();

const userPreferences: Map<string, UserPreference> = new Map();

const defaultUserId = 'default-user';

if (!userPreferences.has(defaultUserId)) {
  userPreferences.set(defaultUserId, {
    userId: defaultUserId,
    bookedActivityIds: [],
    favoriteTags: []
  });
}

router.get('/:userId', (req: Request<{ userId: string }>, res: Response) => {
  const pref = userPreferences.get(req.params.userId) || {
    userId: req.params.userId,
    bookedActivityIds: [],
    favoriteTags: []
  };
  res.json(pref);
});

router.put('/:userId', (req: Request<{ userId: string }, {}, Partial<UserPreference>>, res: Response) => {
  const existing = userPreferences.get(req.params.userId) || {
    userId: req.params.userId,
    bookedActivityIds: [],
    favoriteTags: []
  };
  const updated = { ...existing, ...req.body, userId: req.params.userId };
  userPreferences.set(req.params.userId, updated);
  res.json(updated);
});

router.get('/:userId/booked', (req: Request<{ userId: string }>, res: Response) => {
  const pref = userPreferences.get(req.params.userId);
  if (!pref) {
    res.json([]);
    return;
  }
  const bookedActivities = pref.bookedActivityIds
    .map(id => getActivityById(id))
    .filter((a): a is Activity => a !== undefined);
  res.json(bookedActivities);
});

router.post('/:userId/book', (req: Request<{ userId: string }, {}, { activityId: string }>, res: Response) => {
  const pref = userPreferences.get(req.params.userId);
  if (!pref) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  const newActivity = getActivityById(req.body.activityId);
  if (!newActivity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  
  const bookedActivities = pref.bookedActivityIds
    .map(id => getActivityById(id))
    .filter((a): a is Activity => a !== undefined);
  
  const conflicts = detectConflictsWithList(newActivity, bookedActivities);
  
  if (conflicts.length > 0) {
    res.json({
      success: false,
      conflicts,
      message: '时间冲突'
    });
    return;
  }
  
  if (!pref.bookedActivityIds.includes(req.body.activityId)) {
    pref.bookedActivityIds.push(req.body.activityId);
  }
  
  res.json({
    success: true,
    bookedActivityIds: pref.bookedActivityIds
  });
});

router.post('/:userId/unbook', (req: Request<{ userId: string }, {}, { activityId: string }>, res: Response) => {
  const pref = userPreferences.get(req.params.userId);
  if (!pref) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  pref.bookedActivityIds = pref.bookedActivityIds.filter(id => id !== req.body.activityId);
  
  res.json({
    success: true,
    bookedActivityIds: pref.bookedActivityIds
  });
});

router.post('/:userId/analyze', (req: Request<{ userId: string }>, res: Response) => {
  const pref = userPreferences.get(req.params.userId);
  if (!pref) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  const bookedActivities = pref.bookedActivityIds
    .map(id => getActivityById(id))
    .filter((a): a is Activity => a !== undefined);
  
  const tagFrequency: Map<string, number> = new Map();
  bookedActivities.forEach(activity => {
    activity.tags.forEach(tag => {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    });
  });
  
  const sortedTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  
  const unbookedActivities = mockActivities.filter(
    a => !pref.bookedActivityIds.includes(a.id)
  );
  
  const recommendations: Recommendation[] = unbookedActivities.map(activity => {
    let matchCount = 0;
    const matchedTags: string[] = [];
    
    activity.tags.forEach(tag => {
      if (tagFrequency.has(tag)) {
        matchCount += tagFrequency.get(tag) || 0;
        matchedTags.push(tag);
      }
    });
    
    const maxPossibleScore = bookedActivities.length * 3;
    const matchScore = maxPossibleScore > 0 ? Math.round((matchCount / maxPossibleScore) * 100) : 0;
    
    return {
      activity,
      matchScore,
      matchedTags
    };
  });
  
  recommendations.sort((a, b) => b.matchScore - a.matchScore);
  
  const topRecommendations = recommendations
    .filter(r => r.matchScore > 0)
    .slice(0, 3);
  
  if (topRecommendations.length < 3) {
    const remaining = recommendations
      .filter(r => r.matchScore === 0)
      .slice(0, 3 - topRecommendations.length);
    topRecommendations.push(...remaining);
  }
  
  res.json({
    topTags: sortedTags.slice(0, 5),
    recommendations: topRecommendations,
    totalBooked: bookedActivities.length
  });
});

router.post('/check-conflict', (req: Request<{}, {}, { activityId: string; userId: string }>, res: Response) => {
  const { activityId, userId } = req.body;
  
  const pref = userPreferences.get(userId);
  if (!pref) {
    res.json({ hasConflict: false, conflicts: [] });
    return;
  }
  
  const newActivity = getActivityById(activityId);
  if (!newActivity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  
  const bookedActivities = pref.bookedActivityIds
    .map(id => getActivityById(id))
    .filter((a): a is Activity => a !== undefined);
  
  const conflicts = detectConflictsWithList(newActivity, bookedActivities);
  
  res.json({
    hasConflict: conflicts.length > 0,
    conflicts
  });
});

export default router;
