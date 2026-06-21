import { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

type SendToUserFn = (userId: string, message: any) => void;

export function setupRoutes(app: Express, db: Database.Database, sendToUser: SendToUserFn) {
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/users/register', (req: Request, res: Response) => {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: '用户名不能为空' });
    }
    try {
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
      if (existing) {
        return res.json({ id: existing.id, username });
      }
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)').run(id, username, now);
      res.json({ id, username });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/:id', (req: Request, res: Response) => {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  });

  app.get('/api/crops', (req: Request, res: Response) => {
    const crops = db.prepare(`
      SELECT 
        id, name, emoji,
        seed_days as "seedDays",
        sprout_days as "sproutDays",
        bloom_days as "bloomDays",
        harvest_days as "harvestDays",
        water_per_day as "waterPerDay",
        fertilize_per_day as "fertilizePerDay",
        weed_per_day as "weedPerDay"
      FROM crops
    `).all();
    
    const result = crops.map((crop: any) => ({
      id: crop.id,
      name: crop.name,
      emoji: crop.emoji,
      stages: {
        seed: crop.seedDays,
        sprout: crop.sproutDays,
        bloom: crop.bloomDays,
        harvest: crop.harvestDays
      },
      tasksPerStage: {
        water: crop.waterPerDay,
        fertilize: crop.fertilizePerDay,
        weed: crop.weedPerDay
      }
    }));
    
    res.json(result);
  });

  app.get('/api/plots', (req: Request, res: Response) => {
    const plots = db.prepare(`
      SELECT 
        p.id, p.row, p.col, p.status,
        p.user_id as "userId", p.crop_id as "cropId",
        p.planted_at as "plantedAt", p.current_stage as "currentStage",
        p.stage_progress as "stageProgress", p.missed_days as "missedDays",
        c.name as "cropName", c.emoji as "cropEmoji",
        u.username as "userName"
      FROM plots p
      LEFT JOIN crops c ON p.crop_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.row, p.col
    `).all();
    
    res.json(plots);
  });

  function generateTasks(plotId: string, cropId: string, crop: any, plantedAt: Date): any[] {
    const tasks: any[] = [];
    const stages = ['seed', 'sprout', 'bloom', 'harvest'];
    const stageDays = {
      seed: crop.seedDays,
      sprout: crop.sproutDays,
      bloom: crop.bloomDays,
      harvest: crop.harvestDays
    };
    const taskTypes = ['water', 'fertilize', 'weed'];
    const taskFreq = {
      water: crop.waterPerDay,
      fertilize: crop.fertilizePerDay,
      weed: crop.weedPerDay
    };

    let currentDate = new Date(plantedAt);

    for (const stage of stages) {
      const days = stageDays[stage as keyof typeof stageDays];
      if (days <= 0) continue;

      for (let day = 0; day < days; day++) {
        for (const type of taskTypes) {
          const freq = taskFreq[type as keyof typeof taskFreq];
          if (freq < 1) {
            if (Math.random() < freq) {
              tasks.push({
                id: uuidv4(),
                plotId,
                cropId,
                type,
                stage,
                scheduledDate: currentDate.toISOString().split('T')[0],
                completed: false
              });
            }
          } else {
            for (let i = 0; i < Math.floor(freq); i++) {
              tasks.push({
                id: uuidv4(),
                plotId,
                cropId,
                type,
                stage,
                scheduledDate: currentDate.toISOString().split('T')[0],
                completed: false
              });
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return tasks;
  }

  app.post('/api/plots/:id/claim', (req: Request, res: Response) => {
    const { userId, cropId } = req.body;
    const plotId = req.params.id;

    if (!userId || !cropId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(plotId) as any;
    if (!plot) {
      return res.status(404).json({ error: '地块不存在' });
    }
    if (plot.status !== 'empty') {
      return res.status(400).json({ error: '该地块已被认领' });
    }

    const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(cropId) as any;
    if (!crop) {
      return res.status(404).json({ error: '作物不存在' });
    }

    const plantedAt = new Date();
    const tasks = generateTasks(plotId, cropId, crop, plantedAt);

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE plots 
        SET status = 'claimed', user_id = ?, crop_id = ?, planted_at = ?, 
            current_stage = 'seed', stage_progress = 0, missed_days = 0,
            last_checkin_date = ?
        WHERE id = ?
      `).run(userId, cropId, plantedAt.toISOString(), plantedAt.toISOString().split('T')[0], plotId);

      const insertTask = db.prepare(`
        INSERT INTO tasks (id, plot_id, crop_id, type, stage, scheduled_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const task of tasks) {
        insertTask.run(task.id, task.plotId, task.cropId, task.type, task.stage, task.scheduledDate);
      }
    });

    try {
      transaction();
      
      const updatedPlot = db.prepare(`
        SELECT 
          p.id, p.row, p.col, p.status,
          p.user_id as "userId", p.crop_id as "cropId",
          p.planted_at as "plantedAt", p.current_stage as "currentStage",
          p.stage_progress as "stageProgress", p.missed_days as "missedDays",
          c.name as "cropName", c.emoji as "cropEmoji"
        FROM plots p
        LEFT JOIN crops c ON p.crop_id = c.id
        WHERE p.id = ?
      `).get(plotId);

      res.json({ plot: updatedPlot, tasks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tasks', (req: Request, res: Response) => {
    const { userId, date } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const queryDate = date as string || new Date().toISOString().split('T')[0];

    const tasks = db.prepare(`
      SELECT 
        t.id, t.plot_id as "plotId", t.crop_id as "cropId",
        t.type, t.stage, t.scheduled_date as "scheduledDate",
        t.completed, t.completed_at as "completedAt",
        c.name as "cropName", c.emoji as "cropEmoji",
        p.row, p.col
      FROM tasks t
      JOIN plots p ON t.plot_id = p.id
      JOIN crops c ON t.crop_id = c.id
      WHERE p.user_id = ? AND t.scheduled_date = ?
      ORDER BY t.type
    `).all(userId, queryDate);

    res.json(tasks);
  });

  app.post('/api/tasks/:id/complete', (req: Request, res: Response) => {
    const taskId = req.params.id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    if (task.completed) {
      return res.status(400).json({ error: '任务已完成' });
    }

    const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(task.plot_id) as any;
    const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(task.crop_id) as any;

    const stageDays: Record<string, number> = {
      seed: crop.seed_days,
      sprout: crop.sprout_days,
      bloom: crop.bloom_days,
      harvest: crop.harvest_days
    };

    let newStage = plot.current_stage;
    let newProgress = plot.stage_progress + 1;

    const currentStageDays = stageDays[plot.current_stage];
    const tasksPerDay = Math.ceil(crop.water_per_day + crop.fertilize_per_day + crop.weed_per_day);
    const totalStageTasks = currentStageDays * tasksPerDay;
    
    if (newProgress >= totalStageTasks) {
      const stages = ['seed', 'sprout', 'bloom', 'harvest'];
      const currentIndex = stages.indexOf(plot.current_stage);
      if (currentIndex < stages.length - 1) {
        newStage = stages[currentIndex + 1];
        newProgress = 0;
      } else {
        newStage = 'harvest';
        newProgress = totalStageTasks;
      }
    }

    let newStatus = plot.status;
    if (newStage === 'harvest' && newProgress >= stageDays.harvest * tasksPerDay) {
      newStatus = 'mature';
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?
      `).run(now.toISOString(), taskId);

      db.prepare(`
        UPDATE plots 
        SET current_stage = ?, stage_progress = ?, last_checkin_date = ?, status = ?
        WHERE id = ?
      `).run(newStage, newProgress, today, newStatus, plot.id);
    });

    try {
      transaction();

      if (newStatus === 'mature' && plot.status !== 'mature') {
        sendToUser(plot.user_id, {
          type: 'crop_mature',
          data: { plotId: plot.id, cropName: crop.name }
        });
      }

      const updatedTask = db.prepare(`
        SELECT 
          t.id, t.plot_id as "plotId", t.crop_id as "cropId",
          t.type, t.stage, t.scheduled_date as "scheduledDate",
          t.completed, t.completed_at as "completedAt",
          c.name as "cropName", c.emoji as "cropEmoji"
        FROM tasks t
        JOIN crops c ON t.crop_id = c.id
        WHERE t.id = ?
      `).get(taskId);

      const updatedPlot = db.prepare(`
        SELECT 
          p.id, p.row, p.col, p.status,
          p.user_id as "userId", p.crop_id as "cropId",
          p.planted_at as "plantedAt", p.current_stage as "currentStage",
          p.stage_progress as "stageProgress", p.missed_days as "missedDays",
          c.name as "cropName", c.emoji as "cropEmoji",
          c.seed_days as "seedDays", c.sprout_days as "sproutDays",
          c.bloom_days as "bloomDays", c.harvest_days as "harvestDays"
        FROM plots p
        LEFT JOIN crops c ON p.crop_id = c.id
        WHERE p.id = ?
      `).get(plot.id);

      res.json({ task: updatedTask, plot: updatedPlot, newStage, newStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/inventory', (req: Request, res: Response) => {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const inventory = db.prepare(`
      SELECT 
        i.id, i.user_id as "userId", i.crop_id as "cropId",
        i.quantity, c.name as "cropName", c.emoji as "cropEmoji"
      FROM inventory i
      JOIN crops c ON i.crop_id = c.id
      WHERE i.user_id = ? AND i.quantity > 0
      ORDER BY i.quantity DESC
    `).all(userId);

    res.json(inventory);
  });

  app.post('/api/harvest/:plotId', (req: Request, res: Response) => {
    const { plotId } = req.params;

    const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(plotId) as any;
    if (!plot) {
      return res.status(404).json({ error: '地块不存在' });
    }
    if (plot.status !== 'mature') {
      return res.status(400).json({ error: '作物尚未成熟' });
    }

    const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(plot.crop_id) as any;
    const harvestQuantity = Math.floor(Math.random() * 5) + 3;

    const transaction = db.transaction(() => {
      const existing = db.prepare('SELECT id, quantity FROM inventory WHERE user_id = ? AND crop_id = ?')
        .get(plot.user_id, plot.crop_id) as any;

      if (existing) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
          .run(harvestQuantity, existing.id);
      } else {
        db.prepare('INSERT INTO inventory (id, user_id, crop_id, quantity) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), plot.user_id, plot.crop_id, harvestQuantity);
      }

      db.prepare(`
        UPDATE plots SET status = 'empty', user_id = NULL, crop_id = NULL,
        planted_at = NULL, current_stage = NULL, stage_progress = 0,
        last_checkin_date = NULL, missed_days = 0
        WHERE id = ?
      `).run(plotId);
    });

    try {
      transaction();

      const inventoryItem = db.prepare(`
        SELECT 
          i.id, i.user_id as "userId", i.crop_id as "cropId",
          i.quantity, c.name as "cropName", c.emoji as "cropEmoji"
        FROM inventory i
        JOIN crops c ON i.crop_id = c.id
        WHERE i.user_id = ? AND i.crop_id = ?
      `).get(plot.user_id, plot.crop_id);

      res.json({ inventory: inventoryItem, harvestQuantity });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/exchange/market', (req: Request, res: Response) => {
    const { userId } = req.query;

    const query = userId 
      ? db.prepare(`
          SELECT 
            i.id, i.user_id as "userId", i.crop_id as "cropId",
            i.quantity, c.name as "cropName", c.emoji as "cropEmoji",
            u.username
          FROM inventory i
          JOIN crops c ON i.crop_id = c.id
          JOIN users u ON i.user_id = u.id
          WHERE i.quantity > 0 AND i.user_id != ?
          ORDER BY i.quantity DESC
        `)
      : db.prepare(`
          SELECT 
            i.id, i.user_id as "userId", i.crop_id as "cropId",
            i.quantity, c.name as "cropName", c.emoji as "cropEmoji",
            u.username
          FROM inventory i
          JOIN crops c ON i.crop_id = c.id
          JOIN users u ON i.user_id = u.id
          WHERE i.quantity > 0
          ORDER BY i.quantity DESC
        `);

    const items = userId ? query.all(userId) : query.all();
    res.json(items);
  });

  app.post('/api/exchange/request', (req: Request, res: Response) => {
    const { fromUserId, toUserId, offerCropId, offerQuantity, requestCropId, requestQuantity } = req.body;

    if (!fromUserId || !toUserId || !offerCropId || !offerQuantity || !requestCropId || !requestQuantity) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const fromInventory = db.prepare(`
      SELECT quantity FROM inventory WHERE user_id = ? AND crop_id = ?
    `).get(fromUserId, offerCropId) as any;

    if (!fromInventory || fromInventory.quantity < offerQuantity) {
      return res.status(400).json({ error: '你的库存不足' });
    }

    const toInventory = db.prepare(`
      SELECT quantity FROM inventory WHERE user_id = ? AND crop_id = ?
    `).get(toUserId, requestCropId) as any;

    if (!toInventory || toInventory.quantity < requestQuantity) {
      return res.status(400).json({ error: '对方库存不足' });
    }

    const exchangeId = uuidv4();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO exchanges (id, from_user_id, to_user_id, offer_crop_id, offer_quantity,
                               request_crop_id, request_quantity, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(exchangeId, fromUserId, toUserId, offerCropId, offerQuantity, requestCropId, requestQuantity, now);

      const fromUser = db.prepare('SELECT username FROM users WHERE id = ?').get(fromUserId) as any;
      const toUser = db.prepare('SELECT username FROM users WHERE id = ?').get(toUserId) as any;
      const offerCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(offerCropId) as any;
      const requestCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(requestCropId) as any;

      const exchange = {
        id: exchangeId,
        status: 'pending',
        fromUser: { id: fromUserId, username: fromUser.username },
        toUser: { id: toUserId, username: toUser.username },
        offer: { cropId: offerCropId, cropName: offerCrop.name, cropEmoji: offerCrop.emoji, quantity: offerQuantity },
        request: { cropId: requestCropId, cropName: requestCrop.name, cropEmoji: requestCrop.emoji, quantity: requestQuantity },
        createdAt: now
      };

      sendToUser(toUserId, {
        type: 'exchange_request',
        data: exchange
      });

      res.json(exchange);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/exchange/:id/accept', (req: Request, res: Response) => {
    const exchangeId = req.params.id;

    const exchange = db.prepare('SELECT * FROM exchanges WHERE id = ?').get(exchangeId) as any;
    if (!exchange) {
      return res.status(404).json({ error: '交换请求不存在' });
    }
    if (exchange.status !== 'pending') {
      return res.status(400).json({ error: '交换请求已处理' });
    }

    const fromInv = db.prepare('SELECT quantity FROM inventory WHERE user_id = ? AND crop_id = ?')
      .get(exchange.from_user_id, exchange.offer_crop_id) as any;
    const toInv = db.prepare('SELECT quantity FROM inventory WHERE user_id = ? AND crop_id = ?')
      .get(exchange.to_user_id, exchange.request_crop_id) as any;

    if (!fromInv || fromInv.quantity < exchange.offer_quantity) {
      return res.status(400).json({ error: '对方库存不足' });
    }
    if (!toInv || toInv.quantity < exchange.request_quantity) {
      return res.status(400).json({ error: '你的库存不足' });
    }

    const transaction = db.transaction(() => {
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND crop_id = ?')
        .run(exchange.offer_quantity, exchange.from_user_id, exchange.offer_crop_id);
      
      db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND crop_id = ?')
        .run(exchange.request_quantity, exchange.to_user_id, exchange.request_crop_id);

      const fromHas = db.prepare('SELECT id FROM inventory WHERE user_id = ? AND crop_id = ?')
        .get(exchange.from_user_id, exchange.request_crop_id) as any;
      if (fromHas) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
          .run(exchange.request_quantity, fromHas.id);
      } else {
        db.prepare('INSERT INTO inventory (id, user_id, crop_id, quantity) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), exchange.from_user_id, exchange.request_crop_id, exchange.request_quantity);
      }

      const toHas = db.prepare('SELECT id FROM inventory WHERE user_id = ? AND crop_id = ?')
        .get(exchange.to_user_id, exchange.offer_crop_id) as any;
      if (toHas) {
        db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?')
          .run(exchange.offer_quantity, toHas.id);
      } else {
        db.prepare('INSERT INTO inventory (id, user_id, crop_id, quantity) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), exchange.to_user_id, exchange.offer_crop_id, exchange.offer_quantity);
      }

      db.prepare('UPDATE exchanges SET status = ?, updated_at = ? WHERE id = ?')
        .run('accepted', new Date().toISOString(), exchangeId);
    });

    try {
      transaction();

      const fromUser = db.prepare('SELECT username FROM users WHERE id = ?').get(exchange.from_user_id) as any;
      const toUser = db.prepare('SELECT username FROM users WHERE id = ?').get(exchange.to_user_id) as any;
      const offerCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(exchange.offer_crop_id) as any;
      const requestCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(exchange.request_crop_id) as any;

      const result = {
        id: exchangeId,
        status: 'accepted',
        fromUser: { id: exchange.from_user_id, username: fromUser.username },
        toUser: { id: exchange.to_user_id, username: toUser.username },
        offer: { cropId: exchange.offer_crop_id, cropName: offerCrop.name, cropEmoji: offerCrop.emoji, quantity: exchange.offer_quantity },
        request: { cropId: exchange.request_crop_id, cropName: requestCrop.name, cropEmoji: requestCrop.emoji, quantity: exchange.request_quantity }
      };

      sendToUser(exchange.from_user_id, {
        type: 'exchange_accepted',
        data: result
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/exchange/:id/reject', (req: Request, res: Response) => {
    const exchangeId = req.params.id;

    const exchange = db.prepare('SELECT * FROM exchanges WHERE id = ?').get(exchangeId) as any;
    if (!exchange) {
      return res.status(404).json({ error: '交换请求不存在' });
    }
    if (exchange.status !== 'pending') {
      return res.status(400).json({ error: '交换请求已处理' });
    }

    try {
      db.prepare('UPDATE exchanges SET status = ?, updated_at = ? WHERE id = ?')
        .run('rejected', new Date().toISOString(), exchangeId);

      const fromUser = db.prepare('SELECT username FROM users WHERE id = ?').get(exchange.from_user_id) as any;
      const toUser = db.prepare('SELECT username FROM users WHERE id = ?').get(exchange.to_user_id) as any;
      const offerCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(exchange.offer_crop_id) as any;
      const requestCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(exchange.request_crop_id) as any;

      const result = {
        id: exchangeId,
        status: 'rejected',
        fromUser: { id: exchange.from_user_id, username: fromUser.username },
        toUser: { id: exchange.to_user_id, username: toUser.username },
        offer: { cropId: exchange.offer_crop_id, cropName: offerCrop.name, cropEmoji: offerCrop.emoji, quantity: exchange.offer_quantity },
        request: { cropId: exchange.request_crop_id, cropName: requestCrop.name, cropEmoji: requestCrop.emoji, quantity: exchange.request_quantity }
      };

      sendToUser(exchange.from_user_id, {
        type: 'exchange_rejected',
        data: result
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/exchanges', (req: Request, res: Response) => {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const exchanges = db.prepare(`
      SELECT 
        e.id, e.status,
        e.from_user_id as "fromUserId", e.to_user_id as "toUserId",
        e.offer_crop_id as "offerCropId", e.offer_quantity as "offerQuantity",
        e.request_crop_id as "requestCropId", e.request_quantity as "requestQuantity",
        e.created_at as "createdAt"
      FROM exchanges e
      WHERE e.from_user_id = ? OR e.to_user_id = ?
      ORDER BY e.created_at DESC
    `).all(userId, userId);

    const result = exchanges.map(async (ex: any) => {
      const fromUser = db.prepare('SELECT username FROM users WHERE id = ?').get(ex.fromUserId) as any;
      const toUser = db.prepare('SELECT username FROM users WHERE id = ?').get(ex.toUserId) as any;
      const offerCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(ex.offerCropId) as any;
      const requestCrop = db.prepare('SELECT name, emoji FROM crops WHERE id = ?').get(ex.requestCropId) as any;

      return {
        id: ex.id,
        status: ex.status,
        fromUser: { id: ex.fromUserId, username: fromUser.username },
        toUser: { id: ex.toUserId, username: toUser.username },
        offer: { cropId: ex.offerCropId, cropName: offerCrop.name, cropEmoji: offerCrop.emoji, quantity: ex.offerQuantity },
        request: { cropId: ex.requestCropId, cropName: requestCrop.name, cropEmoji: requestCrop.emoji, quantity: ex.requestQuantity },
        createdAt: ex.createdAt
      };
    });

    Promise.all(result).then(data => res.json(data));
  });

  app.get('/api/user/plots', (req: Request, res: Response) => {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const plots = db.prepare(`
      SELECT 
        p.id, p.row, p.col, p.status,
        p.user_id as "userId", p.crop_id as "cropId",
        p.planted_at as "plantedAt", p.current_stage as "currentStage",
        p.stage_progress as "stageProgress", p.missed_days as "missedDays",
        c.name as "cropName", c.emoji as "cropEmoji",
        c.seed_days as "seedDays", c.sprout_days as "sproutDays",
        c.bloom_days as "bloomDays", c.harvest_days as "harvestDays",
        c.water_per_day as "waterPerDay", c.fertilize_per_day as "fertilizePerDay",
        c.weed_per_day as "weedPerDay"
      FROM plots p
      LEFT JOIN crops c ON p.crop_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.row, p.col
    `).all(userId);

    res.json(plots);
  });
}
