import express from 'express';
const router = express.Router();
import store from '../models/recipe.js';

router.get('/', (req, res) => {
  const { search, tags } = req.query;
  const tagList = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
  const recipes = store.getAllRecipes({ search: search || '', tags: tagList });
  res.json(recipes);
});

router.get('/favorites', (req, res) => {
  res.json(store.getFavorites());
});

router.get('/:id', (req, res) => {
  const recipe = store.getRecipeById(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json({
    ...recipe,
    favorited: store.isFavorited(req.params.id),
  });
});

router.post('/', (req, res) => {
  const data = req.body;
  if (!data.title || !data.ingredients || !data.steps) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const recipe = store.createRecipe(data);
  res.status(201).json(recipe);
});

router.get('/:id/reviews', (req, res) => {
  const reviews = store.getReviews(req.params.id);
  res.json(reviews);
});

router.post('/:id/reviews', (req, res) => {
  const { userId, userName, userAvatar, rating, content } = req.body;
  if (!rating || !content) {
    return res.status(400).json({ error: '评分和评价内容必填' });
  }
  const review = store.addReview(req.params.id, {
    userId: userId || 'guest',
    userName: userName || '匿名用户',
    userAvatar: userAvatar || 'https://i.pravatar.cc/150?img=10',
    rating: Number(rating),
    content,
  });
  res.status(201).json(review);
});

router.post('/:id/favorite', (req, res) => {
  const result = store.toggleFavorite(req.params.id);
  res.json(result);
});

router.post('/:id/scale-log', (req, res) => {
  const log = store.logScale({
    recipeId: req.params.id,
    ...req.body,
  });
  res.status(201).json(log);
});

export default router;
