const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { conflictRules, detectConflicts } = require('./conflictRules');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

let nodes = [];
let links = [];

app.get('/api/nodes', (req, res) => {
  res.json({ nodes, links });
});

app.post('/api/nodes', (req, res) => {
  const { nodes: newNodes, links: newLinks } = req.body;
  if (Array.isArray(newNodes)) {
    nodes = newNodes;
  }
  if (Array.isArray(newLinks)) {
    links = newLinks;
  }
  res.json({ success: true, nodes, links });
});

app.post('/api/nodes/add', (req, res) => {
  const { title, description, tags = [], x, y } = req.body;
  if (!title || title.length > 20) {
    return res.status(400).json({ error: '标题不能为空且最多20字' });
  }
  if (description && description.length > 100) {
    return res.status(400).json({ error: '描述最多100字' });
  }

  const newNode = {
    id: uuidv4(),
    title,
    description: description || '',
    tags,
    x: x || 400,
    y: y || 300,
  };

  nodes.push(newNode);
  res.status(201).json(newNode);
});

app.get('/api/conflicts', (req, res) => {
  const conflicts = detectConflicts(nodes, links);
  res.json({ conflicts, rules: conflictRules });
});

app.get('/api/conflicts/rules', (req, res) => {
  res.json({ rules: conflictRules });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
