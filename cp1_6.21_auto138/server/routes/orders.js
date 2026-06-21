import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM communications c WHERE c.order_id = o.id) as comm_count,
      (SELECT COUNT(*) FROM order_attachments a WHERE a.order_id = o.id) as attach_count
    FROM orders o
    ORDER BY o.created_at DESC
  `).all();
  
  orders.forEach(order => {
    const history = db.prepare(`
      SELECT * FROM order_status_history 
      WHERE order_id = ? 
      ORDER BY changed_at ASC
    `).all(order.id);
    order.status_history = history;
    
    const communications = db.prepare(`
      SELECT * FROM communications 
      WHERE order_id = ? 
      ORDER BY communication_date DESC, created_at DESC
    `).all(order.id);
    order.communications = communications;
    
    const attachments = db.prepare(`
      SELECT * FROM order_attachments 
      WHERE order_id = ? 
      ORDER BY created_at DESC
    `).all(order.id);
    order.attachments = attachments;
  });
  
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  order.status_history = db.prepare(`
    SELECT * FROM order_status_history 
    WHERE order_id = ? 
    ORDER BY changed_at ASC
  `).all(id);
  
  order.communications = db.prepare(`
    SELECT * FROM communications 
    WHERE order_id = ? 
    ORDER BY communication_date DESC, created_at DESC
  `).all(id);
  
  order.attachments = db.prepare(`
    SELECT * FROM order_attachments 
    WHERE order_id = ? 
    ORDER BY created_at DESC
  `).all(id);
  
  res.json(order);
});

router.post('/', (req, res) => {
  const { customer_name, customer_phone, work_name, order_type, deadline, notes, status } = req.body;
  
  if (!customer_name || !work_name) {
    return res.status(400).json({ error: '客户姓名和作品名称必填' });
  }
  
  const result = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, work_name, order_type, deadline, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer_name,
    customer_phone || '',
    work_name,
    order_type || 'by_piece',
    deadline || null,
    notes || '',
    status || 'pending'
  );
  
  const orderId = result.lastInsertRowid;
  
  db.prepare(`
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (?, ?, ?)
  `).run(orderId, null, status || 'pending');
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  order.status_history = [{ to_status: status || 'pending', changed_at: order.created_at }];
  order.communications = [];
  order.attachments = [];
  
  res.status(201).json(order);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, work_name, order_type, deadline, notes, status } = req.body;
  
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  db.prepare(`
    UPDATE orders 
    SET customer_name = ?, customer_phone = ?, work_name = ?, order_type = ?, 
        deadline = ?, notes = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    customer_name || existing.customer_name,
    customer_phone !== undefined ? customer_phone : existing.customer_phone,
    work_name || existing.work_name,
    order_type || existing.order_type,
    deadline !== undefined ? deadline : existing.deadline,
    notes !== undefined ? notes : existing.notes,
    id
  );
  
  if (status && status !== existing.status) {
    db.prepare(`
      UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?
    `).run(status, id);
    
    db.prepare(`
      INSERT INTO order_status_history (order_id, from_status, to_status)
      VALUES (?, ?, ?)
    `).run(id, existing.status, status);
  }
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  order.status_history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC').all(id);
  order.communications = db.prepare('SELECT * FROM communications WHERE order_id = ? ORDER BY communication_date DESC, created_at DESC').all(id);
  order.attachments = db.prepare('SELECT * FROM order_attachments WHERE order_id = ? ORDER BY created_at DESC').all(id);
  
  res.json(order);
});

router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: '状态必填' });
  }
  
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  if (status === existing.status) {
    return res.json({ ...existing, unchanged: true });
  }
  
  db.prepare(`
    UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?
  `).run(status, id);
  
  db.prepare(`
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (?, ?, ?)
  `).run(id, existing.status, status);
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  order.status_history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC').all(id);
  order.communications = db.prepare('SELECT * FROM communications WHERE order_id = ? ORDER BY communication_date DESC, created_at DESC').all(id);
  order.attachments = db.prepare('SELECT * FROM order_attachments WHERE order_id = ? ORDER BY created_at DESC').all(id);
  
  res.json(order);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  res.json({ success: true });
});

router.post('/:id/communications', (req, res) => {
  const { id } = req.params;
  const { communication_date, method, content } = req.body;
  
  if (!communication_date || !method || !content) {
    return res.status(400).json({ error: '沟通日期、方式和内容必填' });
  }
  
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO communications (order_id, communication_date, method, content)
    VALUES (?, ?, ?, ?)
  `).run(id, communication_date, method, content);
  
  db.prepare(`
    UPDATE orders SET last_communication = ?, updated_at = datetime('now','localtime') WHERE id = ?
  `).run(communication_date, id);
  
  const comm = db.prepare('SELECT * FROM communications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(comm);
});

router.get('/:id/communications', (req, res) => {
  const { id } = req.params;
  const { start_date, end_date, keyword } = req.query;
  
  let sql = 'SELECT * FROM communications WHERE order_id = ?';
  const params = [id];
  
  if (start_date) {
    sql += ' AND communication_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND communication_date <= ?';
    params.push(end_date);
  }
  if (keyword) {
    sql += ' AND content LIKE ?';
    params.push(`%${keyword}%`);
  }
  
  sql += ' ORDER BY communication_date DESC, created_at DESC';
  
  const communications = db.prepare(sql).all(...params);
  res.json(communications);
});

export default router;
