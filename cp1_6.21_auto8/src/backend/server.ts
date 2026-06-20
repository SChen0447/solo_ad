import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Pipeline, ExecutionRecord } from '../frontend/types';
import { executionEngine, ExecutionCallbacks } from './executionEngine';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

let pipelines: Pipeline[] = [
  {
    id: 'demo-pipeline-1',
    name: '图片批量处理工作流',
    description: '监听文件夹新图片，自动压缩并发送通知',
    nodes: [
      {
        id: 'node-1',
        type: 'file-watcher',
        position: { x: 100, y: 200 },
        config: { filePath: './uploads', interval: 5000 },
        label: '文件监听',
      },
      {
        id: 'node-2',
        type: 'image-compress',
        position: { x: 400, y: 200 },
        config: { quality: 80, maxWidth: 1920, format: 'webp' },
        label: '图片压缩',
      },
      {
        id: 'node-3',
        type: 'notification',
        position: { x: 700, y: 200 },
        config: { title: '处理完成', message: '图片已成功压缩', channel: 'email' },
        label: '发送通知',
      },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
      { id: 'edge-2', source: 'node-2', target: 'node-3' },
    ],
    trigger: {
      type: 'manual',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-pipeline-2',
    name: '定时数据同步',
    description: '每小时拉取API数据并发送邮件报告',
    nodes: [
      {
        id: 'node-a',
        type: 'http-request',
        position: { x: 100, y: 150 },
        config: { url: 'https://api.example.com/data', method: 'GET', headers: '{}', body: '' },
        label: 'API请求',
      },
      {
        id: 'node-b',
        type: 'email-send',
        position: { x: 400, y: 150 },
        config: { to: 'admin@example.com', subject: '数据同步报告', template: 'default' },
        label: '发送邮件',
      },
    ],
    edges: [
      { id: 'edge-a', source: 'node-a', target: 'node-b' },
    ],
    trigger: {
      type: 'cron',
      cronExpression: '0 * * * *',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

app.get('/api/pipelines', (req, res) => {
  res.json(pipelines);
});

app.get('/api/pipelines/:id', (req, res) => {
  const pipeline = pipelines.find(p => p.id === req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json(pipeline);
});

app.post('/api/pipelines', (req, res) => {
  const newPipeline: Pipeline = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  pipelines.push(newPipeline);
  res.status(201).json(newPipeline);
});

app.put('/api/pipelines/:id', (req, res) => {
  const index = pipelines.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  pipelines[index] = {
    ...pipelines[index],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString(),
  };
  res.json(pipelines[index]);
});

app.delete('/api/pipelines/:id', (req, res) => {
  const index = pipelines.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  pipelines.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/pipelines/:id/trigger', async (req, res) => {
  const pipeline = pipelines.find(p => p.id === req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  const callbacks: ExecutionCallbacks = {
    onNodeStart: (executionId, nodeId) => {
      io.emit('node:start', {
        executionId,
        nodeId,
        timestamp: new Date().toISOString(),
      });
    },
    onNodeComplete: (executionId, nodeId, output, duration) => {
      io.emit('node:complete', {
        executionId,
        nodeId,
        output,
        duration,
        timestamp: new Date().toISOString(),
      });
    },
    onNodeError: (executionId, nodeId, error, duration) => {
      io.emit('node:error', {
        executionId,
        nodeId,
        error,
        duration,
        timestamp: new Date().toISOString(),
      });
    },
    onPipelineComplete: (executionId, status, totalDuration) => {
      io.emit('pipeline:complete', {
        executionId,
        status,
        totalDuration,
        timestamp: new Date().toISOString(),
      });
    },
    onLog: (executionId, log) => {
      io.emit('execution:log', {
        executionId,
        ...log,
      });
    },
  };

  res.json({
    executionId: uuidv4(),
    message: 'Pipeline execution started',
  });

  executionEngine.executePipeline(pipeline, 'manual', callbacks);
});

app.get('/api/executions', (req, res) => {
  const pipelineId = req.query.pipelineId as string;
  const executions = executionEngine.getAllExecutions(pipelineId);
  res.json(executions);
});

app.get('/api/executions/:id', (req, res) => {
  const execution = executionEngine.getExecution(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json(execution);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('pipeline:update', (data) => {
    const index = pipelines.findIndex(p => p.id === data.id);
    if (index !== -1) {
      pipelines[index] = {
        ...pipelines[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      socket.broadcast.emit('pipeline:updated', data);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 FlowForge backend server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for WebSocket connections`);
  console.log(`📊 REST API available at http://localhost:${PORT}/api`);
});
