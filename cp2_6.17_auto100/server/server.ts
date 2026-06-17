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

app.listen(PORT, () => {
  console.log(`食谱社区后端服务已启动：http://localhost:${PORT}`);
});
