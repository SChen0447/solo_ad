import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'meetings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());

const readData = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { meetings: [] };
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/meetings', (req, res) => {
  const data = readData();
  res.json(data.meetings);
});

app.get('/api/meetings/:id', (req, res) => {
  const data = readData();
  const meeting = data.meetings.find((m) => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  res.json(meeting);
});

app.post('/api/meetings', (req, res) => {
  const { title, date, members } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: '标题和日期必填' });
  }
  const data = readData();
  const newMeeting = {
    id: uuidv4(),
    title,
    date,
    members: members || [],
    items: {
      good: [],
      improve: [],
      action: []
    }
  };
  data.meetings.push(newMeeting);
  writeData(data);
  res.status(201).json(newMeeting);
});

app.put('/api/meetings/:id', (req, res) => {
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  data.meetings[idx] = { ...data.meetings[idx], ...req.body, id: data.meetings[idx].id };
  writeData(data);
  res.json(data.meetings[idx]);
});

app.delete('/api/meetings/:id', (req, res) => {
  const data = readData();
  const filtered = data.meetings.filter((m) => m.id !== req.params.id);
  if (filtered.length === data.meetings.length) {
    return res.status(404).json({ error: '会议不存在' });
  }
  data.meetings = filtered;
  writeData(data);
  res.json({ success: true });
});

app.post('/api/meetings/:id/items/:category', (req, res) => {
  const { category, id: meetingId } = req.params;
  if (!['good', 'improve', 'action'].includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meeting = data.meetings[idx];
  const categoryItems = meeting.items[category];
  const newItem = {
    id: uuidv4(),
    content: req.body.content,
    order: categoryItems.length,
    ...(category === 'action'
      ? {
          assignee: req.body.assignee || '',
          dueDate: req.body.dueDate || '',
          completed: false
        }
      : {})
  };
  categoryItems.push(newItem);
  writeData(data);
  res.status(201).json(newItem);
});

app.put('/api/meetings/:id/items/:category/:itemId', (req, res) => {
  const { category, id: meetingId, itemId } = req.params;
  if (!['good', 'improve', 'action'].includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meeting = data.meetings[idx];
  const itemIdx = meeting.items[category].findIndex((item) => item.id === itemId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: '项目不存在' });
  }
  meeting.items[category][itemIdx] = {
    ...meeting.items[category][itemIdx],
    ...req.body,
    id: itemId
  };
  writeData(data);
  res.json(meeting.items[category][itemIdx]);
});

app.delete('/api/meetings/:id/items/:category/:itemId', (req, res) => {
  const { category, id: meetingId, itemId } = req.params;
  if (!['good', 'improve', 'action'].includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meeting = data.meetings[idx];
  const beforeLen = meeting.items[category].length;
  meeting.items[category] = meeting.items[category].filter((item) => item.id !== itemId);
  if (beforeLen === meeting.items[category].length) {
    return res.status(404).json({ error: '项目不存在' });
  }
  writeData(data);
  res.json({ success: true });
});

app.put('/api/meetings/:id/items/:category/reorder', (req, res) => {
  const { category, id: meetingId } = req.params;
  const { orderedIds } = req.body;
  if (!['good', 'improve', 'action'].includes(category)) {
    return res.status(400).json({ error: '无效的分类' });
  }
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meeting = data.meetings[idx];
  const itemsMap = new Map(meeting.items[category].map((item) => [item.id, item]));
  meeting.items[category] = orderedIds
    .map((id, order) => {
      const item = itemsMap.get(id);
      if (item) item.order = order;
      return item;
    })
    .filter(Boolean);
  writeData(data);
  res.json({ success: true });
});

app.put('/api/meetings/:id/action/:actionId/toggle', (req, res) => {
  const { id: meetingId, actionId } = req.params;
  const data = readData();
  const idx = data.meetings.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  const meeting = data.meetings[idx];
  const itemIdx = meeting.items.action.findIndex((item) => item.id === actionId);
  if (itemIdx === -1) {
    return res.status(404).json({ error: '行动项不存在' });
  }
  if (!meeting.items.action[itemIdx].completed) {
    meeting.items.action[itemIdx].completed = true;
  }
  writeData(data);
  res.json(meeting.items.action[itemIdx]);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
