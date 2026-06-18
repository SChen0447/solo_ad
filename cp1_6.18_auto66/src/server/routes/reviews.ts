import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Review } from '../types.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { orderId, productId, targetId, rating, comment, type } = req.body;

  if (!orderId || !productId || !targetId || !rating || !type) {
    return res.status(400).json({ error: '请填写完整评价信息' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  if (comment && comment.length > 50) {
    return res.status(400).json({ error: '评价内容不能超过50字' });
  }

  const order = db.data.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  if (order.status !== 'completed') {
    return res.status(400).json({ error: '订单未完成，无法评价' });
  }

  const existingReview = db.data.reviews.find(
    r => r.orderId === orderId && r.reviewerId === req.userId && r.type === type
  );

  if (existingReview) {
    return res.status(400).json({ error: '您已对此进行过评价' });
  }

  if (type === 'product') {
    if (order.buyerId !== req.userId) {
      return res.status(403).json({ error: '只有买家可以评价商品' });
    }
  } else if (type === 'buyer') {
    if (order.sellerId !== req.userId) {
      return res.status(403).json({ error: '只有卖家可以评价买家' });
    }
  } else if (type === 'seller') {
    if (order.buyerId !== req.userId) {
      return res.status(403).json({ error: '只有买家可以评价卖家' });
    }
  }

  const newReview: Review = {
    id: uuidv4(),
    orderId,
    productId,
    reviewerId: req.userId!,
    targetId,
    rating: parseInt(rating),
    comment: comment || '',
    type,
    createdAt: new Date().toISOString()
  };

  db.data.reviews.push(newReview);
  await db.write();

  res.json(newReview);
});

router.get('/product/:productId', async (req, res) => {
  const reviews = db.data.reviews.filter(
    r => r.productId === req.params.productId && r.type === 'product'
  );

  const reviewsWithReviewer = await Promise.all(
    reviews.map(async r => {
      const reviewer = db.data.users.find(u => u.id === r.reviewerId);
      return {
        ...r,
        reviewer: reviewer ? {
          id: reviewer.id,
          username: reviewer.username,
          avatar: reviewer.avatar
        } : null
      };
    })
  );

  res.json(reviewsWithReviewer);
});

router.get('/user/:userId', async (req, res) => {
  const reviews = db.data.reviews.filter(
    r => r.targetId === req.params.userId && (r.type === 'buyer' || r.type === 'seller')
  );

  const reviewsWithDetails = await Promise.all(
    reviews.map(async r => {
      const reviewer = db.data.users.find(u => u.id === r.reviewerId);
      const product = db.data.products.find(p => p.id === r.productId);
      return {
        ...r,
        reviewer: reviewer ? {
          id: reviewer.id,
          username: reviewer.username,
          avatar: reviewer.avatar
        } : null,
        product: product ? {
          id: product.id,
          title: product.title
        } : null
      };
    })
  );

  res.json(reviewsWithDetails);
});

export default router;
