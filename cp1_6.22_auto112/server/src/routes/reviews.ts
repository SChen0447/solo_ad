import { Router, Request, Response } from 'express';
import { getReviewsByRouteId, addReview } from '../data/store';
import { avatarColors } from '../data/store';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const { id } = req.params;
  const reviews = getReviewsByRouteId(id);
  res.json({ reviews });
});

router.post('/', (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, rating, comment } = req.body;
  
  if (!username || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Username and valid rating (1-5) are required' });
    return;
  }
  
  if (comment && comment.length > 200) {
    res.status(400).json({ error: 'Comment must be 200 characters or less' });
    return;
  }
  
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  
  const review = addReview(id, {
    userId: 'user_' + Math.random().toString(36).substr(2, 9),
    username,
    rating: Math.floor(rating),
    comment: comment || '',
    avatarColor
  });
  
  if (!review) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  
  res.status(201).json({ review });
});

export default router;
