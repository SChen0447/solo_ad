import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import {
  matchRecipesByPantry,
  generateShoppingList,
  findUserById,
  JWT_SECRET,
  ingredientCategories,
} from '../store';
import { Ingredient, ShoppingListItem } from '../models/Recipe';

const router = Router();

function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}

router.get('/categories', (req: Request, res: Response) => {
  res.json(ingredientCategories);
});

router.get('/pantry', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user.pantry);
});

router.post('/pantry', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { name, quantity, unit, category } = req.body;
  if (!name) {
    return res.status(400).json({ error: '食材名称不能为空' });
  }

  const ingredient: Ingredient = {
    id: uuidv4(),
    name: name.trim(),
    quantity: parseFloat(quantity) || 1,
    unit: unit || '个',
    category: category || '其他',
  };

  user.pantry.push(ingredient);
  res.status(201).json(ingredient);
});

router.put('/pantry/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const ingredient = user.pantry.find(i => i.id === req.params.id);
  if (!ingredient) {
    return res.status(404).json({ error: '食材不存在' });
  }

  const { name, quantity, unit, category } = req.body;
  if (name) ingredient.name = name.trim();
  if (quantity !== undefined) ingredient.quantity = parseFloat(quantity) || 0;
  if (unit) ingredient.unit = unit;
  if (category) ingredient.category = category;

  res.json(ingredient);
});

router.delete('/pantry/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const initialLength = user.pantry.length;
  user.pantry = user.pantry.filter(i => i.id !== req.params.id);

  if (user.pantry.length === initialLength) {
    return res.status(404).json({ error: '食材不存在' });
  }

  res.json({ message: '删除成功' });
});

router.post('/recommend', (req: Request, res: Response) => {
  const { pantry, maxMissing } = req.body;
  const userPantry: Ingredient[] = pantry || [];
  const missing = maxMissing !== undefined ? maxMissing : 2;

  const recommendations = matchRecipesByPantry(userPantry, missing);
  res.json(recommendations);
});

router.get('/shopping-list', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user.shoppingList);
});

router.post('/shopping-list/generate', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const { recipeIds } = req.body;
  const list = generateShoppingList(recipeIds || [], user.pantry);
  user.shoppingList = list;
  res.json(list);
});

router.put('/shopping-list/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const item = user.shoppingList.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: '购物清单项不存在' });
  }

  const { completed, name, quantity, unit, category } = req.body;
  if (completed !== undefined) item.completed = completed;
  if (name) item.name = name;
  if (quantity !== undefined) item.quantity = parseFloat(quantity) || 0;
  if (unit) item.unit = unit;
  if (category) item.category = category;

  res.json(item);
});

router.delete('/shopping-list/:id', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const initialLength = user.shoppingList.length;
  user.shoppingList = user.shoppingList.filter(i => i.id !== req.params.id);

  if (user.shoppingList.length === initialLength) {
    return res.status(404).json({ error: '购物清单项不存在' });
  }

  res.json({ message: '删除成功' });
});

router.post('/shopping-list/clear', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = findUserById(userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  user.shoppingList = [];
  res.json({ message: '购物清单已清空' });
});

export default router;
