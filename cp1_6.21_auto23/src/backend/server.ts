import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { store } from './store';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

app.get('/api/activities', (_req, res) => {
  const activities = store.getAllActivities();
  res.json(activities);
});

app.get('/api/activities/:id', (req, res) => {
  const activity = store.getActivity(req.params.id);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }
  res.json(activity);
});

app.post('/api/activities', (req, res) => {
  const { title, description, options, deadline } = req.body;

  if (!title || !options || options.length < 2) {
    return res.status(400).json({
      error: 'Title and at least 2 options are required',
    });
  }

  const activity = store.createActivity(
    title,
    description || '',
    options,
    deadline || null
  );

  io.emit('activity:created', activity);
  res.status(201).json(activity);
});

app.get('/api/activities/:id/rankings', (req, res) => {
  const rankings = store.getOptionRankings(req.params.id);
  if (!rankings) {
    return res.status(404).json({ error: 'Activity not found' });
  }
  res.json(rankings);
});

app.post('/api/activities/:id/vote', (req, res) => {
  const { optionId, userId } = req.body;
  const activityId = req.params.id;

  if (!optionId || !userId) {
    return res
      .status(400)
      .json({ error: 'optionId and userId are required' });
  }

  const activity = store.vote(activityId, optionId, userId);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  io.emit('vote:updated', { activityId, activity });
  res.json(activity);
});

app.delete('/api/activities/:id/vote', (req, res) => {
  const { userId } = req.body;
  const activityId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const activity = store.unvote(activityId, userId);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  io.emit('vote:updated', { activityId, activity });
  res.json(activity);
});

app.get('/api/activities/:id/user-vote/:userId', (req, res) => {
  const vote = store.getUserVote(req.params.id, req.params.userId);
  res.json(vote);
});

app.get('/api/user/:userId/history', (req, res) => {
  const history = store.getUserVoteHistory(req.params.userId);
  res.json(history);
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 9876;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
