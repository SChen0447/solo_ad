import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../shared/db';

const router = Router();

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  ml: { cup: 0.00422675, tbsp: 0.067628, tsp: 0.202884 },
  cup: { ml: 236.588, tbsp: 16, tsp: 48 },
  g: { kg: 0.001, lb: 0.00220462, oz: 0.035274 },
  kg: { g: 1000, lb: 2.20462, oz: 35.274 },
  毫升: { 杯: 0.00422675 },
  杯: { 毫升: 236.588 },
  克: { 千克: 0.001 },
  千克: { 克: 1000 },
};

function convertUnit(amount: number, fromUnit: string, toUnit: string): number | null {
  const fromLower = fromUnit.toLowerCase();
  const toLower = toUnit.toLowerCase();
  if (fromLower === toLower) return amount;
  
  if (UNIT_CONVERSIONS[fromLower] && UNIT_CONVERSIONS[fromLower][toLower]) {
    return amount * UNIT_CONVERSIONS[fromLower][toLower];
  }
  if (UNIT_CONVERSIONS[fromUnit] && UNIT_CONVERSIONS[fromUnit][toUnit]) {
    return amount * UNIT_CONVERSIONS[fromUnit][toUnit];
  }
  return null;
}

function scaleIngredients(ingredients: any[], scale: number): any[] {
  return ingredients.map(ing => ({
    ...ing,
    amount: Number((ing.amount * scale).toFixed(2)),
  }));
}

router.get('/', (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '12',
      sort = 'latest',
      search = '',
      tags = '',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search) {
      whereClauses.push('(r.title LIKE ? OR r.description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (tags) {
      const tagList = (tags as string).split(',').filter(t => t);
      tagList.forEach(tag => {
        whereClauses.push('r.tags LIKE ?');
        params.push(`%${tag}%`);
      });
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    let orderSql = 'ORDER BY r.created_at DESC';
    if (sort === 'popular') {
      orderSql = 'ORDER BY r.likes DESC, r.views DESC';
    }

    const countSql = `SELECT COUNT(*) as total FROM recipes r ${whereSql}`;
    const totalResult = queryOne(countSql, params) as { total: number };

    const sql = `
      SELECT r.*, u.username as author_name, u.avatar as author_avatar,
             (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) as comment_count
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;
    const recipes = query(sql, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: {
        recipes,
        total: totalResult?.total || 0,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取菜谱列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recipe = queryOne(
      `SELECT r.*, u.username as author_name, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) as comment_count
       FROM recipes r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (!recipe) {
      return res.status(404).json({ success: false, message: '菜谱不存在' });
    }

    execute('UPDATE recipes SET views = views + 1 WHERE id = ?', [id]);

    const ingredients = query(
      'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const steps = query(
      'SELECT * FROM steps WHERE recipe_id = ? ORDER BY sort_order ASC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...recipe,
        ingredients,
        steps,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取菜谱详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 1;
    const {
      title,
      description = '',
      thumbnail = '',
      servings = 2,
      prepTime = 0,
      cookTime = 0,
      tags = '',
      ingredients = [],
      steps = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '菜谱标题不能为空' });
    }

    const totalTime = (prepTime || 0) + (cookTime || 0);

    const result = execute(
      `INSERT INTO recipes (user_id, title, description, thumbnail, servings, prep_time, cook_time, total_time, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description, thumbnail, servings, prepTime, cookTime, totalTime, tags]
    );

    const recipeId = result.lastInsertRowid;

    ingredients.forEach((ing: any, index: number) => {
      execute(
        'INSERT INTO ingredients (recipe_id, name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?)',
        [recipeId, ing.name, ing.amount || 0, ing.unit || '', index]
      );
    });

    steps.forEach((step: any, index: number) => {
      execute(
        'INSERT INTO steps (recipe_id, title, description, image, sort_order) VALUES (?, ?, ?, ?, ?)',
        [recipeId, step.title || '', step.description || '', step.image || '', index]
      );
    });

    res.status(201).json({ success: true, data: { id: recipeId } });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建菜谱失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId || 1;
    const {
      title,
      description,
      thumbnail,
      servings,
      prepTime,
      cookTime,
      tags,
      ingredients,
      steps,
    } = req.body;

    const existing = queryOne('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: '菜谱不存在' });
    }

    const totalTime = (prepTime || 0) + (cookTime || 0);

    execute(
      `UPDATE recipes SET title = ?, description = ?, thumbnail = ?, servings = ?, 
              prep_time = ?, cook_time = ?, total_time = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, thumbnail, servings, prepTime, cookTime, totalTime, tags, id]
    );

    if (ingredients) {
      execute('DELETE FROM ingredients WHERE recipe_id = ?', [id]);
      ingredients.forEach((ing: any, index: number) => {
        execute(
          'INSERT INTO ingredients (recipe_id, name, amount, unit, sort_order) VALUES (?, ?, ?, ?, ?)',
          [id, ing.name, ing.amount || 0, ing.unit || '', index]
        );
      });
    }

    if (steps) {
      execute('DELETE FROM steps WHERE recipe_id = ?', [id]);
      steps.forEach((step: any, index: number) => {
        execute(
          'INSERT INTO steps (recipe_id, title, description, image, sort_order) VALUES (?, ?, ?, ?, ?)',
          [id, step.title || '', step.description || '', step.image || '', index]
        );
      });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新菜谱失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    execute('DELETE FROM recipes WHERE id = ?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除菜谱失败' });
  }
});

