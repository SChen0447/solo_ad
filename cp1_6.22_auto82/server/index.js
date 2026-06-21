import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3099;

app.use(cors());
app.use(express.json());

let markdowns = [];

app.get('/api/markdowns', (_req, res) => {
  const sorted = [...markdowns].sort((a, b) => a.timestamp - b.timestamp);
  res.json(sorted);
});

app.post('/api/markdowns', (req, res) => {
  const { type, title, timestamp, question, options } = req.body;

  if (!type || !title || typeof timestamp !== 'number') {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newMarkdown = {
    id: uuidv4(),
    type,
    title,
    timestamp: Math.round(timestamp),
    question,
    options,
    createdAt: Date.now()
  };

  markdowns.push(newMarkdown);
  res.status(201).json(newMarkdown);
});

app.put('/api/markdowns/:id', (req, res) => {
  const { id } = req.params;
  const { type, title, timestamp, question, options } = req.body;

  const index = markdowns.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }

  markdowns[index] = {
    ...markdowns[index],
    type: type ?? markdowns[index].type,
    title: title ?? markdowns[index].title,
    timestamp: typeof timestamp === 'number' ? Math.round(timestamp) : markdowns[index].timestamp,
    question: question !== undefined ? question : markdowns[index].question,
    options: options !== undefined ? options : markdowns[index].options
  };

  res.json(markdowns[index]);
});

app.delete('/api/markdowns/:id', (req, res) => {
  const { id } = req.params;
  const index = markdowns.findIndex((m) => m.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '标记不存在' });
  }

  const deleted = markdowns.splice(index, 1)[0];
  res.json({ message: '删除成功', deleted });
});

app.listen(PORT, () => {
  console.log(`Markdown API server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET    /api/markdowns`);
  console.log(`  POST   /api/markdowns`);
  console.log(`  PUT    /api/markdowns/:id`);
  console.log(`  DELETE /api/markdowns/:id`);
});
