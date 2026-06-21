import express from 'express';
import cors from 'cors';
import { getTasks, createTask, claimTask, completeTask } from './services/taskService';
import { getTools, reserveTool } from './services/toolService';
import { getRankings, getMemberById, getMemberIds, getMemberNames } from './services/memberService';
import { getHarvests, addHarvest, getWeeklyHarvests, initHarvests } from './services/harvestService';

initHarvests(getMemberIds(), getMemberNames());

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/tasks', (_req, res) => {
  res.json(getTasks());
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, type, deadline, urgency } = req.body;
    if (!title || !type || !deadline || !urgency) {
      return res.status(400).json({ error: '字段缺失' });
    }
    const task = createTask({ title, type, deadline, urgency });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: '创建失败' });
  }
});

app.post('/api/tasks/claim', (req, res) => {
  const { taskId, memberId } = req.body;
  if (!taskId || !memberId) {
    return res.status(400).json({ error: '参数缺失' });
  }
  const task = claimTask(taskId, memberId);
  if (!task) return res.status(400).json({ error: '无法认领' });
  res.json(task);
});

app.post('/api/tasks/complete', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: '参数缺失' });
  const task = completeTask(taskId);
  if (!task) return res.status(400).json({ error: '无法完成' });
  res.json(task);
});

app.get('/api/tools', (_req, res) => {
  res.json(getTools());
});

app.post('/api/tools/reserve', (req, res) => {
  const { toolId, date, period, memberId, memberName } = req.body;
  if (!toolId || !date || !period || !memberId) {
    return res.status(400).json({ error: '参数缺失' });
  }
  const result = reserveTool(toolId, date, period, memberId, memberName ?? '匿名');
  if (!result.ok) return res.status(400).json({ error: result.message });
  res.status(201).json(result.reservation);
});

app.get('/api/members/rankings', (_req, res) => {
  res.json(getRankings());
});

app.get('/api/members/:id', (req, res) => {
  const member = getMemberById(req.params.id);
  if (!member) return res.status(404).json({ error: '成员不存在' });
  res.json(member);
});

app.get('/api/harvests', (_req, res) => {
  res.json(getHarvests());
});

app.post('/api/harvests', (req, res) => {
  const { memberId, memberName, productName, weightG, quantity } = req.body;
  if (!memberId || !productName || weightG == null || quantity == null) {
    return res.status(400).json({ error: '参数缺失' });
  }
  const harvest = addHarvest({
    memberId,
    memberName: memberName ?? '匿名',
    productName,
    weightG: Number(weightG),
    quantity: Number(quantity),
  });
  res.status(201).json(harvest);
});

app.get('/api/harvests/weekly', (_req, res) => {
  res.json(getWeeklyHarvests());
});

app.listen(PORT, () => {
  console.log(`[Garden Server] API running on http://localhost:${PORT}`);
});
