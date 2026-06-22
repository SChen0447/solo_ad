import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let playlist = [
  { id: uuidv4(), name: '星空下的约定', artist: '林晚风', duration: 245, note: '开场曲' },
  { id: uuidv4(), name: '城市夜曲', artist: '林晚风', duration: 198, note: '主打歌' },
  { id: uuidv4(), name: '雨后彩虹', artist: '林晚风', duration: 312, note: '' },
  { id: uuidv4(), name: '远方的风', artist: '林晚风', duration: 267, note: '吉他solo' },
];

let voteSession = null;
let voterRecords = {};

let equipmentList = [
  { id: uuidv4(), name: '电吉他', total: 3, available: 2 },
  { id: uuidv4(), name: '贝斯', total: 2, available: 1 },
  { id: uuidv4(), name: '架子鼓', total: 1, available: 1 },
  { id: uuidv4(), name: '键盘', total: 2, available: 2 },
  { id: uuidv4(), name: '麦克风', total: 5, available: 3 },
  { id: uuidv4(), name: '音箱', total: 4, available: 4 },
  { id: uuidv4(), name: '效果器', total: 3, available: 0 },
  { id: uuidv4(), name: '调音台', total: 1, available: 1 },
];

app.get('/api/playlist', (req, res) => {
  res.json(playlist);
});

app.post('/api/playlist', (req, res) => {
  const { name, artist, duration, note } = req.body;
  const newSong = {
    id: uuidv4(),
    name,
    artist,
    duration: Number(duration),
    note: note || '',
  };
  playlist.push(newSong);
  res.status(201).json(newSong);
});

app.delete('/api/playlist/:id', (req, res) => {
  const { id } = req.params;
  const index = playlist.findIndex((song) => song.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Song not found' });
  }
  const deleted = playlist.splice(index, 1)[0];
  res.json(deleted);
});

app.put('/api/playlist/reorder', (req, res) => {
  const { newOrder } = req.body;
  playlist = newOrder;
  res.json(playlist);
});

app.get('/api/vote', (req, res) => {
  if (!voteSession) {
    return res.json({ active: false });
  }
  const results = voteSession.candidates.map((c) => ({
    ...c,
    votes: c.votes || 0,
  }));
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  res.json({
    active: true,
    topic: voteSession.topic,
    candidates: results,
    totalVotes,
  });
});

app.post('/api/vote/start', (req, res) => {
  const { topic, candidateIds } = req.body;
  const candidates = playlist
    .filter((song) => candidateIds.includes(song.id))
    .slice(0, 3)
    .map((song) => ({ id: song.id, name: song.name, votes: 0 }));

  if (candidates.length === 0) {
    return res.status(400).json({ error: 'No valid candidates' });
  }

  voteSession = {
    id: uuidv4(),
    topic: topic || '返场曲目投票',
    candidates,
    startTime: Date.now(),
  };
  voterRecords = {};
  res.json(voteSession);
});

app.post('/api/vote/:candidateId', (req, res) => {
  const { candidateId } = req.params;
  const voterId = req.headers['x-voter-id'] || uuidv4();

  if (!voteSession) {
    return res.status(400).json({ error: 'No active vote session' });
  }

  const lastVoteTime = voterRecords[voterId];
  if (lastVoteTime && Date.now() - lastVoteTime < 30000) {
    const remaining = Math.ceil((30000 - (Date.now() - lastVoteTime)) / 1000);
    return res.status(429).json({ error: '投票过于频繁', remainingSeconds: remaining });
  }

  const candidate = voteSession.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  candidate.votes = (candidate.votes || 0) + 1;
  voterRecords[voterId] = Date.now();

  res.json({
    success: true,
    voterId,
    candidateId,
    newVoteCount: candidate.votes,
  });
});

app.post('/api/vote/end', (req, res) => {
  if (!voteSession) {
    return res.status(400).json({ error: 'No active vote session' });
  }
  const endedSession = voteSession;
  voteSession = null;
  res.json({ ended: true, session: endedSession });
});

app.get('/api/equipment', (req, res) => {
  res.json(equipmentList);
});

app.post('/api/equipment/:id/borrow', (req, res) => {
  const { id } = req.params;
  const equipment = equipmentList.find((e) => e.id === id);
  if (!equipment) {
    return res.status(404).json({ error: 'Equipment not found' });
  }
  if (equipment.available <= 0) {
    return res.status(400).json({ error: 'No available equipment' });
  }
  equipment.available -= 1;
  res.json(equipment);
});

app.post('/api/equipment/:id/return', (req, res) => {
  const { id } = req.params;
  const equipment = equipmentList.find((e) => e.id === id);
  if (!equipment) {
    return res.status(404).json({ error: 'Equipment not found' });
  }
  if (equipment.available >= equipment.total) {
    return res.status(400).json({ error: 'All equipment already returned' });
  }
  equipment.available += 1;
  res.json(equipment);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
