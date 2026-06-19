import express, { Request, Response } from 'express';
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
  generateMorePosts
} from './data';

const app = express();
const PORT = 3001;

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
  const posts = getPosts(tag);
  res.json(posts);
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
