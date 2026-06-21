import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  users,
  recipes,
  ratings,
  favorites,
  cookingHistories,
  generateToken,
  getUserByToken,
} from './store';
import type { Recipe, RecipeStep } from './types';

const router = Router();

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未授权' });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: '无效的token' });
  }
  req.user = user;
  req.token = token;
  next();
}

router.post('/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const existingUser = Array.from(users.values()).find(
    (u) => u.username === username
  );
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const user = {
    id: uuidv4(),
    username,
    password,
    createdAt: Date.now(),
  };
  users.set(user.id, user);

  const token = generateToken(user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
  });
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = Array.from(users.values()).find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
  });
});

router.get('/auth/me', authMiddleware, (req: any, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, createdAt: req.user.createdAt } });
});

router.get('/recipes', (req, res) => {
  const {
    page = '1',
    limit = '12',
    sort = 'newest',
    cuisine,
  } = req.query as {
    page?: string;
    limit?: string;
    sort?: string;
    cuisine?: string;
  };

  let recipeList = Array.from(recipes.values()).filter((r) => r.isPublic);

  if (cuisine && cuisine !== 'all') {
    recipeList = recipeList.filter((r) => r.cuisine === cuisine);
  }

  if (sort === 'newest') {
    recipeList.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === 'rating') {
    recipeList.sort((a, b) => {
      const avgA = getAverageRating(a.id);
      const avgB = getAverageRating(b.id);
      return avgB - avgA;
    });
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = (pageNum - 1) * limitNum;
  const paginatedRecipes = recipeList.slice(start, start + limitNum);

  const recipesWithRating = paginatedRecipes.map((recipe) => ({
    ...recipe,
    averageRating: getAverageRating(recipe.id),
    ratingCount: getRatingCount(recipe.id),
  }));

  res.json({
    recipes: recipesWithRating,
    total: recipeList.length,
    page: pageNum,
    limit: limitNum,
  });
});

router.get('/recipes/:id', (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  res.json({
    ...recipe,
    averageRating: getAverageRating(recipe.id),
    ratingCount: getRatingCount(recipe.id),
  });
});

router.post('/recipes', authMiddleware, (req: any, res) => {
  const {
    title,
    coverImage,
    description,
    cuisine,
    ingredients,
    steps,
    isPublic = true,
  } = req.body;

  if (!title || !ingredients || !steps) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const totalTime = steps.reduce(
    (acc: number, step: RecipeStep) => acc + (step.duration || 0),
    0
  );

  const recipe: Recipe = {
    id: uuidv4(),
    title,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600',
    description: description || '',
    cuisine: cuisine || 'other',
    ingredients,
    steps: steps.map((s: any, i: number) => ({
      id: uuidv4(),
      title: s.title,
      description: s.description || '',
      duration: s.duration || 0,
      order: i + 1,
    })),
    totalTime,
    authorId: req.user.id,
    authorName: req.user.username,
    isPublic,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  recipes.set(recipe.id, recipe);
  res.status(201).json(recipe);
});

router.put('/recipes/:id', authMiddleware, (req: any, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  if (recipe.authorId !== req.user.id) {
    return res.status(403).json({ error: '无权编辑此食谱' });
  }

  const {
    title,
    coverImage,
    description,
    cuisine,
    ingredients,
    steps,
    isPublic,
  } = req.body;

  const updatedSteps = steps
    ? steps.map((s: any, i: number) => ({
        id: s.id || uuidv4(),
        title: s.title,
        description: s.description || '',
        duration: s.duration || 0,
        order: i + 1,
      }))
    : recipe.steps;

  const totalTime = updatedSteps.reduce(
    (acc: number, step: RecipeStep) => acc + step.duration,
    0
  );

  const updatedRecipe: Recipe = {
    ...recipe,
    title: title ?? recipe.title,
    coverImage: coverImage ?? recipe.coverImage,
    description: description ?? recipe.description,
    cuisine: cuisine ?? recipe.cuisine,
    ingredients: ingredients ?? recipe.ingredients,
    steps: updatedSteps,
    totalTime,
    isPublic: isPublic ?? recipe.isPublic,
    updatedAt: Date.now(),
  };

  recipes.set(recipe.id, updatedRecipe);
  res.json(updatedRecipe);
});

router.delete('/recipes/:id', authMiddleware, (req: any, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  if (recipe.authorId !== req.user.id) {
    return res.status(403).json({ error: '无权删除此食谱' });
  }

  recipes.delete(req.params.id);
  res.json({ message: '删除成功' });
});

router.get('/recipes/:id/rating', (req, res) => {
  res.json({
    average: getAverageRating(req.params.id),
    count: getRatingCount(req.params.id),
  });
});

router.post('/recipes/:id/rating', authMiddleware, (req: any, res) => {
  const { score } = req.body;
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const existingRating = Array.from(ratings.values()).find(
    (r) => r.recipeId === req.params.id && r.userId === req.user.id
  );

  if (existingRating) {
    existingRating.score = score;
    existingRating.createdAt = Date.now();
    ratings.set(existingRating.id, existingRating);
    res.json(existingRating);
  } else {
    const rating = {
      id: uuidv4(),
      recipeId: req.params.id,
      userId: req.user.id,
      score,
      createdAt: Date.now(),
    };
    ratings.set(rating.id, rating);
    res.status(201).json(rating);
  }
});

router.get('/favorites', authMiddleware, (req: any, res) => {
  const userFavorites = Array.from(favorites.values()).filter(
    (f) => f.userId === req.user.id
  );
  const favoriteRecipes = userFavorites
    .map((f) => {
      const recipe = recipes.get(f.recipeId);
      if (!recipe) return null;
      return {
        ...recipe,
        averageRating: getAverageRating(recipe.id),
        ratingCount: getRatingCount(recipe.id),
        favoritedAt: f.createdAt,
      };
    })
    .filter(Boolean);

  res.json(favoriteRecipes);
});

router.post('/recipes/:id/favorite', authMiddleware, (req: any, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }

  const existingFavorite = Array.from(favorites.values()).find(
    (f) => f.recipeId === req.params.id && f.userId === req.user.id
  );

  if (existingFavorite) {
    favorites.delete(existingFavorite.id);
    res.json({ favorited: false });
  } else {
    const favorite = {
      id: uuidv4(),
      recipeId: req.params.id,
      userId: req.user.id,
      createdAt: Date.now(),
    };
    favorites.set(favorite.id, favorite);
    res.json({ favorited: true });
  }
});

router.get('/recipes/:id/favorite/status', authMiddleware, (req: any, res) => {
  const existingFavorite = Array.from(favorites.values()).find(
    (f) => f.recipeId === req.params.id && f.userId === req.user.id
  );
  res.json({ favorited: !!existingFavorite });
});

router.get('/user/recipes', authMiddleware, (req: any, res) => {
  const userRecipes = Array.from(recipes.values())
    .filter((r) => r.authorId === req.user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((recipe) => ({
      ...recipe,
      averageRating: getAverageRating(recipe.id),
      ratingCount: getRatingCount(recipe.id),
    }));

  res.json(userRecipes);
});

router.get('/user/history', authMiddleware, (req: any, res) => {
  const history = Array.from(cookingHistories.values())
    .filter((h) => h.userId === req.user.id)
    .sort((a, b) => b.completedAt - a.completedAt);

  res.json(history);
});

router.post('/user/history', authMiddleware, (req: any, res) => {
  const { recipeId, recipeTitle } = req.body;

  const history = {
    id: uuidv4(),
    userId: req.user.id,
    recipeId,
    recipeTitle,
    completedAt: Date.now(),
  };
  cookingHistories.set(history.id, history);

  res.status(201).json(history);
});

function getAverageRating(recipeId: string): number {
  const recipeRatings = Array.from(ratings.values()).filter(
    (r) => r.recipeId === recipeId
  );
  if (recipeRatings.length === 0) return 0;
  const sum = recipeRatings.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / recipeRatings.length) * 10) / 10;
}

function getRatingCount(recipeId: string): number {
  return Array.from(ratings.values()).filter((r) => r.recipeId === recipeId)
    .length;
}

export default router;
