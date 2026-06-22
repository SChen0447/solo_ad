import { Router, Request, Response } from 'express';
import { applications, recruitments, clubs, interviewSlots, users, generateId } from '../db';
import type { Application } from '../types';

const router = Router();

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

router.post('/', (req: Request, res: Response) => {
  const {
    recruitmentId,
    userId,
    studentName,
    grade,
    contact,
    portfolioLinks,
  } = req.body;

  if (!recruitmentId || !userId || !studentName || !grade || !contact) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const recruitment = recruitments.find((r) => r.id === recruitmentId);
  if (!recruitment) {
    return res.status(404).json({ error: '招新信息不存在' });
  }

  if (recruitment.status !== 'published') {
    return res.status(400).json({ error: '该招新已结束或未发布' });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existingApp = applications.find(
    (a) => a.recruitmentId === recruitmentId && a.userId === userId
  );
  if (existingApp) {
    return res.status(400).json({ error: '您已经报名过该招新' });
  }

  const links = portfolioLinks || [];
  if (links.length > 3) {
    return res.status(400).json({ error: '最多只能提交3个作品链接' });
  }

  for (const link of links) {
    if (!isValidUrl(link)) {
      return res.status(400).json({ error: `作品链接格式不正确: ${link}` });
    }
  }

  const newApplication: Application = {
    id: generateId(),
    recruitmentId,
    clubId: recruitment.clubId,
    userId,
    studentName,
    grade,
    contact,
    portfolioLinks: links,
    status: 'pending',
    interviewStatus: 'none',
    createdAt: new Date().toISOString(),
  };

  applications.push(newApplication);
  res.status(201).json(newApplication);
});

router.get('/', (_req: Request, res: Response) => {
  const result = applications.map((app) => {
    const recruitment = recruitments.find((r) => r.id === app.recruitmentId);
    const club = clubs.find((c) => c.id === app.clubId);
    return {
      ...app,
      recruitmentTitle: recruitment?.title || '未知招新',
      clubName: club?.name || '未知社团',
    };
  });
  res.json(result);
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userApps = applications
    .filter((app) => app.userId === userId)
    .map((app) => {
      const recruitment = recruitments.find((r) => r.id === app.recruitmentId);
      const club = clubs.find((c) => c.id === app.clubId);
      return {
        ...app,
        recruitmentTitle: recruitment?.title || '未知招新',
        clubName: club?.name || '未知社团',
      };
    });
  res.json(userApps);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const application = applications.find((a) => a.id === id);
  if (!application) {
    return res.status(404).json({ error: '申请记录不存在' });
  }
  const recruitment = recruitments.find((r) => r.id === application.recruitmentId);
  const club = clubs.find((c) => c.id === application.clubId);
  res.json({
    ...application,
    recruitmentTitle: recruitment?.title || '未知招新',
    clubName: club?.name || '未知社团',
  });
});

router.post('/:id/book-slot', (req: Request, res: Response) => {
  const { id } = req.params;
  const { slotId } = req.body;

  if (!slotId) {
    return res.status(400).json({ error: '缺少面试时间槽ID' });
  }

  const application = applications.find((a) => a.id === id);
  if (!application) {
    return res.status(404).json({ error: '申请记录不存在' });
  }

  if (application.status === 'pending') {
    return res.status(400).json({ error: '申请尚未通过初审，无法预约面试' });
  }

  if (application.interviewStatus === 'scheduled') {
    return res.status(400).json({ error: '您已经预约了面试时间' });
  }

  const slot = interviewSlots.find((s) => s.id === slotId);
  if (!slot) {
    return res.status(404).json({ error: '面试时间槽不存在' });
  }

  if (slot.recruitmentId !== application.recruitmentId) {
    return res.status(400).json({ error: '该时间槽不属于当前招新' });
  }

  if (slot.currentCount >= slot.maxCapacity) {
    return res.status(400).json({ error: '该时间槽已预约满' });
  }

  slot.currentCount += 1;
  application.interviewSlotId = slotId;
  application.interviewStatus = 'scheduled';

  res.json({
    success: true,
    application,
    slot,
  });
});

router.get('/:id/slots', (req: Request, res: Response) => {
  const { id } = req.params;
  const application = applications.find((a) => a.id === id);
  if (!application) {
    return res.status(404).json({ error: '申请记录不存在' });
  }

  const availableSlots = interviewSlots
    .filter((s) => s.recruitmentId === application.recruitmentId)
    .map((s) => ({
      ...s,
      remainingSlots: s.maxCapacity - s.currentCount,
      isFull: s.currentCount >= s.maxCapacity,
    }));

  res.json(availableSlots);
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, interviewStatus } = req.body;

  const application = applications.find((a) => a.id === id);
  if (!application) {
    return res.status(404).json({ error: '申请记录不存在' });
  }

  if (status && ['pending', 'reviewing', 'accepted', 'rejected'].includes(status)) {
    application.status = status;
    application.reviewedAt = new Date().toISOString();
  }

  if (interviewStatus && ['scheduled', 'completed', 'missed', 'none'].includes(interviewStatus)) {
    application.interviewStatus = interviewStatus;
  }

  res.json(application);
});

router.delete('/:id', (req: Request, res: Response) => {
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

export default router;
