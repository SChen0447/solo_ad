import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Track {
  id: string;
  name: string;
  artist: string;
  duration: string;
  note: string;
  order: number;
}

interface VoteSession {
  id: string;
  title: string;
  candidates: { trackId: string; trackName: string }[];
  votes: Record<string, number>;
  voters: Record<string, string>;
  createdAt: number;
  active: boolean;
}

interface Equipment {
  id: string;
  name: string;
  total: number;
  available: number;
}

let playlist: Track[] = [
  { id: uuidv4(), name: '星空下的约定', artist: '林夕声', duration: '4:32', note: '开场曲', order: 0 },
  { id: uuidv4(), name: '午夜列车', artist: '陈默', duration: '3:58', note: '', order: 1 },
  { id: uuidv4(), name: '城市灯塔', artist: '苏然', duration: '5:10', note: '吉他独奏段落', order: 2 },
  { id: uuidv4(), name: '风中的信', artist: '林夕声', duration: '4:05', note: '', order: 3 },
];

let voteSessions: VoteSession[] = [];
let currentVoteSession: VoteSession | null = null;

let equipmentList: Equipment[] = [
  { id: uuidv4(), name: '电吉他', total: 3, available: 3 },
  { id: uuidv4(), name: '贝斯', total: 2, available: 2 },
  { id: uuidv4(), name: '架子鼓', total: 1, available: 1 },
  { id: uuidv4(), name: '键盘', total: 2, available: 2 },
  { id: uuidv4(), name: '麦克风', total: 5, available: 5 },
  { id: uuidv4(), name: '音箱', total: 4, available: 4 },
  { id: uuidv4(), name: '调音台', total: 1, available: 1 },
  { id: uuidv4(), name: '监听耳机', total: 6, available: 6 },
];

app.get('/api/playlist', (_req, res) => {
  const sorted = [...playlist].sort((a, b) => a.order - b.order);
  res.json(sorted);
});

app.post('/api/playlist', (req, res) => {
  const { name, artist, duration, note } = req.body;
  if (!name || !artist || !duration) {
    res.status(400).json({ error: '曲名、艺人和时长为必填项' });
    return;
  }
  const maxOrder = playlist.reduce((max, t) => Math.max(max, t.order), -1);
  const track: Track = {
    id: uuidv4(),
    name,
    artist,
    duration,
    note: note || '',
    order: maxOrder + 1,
  };
  playlist.push(track);
  const sorted = [...playlist].sort((a, b) => a.order - b.order);
  res.json(sorted);
});

app.delete('/api/playlist/:id', (req, res) => {
  const { id } = req.params;
  playlist = playlist.filter((t) => t.id !== id);
  playlist.forEach((t, i) => { t.order = i; });
  const sorted = [...playlist].sort((a, b) => a.order - b.order);
  res.json(sorted);
});

app.put('/api/playlist/reorder', (req, res) => {
  const { orderedIds }: { orderedIds: string[] } = req.body;
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: 'orderedIds 必须为数组' });
    return;
  }
  const idSet = new Set(orderedIds);
  playlist.forEach((t) => {
    if (idSet.has(t.id)) {
      t.order = orderedIds.indexOf(t.id);
    }
  });
  const sorted = [...playlist].sort((a, b) => a.order - b.order);
  res.json(sorted);
});

app.get('/api/vote/current', (_req, res) => {
  if (!currentVoteSession) {
    res.json(null);
    return;
  }
  const totalVotes = Object.values(currentVoteSession.votes).reduce((s, c) => s + c, 0);
  const results = currentVoteSession.candidates.map((c) => ({
    trackId: c.trackId,
    trackName: c.trackName,
    count: currentVoteSession.votes[c.trackId] || 0,
    percentage: totalVotes > 0 ? Math.round(((currentVoteSession.votes[c.trackId] || 0) / totalVotes) * 100) : 0,
  }));
  res.json({
    id: currentVoteSession.id,
    title: currentVoteSession.title,
    candidates: currentVoteSession.candidates,
    results,
    totalVotes,
    active: currentVoteSession.active,
  });
});

