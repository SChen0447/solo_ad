import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  getCommentsByRecipeId,
  addComment,
  addRating,
  getFavoritesByUserId,
  addFavorite,
  removeFavorite,
} from './data';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/recipes', (_req: Request, res: Response) => {
  const recipes = getAllRecipes();
  res.json(recipes);
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const recipe = getRecipeById(id);
  if (!recipe) {
    res.status(404).json({ error: '食谱不存在' });
    return;
  }
  const comments = getCommentsByRecipeId(id);
  res.json({ recipe, comments });
});

app.post('/api/recipes', (req: Request, res: Response) => {
  const { title, author, image, ingredients, steps } = req.body;
  if (!title || !author || !ingredients || !steps) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }
  const newRecipe = createRecipe({ title, author, image, ingredients, steps });
  res.status(201).json(newRecipe);
});

app.post('/api/recipes/:id/comment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nickname, content } = req.body;
  if (!nickname || !content) {
    res.status(400).json({ error: '昵称和内容不能为空' });
    return;
  }
  const recipe = getRecipeById(id);
  if (!recipe) {
    res.status(404).json({ error: '食谱不存在' });
    return;
  }
  const comment = addComment({ recipeId: id, nickname, content });
  res.json(comment);
});

app.post('/api/recipes/:id/rate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { score } = req.body;
  if (typeof score !== 'number' || score < 1 || score > 5) {
    res.status(400).json({ error: '评分必须是1-5之间的数字' });
    return;
  }
  const recipe = getRecipeById(id);
  if (!recipe) {
    res.status(404).json({ error: '食谱不存在' });
    return;
  }
  const result = addRating({ recipeId: id, score });
  res.json(result);
});

app.get('/api/favorites', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: '缺少 userId 参数' });
    return;
  }
  const recipeIds = getFavoritesByUserId(userId);
  res.json({ userId, recipeIds });
});

app.post('/api/favorites', (req: Request, res: Response) => {
  const { userId, recipeId } = req.body;
  if (!userId || !recipeId) {
    res.status(400).json({ error: '缺少 userId 或 recipeId' });
    return;
  }
  const favorite = addFavorite({ userId, recipeId });
  if (!favorite) {
    res.status(404).json({ error: '食谱不存在' });
    return;
  }
  res.status(201).json(favorite);
});

app.delete('/api/favorites/:recipeId', (req: Request, res: Response) => {
  const { recipeId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: '缺少 userId' });
    return;
  }
  const success = removeFavorite({ userId, recipeId });
  if (!success) {
    res.status(404).json({ error: '收藏不存在' });
    return;
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`食谱社区后端服务已启动：http://localhost:${PORT}`);
});
