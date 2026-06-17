import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { dataStore } from './dataStore';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '127.0.0.1';
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

interface StallCreateBody {
  name?: string;
  ownerNickname?: string;
  description?: string;
  images?: string[];
}

interface CommentBody {
  nickname?: string;
  content?: string;
}

app.get('/api/stalls', (_req, res) => {
  const stalls = dataStore.getAllStalls();
  res.json({
    data: stalls.map(s => ({
      id: s.id,
      name: s.name,
      ownerNickname: s.ownerNickname,
      description: s.description,
      images: s.images,
      likesCount: s.likes.length,
      commentsCount: s.comments.length,
      interactionCount: s.likes.length + s.comments.length,
      createdAt: s.createdAt
    }))
  });
});

app.get('/api/stalls/:id', (req, res) => {
  const stall = dataStore.getStallById(req.params.id);
  if (!stall) {
    res.status(404).json({ error: '摊位不存在' });
    return;
  }
  const ip = getClientIp(req);
  res.json({
    data: {
      id: stall.id,
      name: stall.name,
      ownerNickname: stall.ownerNickname,
      description: stall.description,
      images: stall.images,
      likesCount: stall.likes.length,
      commentsCount: stall.comments.length,
      interactionCount: stall.likes.length + stall.comments.length,
      liked: dataStore.checkLiked(stall.id, ip),
      comments: stall.comments,
      createdAt: stall.createdAt
    }
  });
});

app.post('/api/stalls', (req, res) => {
  const body = req.body as StallCreateBody;
  const errors: string[] = [];

  if (!body.name || body.name.trim().length === 0) {
    errors.push('摊位名称为必填项');
  }
  if (!body.ownerNickname || body.ownerNickname.trim().length === 0) {
    errors.push('摊主昵称为必填项');
  }
  if (!body.description || body.description.trim().length === 0) {
    errors.push('作品简介为必填项');
  } else if (body.description.length > 200) {
    errors.push('作品简介最多200字');
  }
  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    errors.push('至少上传1张作品图片');
  } else if (body.images.length > 3) {
    errors.push('最多上传3张作品图片');
  } else {
    body.images.forEach((url, idx) => {
      if (!isValidUrl(url)) {
        errors.push(`第${idx + 1}张图片URL格式不正确`);
      }
    });
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join('；') });
    return;
  }

  const stall = dataStore.createStall({
    name: body.name!,
    ownerNickname: body.ownerNickname!,
    description: body.description!,
    images: body.images!
  });

  res.status(201).json({
    data: {
      id: stall.id,
      name: stall.name,
      ownerNickname: stall.ownerNickname,
      description: stall.description,
      images: stall.images,
      likesCount: 0,
      commentsCount: 0,
      interactionCount: 0,
      createdAt: stall.createdAt
    }
  });
});

app.put('/api/stalls/:id', (req, res) => {
  const body = req.body as StallCreateBody;
  const existing = dataStore.getStallById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: '摊位不存在' });
    return;
  }

  const errors: string[] = [];
  if (body.name !== undefined && body.name.trim().length === 0) {
    errors.push('摊位名称不能为空');
  }
  if (body.ownerNickname !== undefined && body.ownerNickname.trim().length === 0) {
    errors.push('摊主昵称不能为空');
  }
  if (body.description !== undefined) {
    if (body.description.trim().length === 0) {
      errors.push('作品简介不能为空');
    } else if (body.description.length > 200) {
      errors.push('作品简介最多200字');
    }
  }
  if (body.images !== undefined) {
    if (body.images.length === 0) {
      errors.push('至少保留1张作品图片');
    } else if (body.images.length > 3) {
      errors.push('最多3张作品图片');
    } else {
      body.images.forEach((url, idx) => {
        if (!isValidUrl(url)) {
          errors.push(`第${idx + 1}张图片URL格式不正确`);
        }
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join('；') });
    return;
  }

  const updated = dataStore.updateStall(req.params.id, {
    name: body.name,
    ownerNickname: body.ownerNickname,
    description: body.description,
    images: body.images
  });

  res.json({
    data: updated && {
      id: updated.id,
      name: updated.name,
      ownerNickname: updated.ownerNickname,
      description: updated.description,
      images: updated.images,
      likesCount: updated.likes.length,
      commentsCount: updated.comments.length,
      interactionCount: updated.likes.length + updated.comments.length,
      createdAt: updated.createdAt
    }
  });
});

app.delete('/api/stalls/:id', (req, res) => {
  const success = dataStore.deleteStall(req.params.id);
  if (!success) {
    res.status(404).json({ error: '摊位不存在' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/stalls/:id/like', (req, res) => {
  const ip = getClientIp(req);
  const result = dataStore.likeStall(req.params.id, ip);
  if (!result.success) {
    if (result.likesCount === 0) {
      res.status(404).json({ error: '摊位不存在' });
    } else {
      res.status(429).json({
        error: '操作过于频繁，请稍后再试',
        likesCount: result.likesCount
      });
    }
    return;
  }
  res.json({
    liked: result.liked,
    likesCount: result.likesCount
  });
});

app.post('/api/stalls/:id/comments', (req, res) => {
  const body = req.body as CommentBody;
  const errors: string[] = [];

  if (!body.nickname || body.nickname.trim().length === 0) {
    errors.push('昵称为必填项');
  }
  if (!body.content || body.content.trim().length === 0) {
    errors.push('留言内容为必填项');
  } else if (body.content.length > 100) {
    errors.push('留言内容最多100字');
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join('；') });
    return;
  }

  const comment = dataStore.addComment(req.params.id, {
    nickname: body.nickname!,
    content: body.content!
  });

  if (!comment) {
    res.status(404).json({ error: '摊位不存在' });
    return;
  }

  res.status(201).json({ data: comment });
});

app.get('/api/leaderboard', (_req, res) => {
  const stalls = dataStore.getAllStalls();
  const ranked = stalls
    .map(s => ({
      id: s.id,
      name: s.name,
      ownerNickname: s.ownerNickname,
      images: s.images,
      likesCount: s.likes.length,
      commentsCount: s.comments.length,
      interactionCount: s.likes.length + s.comments.length
    }))
    .sort((a, b) => b.interactionCount - a.interactionCount)
    .slice(0, 5);

  res.json({ data: ranked });
});

app.listen(PORT, () => {
  console.log(`创意集市后端服务已启动: http://localhost:${PORT}`);
});
