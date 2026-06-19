import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { readOkrs, writeOkrs } from './data.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/okrs', (req, res) => {
  try {
    const okrs = readOkrs();
    res.json(okrs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read OKRs' });
  }
});

app.post('/api/okrs', (req, res) => {
  try {
    const { title, owner, period } = req.body;
    if (!title || !owner || !period) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const okrs = readOkrs();
    const newOkr = {
      id: `okr-${uuidv4().slice(0, 8)}`,
      title,
      owner,
      period,
      createdAt: new Date().toISOString(),
      krs: [],
    };
    okrs.unshift(newOkr);
    writeOkrs(okrs);
    res.status(201).json(newOkr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create OKR' });
  }
});

app.put('/api/okrs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, owner, period } = req.body;
    const okrs = readOkrs();
    const okrIndex = okrs.findIndex((o) => o.id === id);
    if (okrIndex === -1) {
      return res.status(404).json({ error: 'OKR not found' });
    }
    if (title !== undefined) okrs[okrIndex].title = title;
    if (owner !== undefined) okrs[okrIndex].owner = owner;
    if (period !== undefined) okrs[okrIndex].period = period;
    writeOkrs(okrs);
    res.json(okrs[okrIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update OKR' });
  }
});

app.post('/api/okrs/:id/kr', (req, res) => {
  try {
    const { id } = req.params;
    const { description, owner, dueDate, progress } = req.body;
    if (!description || !owner || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const okrs = readOkrs();
    const okrIndex = okrs.findIndex((o) => o.id === id);
    if (okrIndex === -1) {
      return res.status(404).json({ error: 'OKR not found' });
    }
    const newKr = {
      id: `kr-${uuidv4().slice(0, 8)}`,
      description,
      owner,
      dueDate,
      progress: progress || 0,
      createdAt: new Date().toISOString(),
      checkins: [
        {
          id: `checkin-${uuidv4().slice(0, 8)}`,
          timestamp: new Date().toISOString(),
          comment: '初始创建KR',
          progressDelta: progress || 0,
          progressValue: progress || 0,
        },
      ],
    };
    okrs[okrIndex].krs.push(newKr);
    writeOkrs(okrs);
    res.status(201).json(newKr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add KR' });
  }
});

app.put('/api/kr/:krId', (req, res) => {
  try {
    const { krId } = req.params;
    const { description, owner, dueDate, progress } = req.body;
    const okrs = readOkrs();
    let updatedKr = null;
    for (let i = 0; i < okrs.length; i++) {
      const krIndex = okrs[i].krs.findIndex((k) => k.id === krId);
      if (krIndex !== -1) {
        if (description !== undefined) okrs[i].krs[krIndex].description = description;
        if (owner !== undefined) okrs[i].krs[krIndex].owner = owner;
        if (dueDate !== undefined) okrs[i].krs[krIndex].dueDate = dueDate;
        if (progress !== undefined) okrs[i].krs[krIndex].progress = progress;
        updatedKr = okrs[i].krs[krIndex];
        break;
      }
    }
    if (!updatedKr) {
      return res.status(404).json({ error: 'KR not found' });
    }
    writeOkrs(okrs);
    res.json(updatedKr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KR' });
  }
});

app.post('/api/kr/:krId/checkin', (req, res) => {
  try {
    const { krId } = req.params;
    const { comment, progress } = req.body;
    if (progress === undefined || progress === null) {
      return res.status(400).json({ error: 'Progress is required' });
    }
    const okrs = readOkrs();
    let updatedKr = null;
    for (let i = 0; i < okrs.length; i++) {
      const krIndex = okrs[i].krs.findIndex((k) => k.id === krId);
      if (krIndex !== -1) {
        const oldProgress = okrs[i].krs[krIndex].progress;
        const progressDelta = progress - oldProgress;
        okrs[i].krs[krIndex].progress = progress;
        const checkin = {
          id: `checkin-${uuidv4().slice(0, 8)}`,
          timestamp: new Date().toISOString(),
          comment: comment || '',
          progressDelta,
          progressValue: progress,
        };
        okrs[i].krs[krIndex].checkins.push(checkin);
        updatedKr = okrs[i].krs[krIndex];
        break;
      }
    }
    if (!updatedKr) {
      return res.status(404).json({ error: 'KR not found' });
    }
    writeOkrs(okrs);
    res.json(updatedKr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add checkin' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
