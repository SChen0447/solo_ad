import { Router, Request, Response } from 'express';
import { portfolios, ratings, applications, users, generateId } from '../db';
import type { Portfolio, PortfolioWithStats, Rating } from '../types';

const router = Router();

let portfolioRankHistory: Map<string, number> = new Map();

function calculatePortfolioStats(): PortfolioWithStats[] {
  const approvedPortfolios = portfolios.filter((p) => p.status === 'approved');

  const portfoliosWithScores = approvedPortfolios.map((portfolio) => {
    const portfolioRatings = ratings.filter((r) => r.portfolioId === portfolio.id);
    const averageScore =
      portfolioRatings.length > 0
        ? Math.round(
            (portfolioRatings.reduce((sum, r) => sum + r.score, 0) /
              portfolioRatings.length) *
              2
          ) / 2
        : 0;

    return {
      ...portfolio,
      averageScore,
      ratingCount: portfolioRatings.length,
      currentRank: 0,
      previousRank: portfolioRankHistory.get(portfolio.id) || 0,
    };
  });

  portfoliosWithScores.sort((a, b) => b.averageScore - a.averageScore);

  portfoliosWithScores.forEach((p, index) => {
    p.currentRank = index + 1;
  });

  portfolioRankHistory = new Map(
    portfoliosWithScores.map((p) => [p.id, p.currentRank])
  );

  return portfoliosWithScores;
}

router.get('/', (_req: Request, res: Response) => {
  const { page = '1', pageSize = '20' } = _req.query;
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);

  const portfoliosWithStats = calculatePortfolioStats();

  const startIndex = (pageNum - 1) * size;
  const endIndex = startIndex + size;
  const paginated = portfoliosWithStats.slice(startIndex, endIndex);

  const rankChanges = portfoliosWithStats
    .filter((p) => p.previousRank > 0 && p.previousRank <= 10 && p.currentRank <= 10)
    .filter((p) => Math.abs(p.currentRank - p.previousRank) >= 2)
    .map((p) => ({
      portfolioId: p.id,
      title: p.title,
      previousRank: p.previousRank,
      currentRank: p.currentRank,
      change: p.previousRank - p.currentRank,
    }));

  res.json({
    data: paginated,
    total: portfoliosWithStats.length,
    page: pageNum,
    pageSize: size,
    rankChanges,
  });
});

router.post('/', (req: Request, res: Response) => {
  const { applicationId, userId, title, link, description } = req.body;

  if (!applicationId || !userId || !title || !link || !description) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const application = applications.find((a) => a.id === applicationId);
  if (!application) {
    return res.status(404).json({ error: '申请记录不存在' });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  try {
    new URL(link);
  } catch {
    return res.status(400).json({ error: '作品链接格式不正确' });
  }

  const newPortfolio: Portfolio = {
    id: generateId(),
    applicationId,
    userId,
    authorNickname: user.nickname,
    title,
    link,
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  portfolios.push(newPortfolio);
  res.status(201).json(newPortfolio);
});

router.post('/:id/rate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, score, comment } = req.body;

  if (!userId || !score || !comment) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const portfolio = portfolios.find((p) => p.id === id);
  if (!portfolio) {
    return res.status(404).json({ error: '作品不存在' });
  }

  if (portfolio.status !== 'approved') {
    return res.status(400).json({ error: '该作品尚未通过审核' });
  }

  const scoreNum = parseInt(score as string);
  if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5 || !Number.isInteger(scoreNum)) {
    return res.status(400).json({ error: '评分必须是1-5之间的整数' });
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existingRating = ratings.find(
    (r) => r.portfolioId === id && r.userId === userId
  );
  if (existingRating) {
    existingRating.score = scoreNum;
    existingRating.comment = comment as string;
    existingRating.createdAt = new Date().toISOString();
    return res.json(existingRating);
  }

  const newRating: Rating = {
    id: generateId(),
    portfolioId: id,
    userId,
    raterNickname: user.nickname,
    score: scoreNum,
    comment: comment as string,
    createdAt: new Date().toISOString(),
  };

  ratings.push(newRating);
  res.status(201).json(newRating);
});

router.get('/:id/ratings', (req: Request, res: Response) => {
  const { id } = req.params;
  const portfolioRatings = ratings
    .filter((r) => r.portfolioId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(portfolioRatings);
});

router.get('/pending', (_req: Request, res: Response) => {
  const pendingPortfolios = portfolios.filter((p) => p.status === 'pending');
  res.json(pendingPortfolios);
});

router.post('/:id/review', (req: Request, res: Response) => {
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
