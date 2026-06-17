import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

interface Stage {
  id: string;
  code: string;
  name: string;
  description: string;
  startTime: string;
  votingEnabled: boolean;
  ratings: number[];
}

interface Comment {
  id: string;
  stageId: string;
  nickname: string;
  avatar: string;
  seatNumber: string;
  content: string;
  rating: number;
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const stagesMap = new Map<string, Stage>();
const commentsList: Comment[] = [];

function generateStageCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getStageStats(stage: Stage) {
  const ratings = stage.ratings;
  if (ratings.length === 0) {
    return { average: 0, count: 0, max: 0 };
  }
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = sum / ratings.length;
  const max = Math.max(...ratings);
  return { average: Math.round(average * 10) / 10, count: ratings.length, max };
}

app.get('/api/stages', (req, res) => {
  const stages = Array.from(stagesMap.values()).map((stage) => ({
    id: stage.id,
    code: stage.code,
    name: stage.name,
    description: stage.description,
    startTime: stage.startTime,
    votingEnabled: stage.votingEnabled,
    ...getStageStats(stage),
  }));
  res.json(stages);
});

app.post('/api/stages', (req, res) => {
  if (stagesMap.size >= 10) {
    return res.status(400).json({ error: '最多只能创建10个舞台' });
  }

  const { name, description, startTime } = req.body;
  if (!name || !startTime) {
    return res.status(400).json({ error: '舞台名称和起始时间不能为空' });
  }

  const id = uuidv4();
  const code = generateStageCode();

  const stage: Stage = {
    id,
    code,
    name,
    description: description || '',
    startTime,
    votingEnabled: false,
    ratings: [],
  };

  stagesMap.set(id, stage);

  res.status(201).json({
    id: stage.id,
    code: stage.code,
    name: stage.name,
    description: stage.description,
    startTime: stage.startTime,
    votingEnabled: stage.votingEnabled,
    ...getStageStats(stage),
  });
});

app.post('/api/stages/:id/toggle', (req, res) => {
  const { id } = req.params;
  const stage = stagesMap.get(id);

  if (!stage) {
    return res.status(404).json({ error: '舞台不存在' });
  }

  stage.votingEnabled = !stage.votingEnabled;
  stagesMap.set(id, stage);

  res.json({
    id: stage.id,
    votingEnabled: stage.votingEnabled,
  });
});

app.post('/api/stages/:id/vote', (req, res) => {
  const { id } = req.params;
  const stage = stagesMap.get(id);

  if (!stage) {
    return res.status(404).json({ error: '舞台不存在' });
  }

  if (!stage.votingEnabled) {
    return res.status(400).json({ error: '当前舞台投票已关闭' });
  }

  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  stage.ratings.push(rating);
  stagesMap.set(id, stage);

  res.json({
    success: true,
    ...getStageStats(stage),
  });
});

app.get('/api/comments', (req, res) => {
  const { since } = req.query;
  let comments = commentsList;

  if (since) {
    const sinceTime = parseInt(since as string, 10);
    comments = commentsList.filter((c) => c.createdAt > sinceTime);
  }

  const result = comments
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 200)
    .map((comment) => {
      const stage = stagesMap.get(comment.stageId);
      return {
        ...comment,
        stageName: stage?.name || '未知舞台',
      };
    });

  res.json(result);
});

app.post('/api/comments', (req, res) => {
  const { stageCode, nickname, seatNumber, content, rating } = req.body;

  if (!stageCode || !nickname || !content || !rating) {
    return res.status(400).json({ error: '参数不完整' });
  }

  if (content.length > 200) {
    return res.status(400).json({ error: '评论不能超过200字' });
  }

  const stage = Array.from(stagesMap.values()).find((s) => s.code === stageCode);
  if (!stage) {
    return res.status(404).json({ error: '舞台不存在' });
  }

  if (!stage.votingEnabled) {
    return res.status(400).json({ error: '当前舞台投票已关闭' });
  }

  const gradientColors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #30cfd0, #330867)',
    'linear-gradient(135deg, #a8edea, #fed6e3)',
    'linear-gradient(135deg, #ff9a9e, #fecfef)',
  ];
  const avatar = gradientColors[Math.floor(Math.random() * gradientColors.length)];

  const comment: Comment = {
    id: uuidv4(),
    stageId: stage.id,
    nickname,
    avatar,
    seatNumber: seatNumber || '',
    content,
    rating,
    createdAt: Date.now(),
  };

  commentsList.unshift(comment);

  stage.ratings.push(rating);
  stagesMap.set(stage.id, stage);

  res.status(201).json({
    ...comment,
    stageName: stage.name,
  });
});

app.get('/api/captcha', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let captcha = '';
  for (let i = 0; i < 4; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  res.json({ captcha });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