app.post('/api/vote/start', (req, res) => {
  const { title, candidateIds } = req.body;
  if (!title || !Array.isArray(candidateIds) || candidateIds.length === 0 || candidateIds.length > 3) {
    res.status(400).json({ error: '请提供投票主题和1-3个候选曲目ID' });
    return;
  }
  const candidates = candidateIds
    .map((tid: string) => {
      const track = playlist.find((t) => t.id === tid);
      return track ? { trackId: track.id, trackName: track.name } : null;
    })
    .filter(Boolean) as { trackId: string; trackName: string }[];

  if (currentVoteSession) {
    currentVoteSession.active = false;
  }

  const session: VoteSession = {
    id: uuidv4(),
    title,
    candidates,
    votes: {},
    voters: {},
    createdAt: Date.now(),
    active: true,
  };
  candidates.forEach((c) => { session.votes[c.trackId] = 0; });
  currentVoteSession = session;
  voteSessions.push(session);

  const totalVotes = 0;
  const results = candidates.map((c) => ({
    trackId: c.trackId,
    trackName: c.trackName,
    count: 0,
    percentage: 0,
  }));
  res.json({
    id: session.id,
    title: session.title,
    candidates,
    results,
    totalVotes,
    active: true,
  });
});

app.post('/api/vote/cast', (req, res) => {
  if (!currentVoteSession || !currentVoteSession.active) {
    res.status(400).json({ error: '当前没有进行中的投票' });
    return;
  }
  const { voterId, trackId } = req.body;
  if (!voterId || !trackId) {
    res.status(400).json({ error: '缺少投票者ID或曲目ID' });
    return;
  }
  if (currentVoteSession.voters[voterId]) {
    res.status(400).json({ error: '您已经投过票了' });
    return;
  }
  if (!currentVoteSession.votes.hasOwnProperty(trackId)) {
    res.status(400).json({ error: '无效的候选曲目' });
    return;
  }
  currentVoteSession.votes[trackId] = (currentVoteSession.votes[trackId] || 0) + 1;
  currentVoteSession.voters[voterId] = trackId;

  const totalVotes = Object.values(currentVoteSession.votes).reduce((s, c) => s + c, 0);
  const results = currentVoteSession.candidates.map((c) => ({
    trackId: c.trackId,
    trackName: c.trackName,
    count: currentVoteSession.votes[c.trackId] || 0,
    percentage: totalVotes > 0 ? Math.round(((currentVoteSession.votes[c.trackId] || 0) / totalVotes) * 100) : 0,
  }));
  res.json({
    id: currentVoteSession.id,
    title: currentVoteSession.title,
    candidates: currentVoteSession.candidates,
    results,
    totalVotes,
    active: currentVoteSession.active,
  });
});

app.post('/api/vote/end', (_req, res) => {
  if (!currentVoteSession) {
    res.status(400).json({ error: '没有进行中的投票' });
    return;
  }
  currentVoteSession.active = false;
  const totalVotes = Object.values(currentVoteSession.votes).reduce((s, c) => s + c, 0);
  const results = currentVoteSession.candidates.map((c) => ({
    trackId: c.trackId,
    trackName: c.trackName,
    count: currentVoteSession.votes[c.trackId] || 0,
    percentage: totalVotes > 0 ? Math.round(((currentVoteSession.votes[c.trackId] || 0) / totalVotes) * 100) : 0,
  }));
  res.json({
    id: currentVoteSession.id,
    title: currentVoteSession.title,
    candidates: currentVoteSession.candidates,
    results,
    totalVotes,
    active: false,
  });
});

app.get('/api/equipment', (_req, res) => {
  res.json(equipmentList);
});

app.post('/api/equipment/:id/borrow', (req, res) => {
  const { id } = req.params;
  const item = equipmentList.find((e) => e.id === id);
  if (!item) {
    res.status(404).json({ error: '设备不存在' });
    return;
  }
  if (item.available <= 0) {
    res.status(400).json({ error: '该设备已无库存' });
    return;
  }
  item.available -= 1;
  res.json(equipmentList);
});

app.post('/api/equipment/:id/return', (req, res) => {
  const { id } = req.params;
  const item = equipmentList.find((e) => e.id === id);
  if (!item) {
    res.status(404).json({ error: '设备不存在' });
    return;
  }
  if (item.available >= item.total) {
    res.status(400).json({ error: '该设备已全部归还' });
    return;
  }
  item.available += 1;
  res.json(equipmentList);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
