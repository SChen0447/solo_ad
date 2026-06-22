import { Router, Request, Response } from 'express';
import { clubs, recruitments, applications, generateId } from '../db';
import type { Recruitment, RecruitmentStats } from '../types';

const router = Router();

router.get('/stats', (_req: Request, res: Response<RecruitmentStats>) => {
  const totalApplications = applications.length;
  const totalInterviewed = applications.filter(
    (app) => app.interviewStatus === 'completed'
  ).length;
  const acceptedCount = applications.filter((app) => app.status === 'accepted').length;
  const acceptanceRate =
    totalApplications > 0
      ? Math.round((acceptedCount / totalApplications) * 100) / 100
      : 0;

  const clubStats = clubs.map((club) => ({
    clubId: club.id,
    clubName: club.name,
    applicationCount: applications.filter((app) => app.clubId === club.id).length,
  }));

  const interviewedCount = applications.filter(
    (app) => app.interviewStatus === 'completed' || app.interviewStatus === 'scheduled'
  ).length;
  const interviewCompletionRate =
    totalApplications > 0
      ? Math.round((interviewedCount / totalApplications) * 100) / 100
      : 0;

  res.json({
    totalApplications,
    totalInterviewed,
    acceptanceRate,
    clubStats,
    interviewCompletionRate,
  });
});

router.post('/new', (req: Request, res: Response<Recruitment | { error: string }>) => {
  const { clubId, title, description, deadline } = req.body;

  if (!clubId || !title || !description || !deadline) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const club = clubs.find((c) => c.id === clubId);
  if (!club) {
    return res.status(404).json({ error: '社团不存在' });
  }

  const newRecruitment: Recruitment = {
    id: generateId(),
    clubId,
    title,
    description,
    deadline,
    status: 'published',
    createdAt: new Date().toISOString(),
  };

  recruitments.push(newRecruitment);
  res.status(201).json(newRecruitment);
});

router.get('/list', (_req: Request, res: Response) => {
  const result = recruitments
    .filter((r) => r.status === 'published')
    .map((r) => {
      const club = clubs.find((c) => c.id === r.clubId);
      const applicationCount = applications.filter((app) => app.recruitmentId === r.id).length;
      return {
        ...r,
        clubName: club?.name || '未知社团',
        applicationCount,
      };
    });
  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const recruitment = recruitments.find((r) => r.id === id);
  if (!recruitment) {
    return res.status(404).json({ error: '招新信息不存在' });
  }
  const club = clubs.find((c) => c.id === recruitment.clubId);
  const applicationCount = applications.filter((app) => app.recruitmentId === id).length;
  res.json({
    ...recruitment,
    clubName: club?.name || '未知社团',
    applicationCount,
  });
});

export default router;