router.post('/:id/convert', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetServings, targetUnit } = req.body;

    const recipe = queryOne('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!recipe) {
      return res.status(404).json({ success: false, message: '菜谱不存在' });
    }

    const ingredients = query(
      'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order ASC',
      [id]
    );

    const scale = targetServings / recipe.servings;
    let converted = scaleIngredients(ingredients, scale);

    if (targetUnit) {
      converted = converted.map(ing => {
        const convertedAmount = convertUnit(ing.amount, ing.unit, targetUnit);
        if (convertedAmount !== null) {
          return { ...ing, amount: Number(convertedAmount.toFixed(2)), unit: targetUnit };
        }
        return ing;
      });
    }

    res.json({
      success: true,
      data: {
        servings: targetServings,
        ingredients: converted,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '食材换算失败' });
  }
});

router.get('/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comments = query(
      `SELECT c.*, u.username as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.recipe_id = ?
       ORDER BY c.created_at DESC`,
      [id]
    );

    const commentMap = new Map<number, any[]>();
    const rootComments: any[] = [];

    comments.forEach(comment => {
      comment.replies = [];
      if (comment.parent_id && comment.parent_id > 0) {
        if (!commentMap.has(comment.parent_id)) {
          commentMap.set(comment.parent_id, []);
        }
        commentMap.get(comment.parent_id)!.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    rootComments.forEach(comment => {
      if (commentMap.has(comment.id)) {
        comment.replies = commentMap.get(comment.id)!;
      }
    });

    res.json({ success: true, data: rootComments });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取评论失败' });
  }
});

router.post('/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId || 1;
    const { content, parentId = 0 } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }

    const result = execute(
      'INSERT INTO comments (recipe_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [id, userId, parentId, content.trim()]
    );

    const comment = queryOne(
      `SELECT c.*, u.username as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.lastInsertRowid]
    );

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: '评论发布失败' });
  }
});

router.post('/:id/like', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    execute('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [id]);
    const recipe = queryOne('SELECT likes FROM recipes WHERE id = ?', [id]);
    res.json({ success: true, data: { likes: recipe?.likes || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: '点赞失败' });
  }
});

router.get('/tags/list', (req: Request, res: Response) => {
  try {
    const recipes = query('SELECT tags FROM recipes WHERE tags IS NOT NULL AND tags != ""');
    const tagSet = new Set<string>();
    
    recipes.forEach(r => {
      if (r.tags) {
        r.tags.split(',').forEach((tag: string) => {
          if (tag.trim()) tagSet.add(tag.trim());
        });
      }
    });

    const defaultTags = ['中式', '西式', '甜品', '汤羹', '家常菜', '快手菜', '烘焙', '硬菜'];
    defaultTags.forEach(tag => tagSet.add(tag));

    res.json({ success: true, data: Array.from(tagSet) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
});

export default router;
