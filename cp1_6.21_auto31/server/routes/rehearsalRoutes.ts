import { Router } from 'express';
import { dataStore, Rehearsal } from '../services/dataStore.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const rehearsals = await dataStore.getAllRehearsals();
    res.json(rehearsals);
  } catch (error) {
    res.status(500).json({ error: '获取排练列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rehearsal = await dataStore.getRehearsalById(req.params.id);
    if (!rehearsal) {
      res.status(404).json({ error: '排练不存在' });
      return;
    }
    res.json(rehearsal);
  } catch (error) {
    res.status(500).json({ error: '获取排练详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, date, duration, songs, goals } = req.body;
    if (!title || !date || !duration) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const rehearsal: Omit<Rehearsal, '_id' | 'createdAt'> = {
      title,
      date: Number(date),
      duration: Number(duration),
      songs: songs || [],
      goals: goals || [],
      status: 'scheduled',
    };

    const created = await dataStore.createRehearsal(rehearsal);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: '创建排练失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rehearsal = await dataStore.updateRehearsal(req.params.id, req.body);
    if (!rehearsal) {
      res.status(404).json({ error: '排练不存在' });
      return;
    }
    res.json(rehearsal);
  } catch (error) {
    res.status(500).json({ error: '更新排练失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const success = await dataStore.deleteRehearsal(req.params.id);
    if (!success) {
      res.status(404).json({ error: '排练不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除排练失败' });
  }
});

router.get('/:id/report', async (req, res) => {
  try {
    const rehearsal = await dataStore.getRehearsalById(req.params.id);
    if (!rehearsal) {
      res.status(404).json({ error: '排练不存在' });
      return;
    }

    const songs = await Promise.all(
      rehearsal.songs.map(async (rs) => {
        const song = await dataStore.getSongById(rs.songId);
        const rating = rehearsal.ratings?.find((r) => r.songId === rs.songId);
        const songTime = rehearsal.songTimes?.find((t) => t.songId === rs.songId);
        return {
          songId: rs.songId,
          title: song?.title || '未知曲目',
          targetProgress: rs.targetProgress,
          actualProgress: rs.actualProgress || 0,
          duration: songTime?.duration || 0,
          score: rating?.score || 0,
          feedback: rating?.feedback || '',
        };
      })
    );

    const report = {
      rehearsalId: rehearsal._id,
      title: rehearsal.title,
      date: rehearsal.date,
      totalDuration: rehearsal.duration,
      songs,
      averageScore: songs.length > 0 ? songs.reduce((sum, s) => sum + s.score, 0) / songs.length : 0,
      overallProgress: songs.length > 0 ? songs.reduce((sum, s) => sum + s.actualProgress, 0) / songs.length : 0,
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: '生成报告失败' });
  }
});

export default router;
