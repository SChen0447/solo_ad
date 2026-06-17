import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let nodes = [
  { id: uuidv4(), name: '人工智能', label: '概念', x: 400, y: 300 },
  { id: uuidv4(), name: '机器学习', label: '概念', x: 600, y: 200 },
  { id: uuidv4(), name: '深度学习', label: '概念', x: 600, y: 400 },
  { id: uuidv4(), name: '神经网络', label: '概念', x: 800, y: 300 },
  { id: uuidv4(), name: '图灵', label: '人物', x: 200, y: 200 },
  { id: uuidv4(), name: '图灵测试', label: '事件', x: 200, y: 400 },
];

let edges = [];

const initEdges = () => {
  if (nodes.length >= 2 && edges.length === 0) {
    const aiNode = nodes.find(n => n.name === '人工智能');
    const mlNode = nodes.find(n => n.name === '机器学习');
    const dlNode = nodes.find(n => n.name === '深度学习');
    const nnNode = nodes.find(n => n.name === '神经网络');
    const turingNode = nodes.find(n => n.name === '图灵');
    const turingTestNode = nodes.find(n => n.name === '图灵测试');

    if (aiNode && mlNode) edges.push({ id: uuidv4(), source: aiNode.id, target: mlNode.id });
    if (mlNode && dlNode) edges.push({ id: uuidv4(), source: mlNode.id, target: dlNode.id });
    if (dlNode && nnNode) edges.push({ id: uuidv4(), source: dlNode.id, target: nnNode.id });
    if (turingNode && turingTestNode) edges.push({ id: uuidv4(), source: turingNode.id, target: turingTestNode.id });
    if (turingNode && aiNode) edges.push({ id: uuidv4(), source: turingNode.id, target: aiNode.id });
  }
};

initEdges();

app.get('/api/nodes', (req, res) => {
  res.json(nodes);
});

app.get('/api/nodes/:id', (req, res) => {
  const node = nodes.find(n => n.id === req.params.id);
  if (!node) {
    return res.status(404).json({ error: '节点不存在' });
  }
  res.json(node);
});

app.post('/api/nodes', (req, res) => {
  const { name, label, x, y } = req.body;
  if (!name || name.length > 20) {
    return res.status(400).json({ error: '节点名称无效（最多20字符）' });
  }
  const newNode = {
    id: uuidv4(),
    name,
    label: label || '概念',
    x: x || 400,
    y: y || 300,
  };
  nodes.push(newNode);
  res.status(201).json(newNode);
});

app.put('/api/nodes/:id', (req, res) => {
  const nodeIndex = nodes.findIndex(n => n.id === req.params.id);
  if (nodeIndex === -1) {
    return res.status(404).json({ error: '节点不存在' });
  }
  const { name, label, x, y } = req.body;
  if (name !== undefined && (name.length === 0 || name.length > 20)) {
    return res.status(400).json({ error: '节点名称无效（最多20字符）' });
  }
  nodes[nodeIndex] = {
    ...nodes[nodeIndex],
    ...(name !== undefined && { name }),
    ...(label !== undefined && { label }),
    ...(x !== undefined && { x }),
    ...(y !== undefined && { y }),
  };
  res.json(nodes[nodeIndex]);
});

app.delete('/api/nodes/:id', (req, res) => {
  const nodeIndex = nodes.findIndex(n => n.id === req.params.id);
  if (nodeIndex === -1) {
    return res.status(404).json({ error: '节点不存在' });
  }
  const deletedNode = nodes.splice(nodeIndex, 1)[0];
  edges = edges.filter(e => e.source !== req.params.id && e.target !== req.params.id);
  res.json(deletedNode);
});

app.get('/api/edges', (req, res) => {
  res.json(edges);
});

app.post('/api/edges', (req, res) => {
  const { source, target } = req.body;
  if (!source || !target) {
    return res.status(400).json({ error: '缺少源节点或目标节点' });
  }
  const sourceExists = nodes.some(n => n.id === source);
  const targetExists = nodes.some(n => n.id === target);
  if (!sourceExists || !targetExists) {
    return res.status(400).json({ error: '源节点或目标节点不存在' });
  }
  const exists = edges.some(e => e.source === source && e.target === target);
  if (exists) {
    return res.status(400).json({ error: '连线已存在' });
  }
  const newEdge = {
    id: uuidv4(),
    source,
    target,
  };
  edges.push(newEdge);
  res.status(201).json(newEdge);
});

app.delete('/api/edges/:id', (req, res) => {
  const edgeIndex = edges.findIndex(e => e.id === req.params.id);
  if (edgeIndex === -1) {
    return res.status(404).json({ error: '连线不存在' });
  }
  const deletedEdge = edges.splice(edgeIndex, 1)[0];
  res.json(deletedEdge);
});

app.get('/api/graph', (req, res) => {
  res.json({ nodes, edges });
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
