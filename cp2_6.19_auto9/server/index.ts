import express, { Request, Response } from 'express';
import net from 'net';
import {
  getPosts,
  getPost,
  addPost,
  getComments,
  addComment,
  toggleTop,
  toggleFeatured,
  getTags,
  getStats,
  getCommentCount,
  generateMorePosts
} from './data';

const app = express();
const START_PORT = 3001;
const MAX_PORT_TRIES = 10;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/tags', (req: Request, res: Response) => {
  const tags = getTags();
  res.json(tags);
});

app.get('/api/posts', (req: Request, res: Response) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const posts = getPosts(tag, sort);
  const postsWithCount = posts.map(p => ({
    ...p,
    commentCount: getCommentCount(p.id)
  }));
  res.json(postsWithCount);
});

app.get('/api/posts/:id', (req: Request, res: Response) => {
  const post = getPost(req.params.id);
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  res.json(post);
});

app.post('/api/posts', (req: Request, res: Response) => {
  const { title, content, tag, author } = req.body;
  
  if (!title || !content || !tag || !author) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const post = addPost(title, content, tag, author);
  res.status(201).json(post);
});

app.get('/api/posts/:id/comments', (req: Request, res: Response) => {
  const comments = getComments(req.params.id);
  res.json(comments);
});

app.post('/api/posts/:id/comments', (req: Request, res: Response) => {
  const { author, content } = req.body;
  
  if (!author || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const comment = addComment(req.params.id, author, content);
  
  if (!comment) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  
  res.status(201).json(comment);
});

app.put('/api/posts/:id/top', (req: Request, res: Response) => {
  const post = toggleTop(req.params.id);
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  res.json(post);
});

app.put('/api/posts/:id/featured', (req: Request, res: Response) => {
  const post = toggleFeatured(req.params.id);
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }
  res.json(post);
});

app.get('/api/stats', (req: Request, res: Response) => {
  const stats = getStats();
  res.json(stats);
});

app.post('/api/generate-more', (req: Request, res: Response) => {
  const { count } = req.body;
  generateMorePosts(count || 20);
  res.json({ success: true, count: count || 20 });
});

const checkPortAvailable = (port: number): Promise<boolean> => {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};

const startServer = async () => {
  let port = START_PORT;
  let found = false;
  
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const available = await checkPortAvailable(port);
    if (available) {
      found = true;
      break;
    }
    console.log(`端口 ${port} 被占用，尝试下一个端口...`);
    port++;
  }
  
  if (!found) {
    console.error(`错误：无法找到可用端口（已尝试 ${MAX_PORT_TRIES} 个端口）`);
    process.exit(1);
  }
  
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  
  return port;
};

startServer();

export default app;
