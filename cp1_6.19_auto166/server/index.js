import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const dataDir = join(__dirname, 'data');

function readData(filename) {
  const raw = fs.readFileSync(join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

function writeData(filename, data) {
  fs.writeFileSync(join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/recipes', (req, res) => {
  const recipes = readData('recipes.json');
  const users = readData('users.json');
  const likes = readData('likes.json');
  const ratings = readData('ratings.json');
  const currentUserId = req.query.userId || 'u1';

  const result = recipes.map(r => {
    const author = users.find(u => u.id === r.authorId);
    const recipeLikes = likes.filter(l => l.recipeId === r.id);
    const recipeRatings = ratings.filter(rt => rt.recipeId === r.id);
    const avgRating = recipeRatings.length > 0
      ? recipeRatings.reduce((sum, rt) => sum + rt.score, 0) / recipeRatings.length
      : r.rating;
    const isLiked = recipeLikes.some(l => l.userId === currentUserId);
    return {
      id: r.id,
      title: r.title,
      author: author?.name || '未知',
      authorAvatar: author?.avatar || '',
      image: r.image,
      rating: Math.round(avgRating * 10) / 10,
      likes: recipeLikes.length,
      liked: isLiked,
    };
  });

  res.json(result);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readData('recipes.json');
  const users = readData('users.json');
  const likes = readData('likes.json');
  const ratings = readData('ratings.json');
  const comments = readData('comments.json');
  const currentUserId = req.query.userId || 'u1';

  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const author = users.find(u => u.id === recipe.authorId);
  const recipeLikes = likes.filter(l => l.recipeId === recipe.id);
  const recipeRatings = ratings.filter(rt => rt.recipeId === recipe.id);
  const avgRating = recipeRatings.length > 0
    ? recipeRatings.reduce((sum, rt) => sum + rt.score, 0) / recipeRatings.length
    : recipe.rating;
  const isLiked = recipeLikes.some(l => l.userId === currentUserId);

  const recipeComments = comments
    .filter(c => c.recipeId === recipe.id)
    .map(c => {
      const commenter = users.find(u => u.id === c.userId);
      return {
        id: c.id,
        userId: c.userId,
        userName: commenter?.name || '未知',
        userAvatar: commenter?.avatar || '',
        content: c.content,
        rating: c.rating,
        createdAt: c.createdAt,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    id: recipe.id,
    title: recipe.title,
    author: author?.name || '未知',
    authorAvatar: author?.avatar || '',
    image: recipe.image,
    rating: Math.round(avgRating * 10) / 10,
    likes: recipeLikes.length,
    liked: isLiked,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    comments: recipeComments,
  });
});

app.post('/api/recipes/:id/rate', (req, res) => {
  const { userId, score } = req.body;
  const ratings = readData('ratings.json');

  const existingIdx = ratings.findIndex(r => r.recipeId === req.params.id && r.userId === userId);
  if (existingIdx >= 0) {
    ratings[existingIdx].score = score;
  } else {
    ratings.push({ id: `rt_${Date.now()}`, recipeId: req.params.id, userId, score });
  }
  writeData('ratings.json', ratings);

  const recipeRatings = ratings.filter(r => r.recipeId === req.params.id);
  const avgRating = recipeRatings.reduce((sum, r) => sum + r.score, 0) / recipeRatings.length;

  res.json({ success: true, averageRating: Math.round(avgRating * 10) / 10 });
});

app.post('/api/recipes/:id/like', (req, res) => {
  const { userId } = req.body;
  const likes = readData('likes.json');

  const idx = likes.findIndex(l => l.recipeId === req.params.id && l.userId === userId);
  let liked;
  if (idx >= 0) {
    likes.splice(idx, 1);
    liked = false;
  } else {
    likes.push({ userId, recipeId: req.params.id });
    liked = true;
  }
  writeData('likes.json', likes);

  const recipeLikes = likes.filter(l => l.recipeId === req.params.id);
  res.json({ success: true, liked, likes: recipeLikes.length });
});

app.post('/api/recipes/:id/comments', (req, res) => {
  const { userId, content, rating } = req.body;
  const comments = readData('comments.json');
  const users = readData('users.json');

  const newComment = {
    id: `c_${Date.now()}`,
    recipeId: req.params.id,
    userId,
    content,
    rating: rating || 0,
    createdAt: new Date().toISOString(),
  };
  comments.push(newComment);
  writeData('comments.json', comments);

  const user = users.find(u => u.id === userId);
  res.json({
    success: true,
    comment: {
      id: newComment.id,
      userId: newComment.userId,
      userName: user?.name || '未知',
      userAvatar: user?.avatar || '',
      content: newComment.content,
      rating: newComment.rating,
      createdAt: newComment.createdAt,
    },
  });
});

app.put('/api/recipes/:recipeId/comments/:commentId', (req, res) => {
  const { userId, content, rating } = req.body;
  const comments = readData('comments.json');

  const idx = comments.findIndex(c => c.id === req.params.commentId && c.userId === userId);
  if (idx < 0) return res.status(404).json({ error: 'Comment not found' });

  comments[idx] = { ...comments[idx], content, rating: rating || comments[idx].rating };
  writeData('comments.json', comments);

  const users = readData('users.json');
  const user = users.find(u => u.id === userId);
  res.json({
    success: true,
    comment: {
      id: comments[idx].id,
      userId: comments[idx].userId,
      userName: user?.name || '未知',
      userAvatar: user?.avatar || '',
      content: comments[idx].content,
      rating: comments[idx].rating,
      createdAt: comments[idx].createdAt,
    },
  });
});

app.delete('/api/recipes/:recipeId/comments/:commentId', (req, res) => {
  const { userId } = req.body;
  let comments = readData('comments.json');

  const idx = comments.findIndex(c => c.id === req.params.commentId && c.userId === userId);
  if (idx < 0) return res.status(404).json({ error: 'Comment not found' });

  comments.splice(idx, 1);
  writeData('comments.json', comments);

  res.json({ success: true });
});

app.get('/api/users/:id', (req, res) => {
  const users = readData('users.json');
  const recipes = readData('recipes.json');
  const likes = readData('likes.json');
  const ratings = readData('ratings.json');

  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const userRecipes = recipes.filter(r => r.authorId === user.id);
  const totalLikes = userRecipes.reduce((sum, r) => {
    return sum + likes.filter(l => l.recipeId === r.id).length;
  }, 0);

  const allRecipeRatings = userRecipes.flatMap(r =>
    ratings.filter(rt => rt.recipeId === r.id).map(rt => rt.score)
  );
  const averageRating = allRecipeRatings.length > 0
    ? Math.round((allRecipeRatings.reduce((s, v) => s + v, 0) / allRecipeRatings.length) * 10) / 10
    : 0;

  const recentRecipes = userRecipes.slice(0, 6).map(r => {
    const recipeLikes = likes.filter(l => l.recipeId === r.id);
    const recipeRatings = ratings.filter(rt => rt.recipeId === r.id);
    const avgR = recipeRatings.length > 0
      ? recipeRatings.reduce((s, rt) => s + rt.score, 0) / recipeRatings.length
      : r.rating;
    return {
      id: r.id,
      title: r.title,
      image: r.image,
      rating: Math.round(avgR * 10) / 10,
      likes: recipeLikes.length,
    };
  });

  const userRatings = ratings.filter(rt => rt.userId === user.id);
  const highlyRatedRecipeIds = userRatings
    .filter(rt => rt.score >= 4)
    .map(rt => rt.recipeId);

  let recommendations = recipes
    .filter(r => r.authorId !== user.id)
    .map(r => {
      let score = r.rating;
      if (highlyRatedRecipeIds.includes(r.id)) score += 2;
      const commonIngredients = r.ingredients.length;
      score += Math.min(commonIngredients * 0.1, 1);
      return { ...r, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6)
    .map(r => {
      const recipeLikes = likes.filter(l => l.recipeId === r.id);
      const recipeRatings = ratings.filter(rt => rt.recipeId === r.id);
      const avgR = recipeRatings.length > 0
        ? recipeRatings.reduce((s, rt) => s + rt.score, 0) / recipeRatings.length
        : r.rating;
      const author = users.find(u => u.id === r.authorId);
      return {
        id: r.id,
        title: r.title,
        image: r.image,
        rating: Math.round(avgR * 10) / 10,
        likes: recipeLikes.length,
        author: author?.name || '未知',
        authorAvatar: author?.avatar || '',
      };
    });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const trendData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = Math.random() > 0.6 ? (Math.floor(Math.random() * 3) + 1) : 0;
    trendData.push({ date: dateStr, count });
  }

  res.json({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    stats: {
      publishedCount: userRecipes.length,
      totalLikes,
      averageRating,
    },
    recentRecipes,
    recommendations,
    trendData,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
