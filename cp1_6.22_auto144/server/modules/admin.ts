import { Router, Request, Response } from 'express';
import {
  applications,
  recruitments,
  clubs,
  interviewSlots,
  portfolios,
  users,
  generateId,
} from '../db';
import type { InterviewSlot } from '../types';

const router = Router();

router.get('/management', (_req: Request, res: Response) => {
  const result = applications.map((app) => {
    const recruitment = recruitments.find((r) => r.id === app.recruitmentId);
    const club = clubs.find((c) => c.id === app.clubId);
    const user = users.find((u) => u.id === app.userId);
    const slot = app.interviewSlotId
      ? interviewSlots.find((s) => s.id === app.interviewSlotId)
      : null;
    return {
      ...app,
      recruitmentTitle: recruitment?.title || '未知招新',
      clubName: club?.name || '未知社团',
      userEmail: user?.email || '未知邮箱',
      interviewSlot: slot
        ? {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        : null,
    };
  });

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    reviewing: applications.filter((a) => a.status === 'reviewing').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  res.json({
    applications: result,
    stats,
    clubs: clubs.map((c) => ({ id: c.id, name: c.name })),
    recruitments: recruitments.map((r) => ({
      id: r.id,
      title: r.title,
      clubId: r.clubId,
      status: r.status,
    })),
  });
});

router.get('/applications/filter', (req: Request, res: Response) => {
  const { clubId, status, recruitmentId } = req.query;

  let filtered = [...applications];

  if (clubId) {
    filtered = filtered.filter((a) => a.clubId === clubId);
  }
  if (status) {
    filtered = filtered.filter((a) => a.status === status);
  }
  if (recruitmentId) {
    filtered = filtered.filter((a) => a.recruitmentId === recruitmentId);
  }

  const result = filtered.map((app) => {
    const recruitment = recruitments.find((r) => r.id === app.recruitmentId);
    const club = clubs.find((c) => c.id === app.clubId);
    const user = users.find((u) => u.id === app.userId);
    const slot = app.interviewSlotId
      ? interviewSlots.find((s) => s.id === app.interviewSlotId)
      : null;
    return {
      ...app,
      recruitmentTitle: recruitment?.title || '未知招新',
      clubName: club?.name || '未知社团',
      userEmail: user?.email || '未知邮箱',
      interviewSlot: slot
        ? {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }
        : null,
    };
  });

  res.json(result);
});

router.delete('/applications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = applications.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '申请记录不存在' });
  }

  const app = applications[index];
  if (app.interviewSlotId) {
    const slot = interviewSlots.find((s) => s.id === app.interviewSlotId);
    if (slot && slot.currentCount > 0) {
      slot.currentCount -= 1;
    }
  }

  applications.splice(index, 1);
  res.json({ success: true, message: '申请记录已删除' });
});

router.post('/interview-slots', (req: Request, res: Response) => {
  const { recruitmentId, date, startTime, endTime, maxCapacity } = req.body;

  if (!recruitmentId || !date || !startTime || !endTime || !maxCapacity) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const recruitment = recruitments.find((r) => r.id === recruitmentId);
  if (!recruitment) {
    return res.status(404).json({ error: '招新信息不存在' });
  }

  const capacity = parseInt(maxCapacity as string);
  if (isNaN(capacity) || capacity <= 0) {
    return res.status(400).json({ error: '最大人数必须是正整数' });
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ error: '时间格式不正确，应为 HH:MM' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: '日期格式不正确，应为 YYYY-MM-DD' });
  }

  const newSlot: InterviewSlot = {
    id: generateId(),
    recruitmentId,
    date,
    startTime,
    endTime,
    maxCapacity: capacity,
    currentCount: 0,
    createdAt: new Date().toISOString(),
  };

  interviewSlots.push(newSlot);
  res.status(201).json(newSlot);
});

router.get('/interview-slots/:recruitmentId', (req: Request, res: Response) => {
  const { recruitmentId } = req.params;
  const slots = interviewSlots
    .filter((s) => s.recruitmentId === recruitmentId)
    .map((s) => ({
      ...s,
      remainingSlots: s.maxCapacity - s.currentCount,
      isFull: s.currentCount >= s.maxCapacity,
    }));
  res.json(slots);
});

router.delete('/interview-slots/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = interviewSlots.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '面试时间槽不存在' });
  }

  const slot = interviewSlots[index];
  if (slot.currentCount > 0) {
    const affectedApps = applications.filter((a) => a.interviewSlotId === id);
    affectedApps.forEach((app) => {
      app.interviewSlotId = undefined;
      app.interviewStatus = 'none';
    });
  }

  interviewSlots.splice(index, 1);
  res.json({ success: true, message: '面试时间槽已删除' });
});

router.get('/portfolios/pending', (_req: Request, res: Response) => {
  const pending = portfolios
    .filter((p) => p.status === 'pending')
    .map((p) => {
      const user = users.find((u) => u.id === p.userId);
      const app = applications.find((a) => a.id === p.applicationId);
      return {
        ...p,
        userName: user?.name || '未知用户',
        userEmail: user?.email || '未知邮箱',
        studentName: app?.studentName || '未知学生',
      };
    });
  res.json(pending);
});

router.post('/portfolios/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '无效的审核状态' });
  }

  const portfolio = portfolios.find((p) => p.id === id);
  if (!portfolio) {
    return res.status(404).json({ error: '作品不存在' });
  }

  portfolio.status = status;
  portfolio.reviewedAt = new Date().toISOString();
  res.json(portfolio);
});

export default router;
