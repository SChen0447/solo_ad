import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const uploadsDir = path.join(path.dirname(__dirname), 'uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `material-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG 格式的图片'));
    }
  }
});

router.get('/', (req, res) => {
  const { tag, sort } = req.query;
  
  let sql = `
    SELECT DISTINCT m.*,
      (SELECT GROUP_CONCAT(t.tag, ',') FROM material_tags t WHERE t.material_id = m.id) as tags_str
    FROM materials m
  `;
  const params = [];
  
  if (tag) {
    sql += ` INNER JOIN material_tags t ON t.material_id = m.id WHERE t.tag = ?`;
    params.push(tag);
  }
  
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY m.created_at ${order}`;
  
  const materials = db.prepare(sql).all(...params);
  
  materials.forEach(m => {
    m.tags = m.tags_str ? m.tags_str.split(',') : [];
    delete m.tags_str;
  });
  
  res.json(materials);
});

router.get('/tags', (req, res) => {
  const tags = db.prepare(`
    SELECT DISTINCT tag FROM material_tags ORDER BY tag
  `).all().map(row => row.tag);
  res.json(tags);
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }
    
    const ext = path.extname(req.file.filename);
    const thumbName = `thumb-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    const thumbPath = path.join(thumbnailsDir, thumbName);
    
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .toFile(thumbPath);
    
    const relativePath = path.relative(path.dirname(__dirname), req.file.path).replace(/\\/g, '/');
    const relativeThumbPath = path.relative(path.dirname(__dirname), thumbPath).replace(/\\/g, '/');
    
    const result = db.prepare(`
      INSERT INTO materials (file_path, thumbnail_path, file_name)
      VALUES (?, ?, ?)
    `).run(relativePath, relativeThumbPath, req.file.originalname);
    
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);
    material.tags = [];
    
    res.status(201).json(material);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '上传处理失败' });
  }
});

router.post('/:id/tags', (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  
  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: '标签必须是数组' });
  }
  
  if (tags.length > 3) {
    return res.status(400).json({ error: '最多添加3个标签' });
  }
  
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  if (!material) {
    return res.status(404).json({ error: '素材不存在' });
  }
  
  db.prepare('DELETE FROM material_tags WHERE material_id = ?').run(id);
  
  const insertStmt = db.prepare('INSERT INTO material_tags (material_id, tag) VALUES (?, ?)');
  const transaction = db.transaction(tagsToAdd => {
    for (const tag of tagsToAdd) {
      if (tag && tag.trim()) {
        insertStmt.run(id, tag.trim());
      }
    }
  });
  transaction(tags);
  
  const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  const savedTags = db.prepare('SELECT tag FROM material_tags WHERE material_id = ? ORDER BY tag').all(id).map(r => r.tag);
  updated.tags = savedTags;
  
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  
  if (!material) {
    return res.status(404).json({ error: '素材不存在' });
  }
  
  const baseDir = path.dirname(__dirname);
  
  try {
    const fullPath = path.join(baseDir, material.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    
    if (material.thumbnail_path) {
      const thumbFullPath = path.join(baseDir, material.thumbnail_path);
      if (fs.existsSync(thumbFullPath)) fs.unlinkSync(thumbFullPath);
    }
  } catch (err) {
    console.error('Delete file error:', err);
  }
  
  db.prepare('DELETE FROM materials WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
