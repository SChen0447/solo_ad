import { Router } from 'express';
import { dataStore, Song, SongPart } from '../services/dataStore.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const songs = await dataStore.getAllSongs();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: '获取曲目列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const song = await dataStore.getSongById(req.params.id);
    if (!song) {
      res.status(404).json({ error: '曲目不存在' });
      return;
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: '获取曲目详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, key, bpm, difficulty, parts } = req.body;
    if (!title || !key || !bpm) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const songParts: SongPart[] = (parts || []).map((part: any) => ({
      id: uuidv4(),
      instrument: part.instrument,
      type: part.type || 'tab',
      content: part.content || '',
      annotations: [],
    }));

    const song = await dataStore.createSong({
      title,
      key,
      bpm: Number(bpm),
      difficulty: Number(difficulty) || 3,
      parts: songParts,
    });
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: '创建曲目失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const song = await dataStore.updateSong(req.params.id, req.body);
    if (!song) {
      res.status(404).json({ error: '曲目不存在' });
      return;
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: '更新曲目失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteSong(req.params.id);
    if (!success) {
      res.status(404).json({ error: '曲目不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除曲目失败' });
  }
});

router.post('/:id/annotations', async (req, res) => {
  try {
    const { partId, measure, text, author, color } = req.body;
    const annotation = await dataStore.addAnnotation(req.params.id, partId, {
      partId,
      measure: Number(measure),
      text,
      author,
      color: color || '#fff9c4',
    });
    if (!annotation) {
      res.status(404).json({ error: '曲目或分谱不存在' });
      return;
    }
    res.status(201).json(annotation);
  } catch (error) {
    res.status(500).json({ error: '添加注释失败' });
  }
});

router.delete('/:id/annotations/:annotationId', async (req, res) => {
  try {
    const { partId } = req.body;
    const success = await dataStore.deleteAnnotation(req.params.id, partId, req.params.annotationId);
    if (!success) {
      res.status(404).json({ error: '注释不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除注释失败' });
  }
});

export default router;
