const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let inspirations = [
  {
    id: uuidv4(),
    content: '探索时间旅行的可能性，从物理学到哲学的多维思考',
    tag: 'blue',
    x: -150,
    y: -50,
    createdAt: new Date().toISOString(),
    links: ['https://en.wikipedia.org/wiki/Time_travel']
  },
  {
    id: uuidv4(),
    content: '用神经网络生成音乐，训练模型学习巴赫的赋格风格',
    tag: 'purple',
    x: 100,
    y: -120,
    createdAt: new Date().toISOString(),
    links: []
  },
  {
    id: uuidv4(),
    content: '周末去爬山，记得带水和防晒',
    tag: 'green',
    x: 200,
    y: 80,
    createdAt: new Date().toISOString(),
    links: []
  },
  {
    id: uuidv4(),
    content: '阅读《百年孤独》，记录魔幻现实主义的写作手法',
    tag: 'orange',
    x: -80,
    y: 150,
    createdAt: new Date().toISOString(),
    links: []
  },
  {
    id: uuidv4(),
    content: '学习 Rust 编程语言中的所有权系统',
    tag: 'red',
    x: 300,
    y: -30,
    createdAt: new Date().toISOString(),
    links: ['https://doc.rust-lang.org/book/']
  },
  {
    id: uuidv4(),
    content: '设计一款极简主义的番茄钟应用',
    tag: 'yellow',
    x: -250,
    y: 100,
    createdAt: new Date().toISOString(),
    links: []
  }
];

let connections = [];

app.get('/api/inspirations', (req, res) => {
  res.json({ inspirations, connections });
});

app.post('/api/inspirations', (req, res) => {
  const { content, tag, x, y, links } = req.body;
  const newInspiration = {
    id: uuidv4(),
    content: content || '',
    tag: tag || 'blue',
    x: x ?? Math.random() * 400 - 200,
    y: y ?? Math.random() * 400 - 200,
    createdAt: new Date().toISOString(),
    links: links || []
  };
  inspirations.push(newInspiration);
  res.status(201).json(newInspiration);
});

app.put('/api/inspirations/:id', (req, res) => {
  const { id } = req.params;
  const { content, tag, x, y, links } = req.body;
  const index = inspirations.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Inspiration not found' });
  }
  inspirations[index] = {
    ...inspirations[index],
    content: content !== undefined ? content : inspirations[index].content,
    tag: tag !== undefined ? tag : inspirations[index].tag,
    x: x !== undefined ? x : inspirations[index].x,
    y: y !== undefined ? y : inspirations[index].y,
    links: links !== undefined ? links : inspirations[index].links
  };
  res.json(inspirations[index]);
});

app.delete('/api/inspirations/:id', (req, res) => {
  const { id } = req.params;
  const index = inspirations.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Inspiration not found' });
  }
  inspirations.splice(index, 1);
  connections = connections.filter(c => c.from !== id && c.to !== id);
  res.json({ success: true });
});

app.post('/api/connections', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to || from === to) {
    return res.status(400).json({ error: 'Invalid connection' });
  }
  const exists = connections.some(c => c.from === from && c.to === to);
  if (exists) {
    return res.status(409).json({ error: 'Connection already exists' });
  }
  const newConnection = { id: uuidv4(), from, to };
  connections.push(newConnection);
  res.status(201).json(newConnection);
});

app.delete('/api/connections/:id', (req, res) => {
  const { id } = req.params;
  const index = connections.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  connections.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Inspiration Capsule API running on http://localhost:${PORT}`);
});
