import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(bodyParser.json());

let timerState = {
  duration: 0,
  remaining: 0,
  isRunning: false,
  isLocked: false,
  startTime: null,
  endTime: null
};

let ideas = [];
let ideaNumberCounter = 1;
let timerInterval = null;
const likeStore = new Map();

const AVATAR_COLORS = [
  '#4A90D9', '#E53935', '#43A047', '#FF8C00',
  '#7B1FA2', '#00897B', '#D81B60', '#1E88E5'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function getInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function startTimer(durationSeconds) {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerState = {
    duration: durationSeconds,
    remaining: durationSeconds,
    isRunning: true,
    isLocked: false,
    startTime: Date.now(),
    endTime: Date.now() + durationSeconds * 1000
  };
  
  timerInterval = setInterval(() => {
    if (timerState.remaining > 0) {
      timerState.remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    } else {
      timerState.isRunning = false;
      timerState.isLocked = true;
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }, 100);
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerState = {
    duration: 0,
    remaining: 0,
    isRunning: false,
    isLocked: false,
    startTime: null,
    endTime: null
  };
}

app.get('/timer', (req, res) => {
  res.json({
    remaining: timerState.remaining,
    duration: timerState.duration,
    isRunning: timerState.isRunning,
    isLocked: timerState.isLocked
  });
});

app.post('/timer/start', (req, res) => {
  const { duration } = req.body;
  if (!duration || ![300, 600, 900, 1200].includes(duration)) {
    return res.status(400).json({ error: 'Invalid duration. Must be 300, 600, 900, or 1200 seconds.' });
  }
  startTimer(duration);
  res.json({
    remaining: timerState.remaining,
    duration: timerState.duration,
    isRunning: timerState.isRunning,
    isLocked: timerState.isLocked
  });
});

app.post('/timer/reset', (req, res) => {
  resetTimer();
  ideas = [];
  ideaNumberCounter = 1;
  likeStore.clear();
  res.json({
    remaining: timerState.remaining,
    duration: timerState.duration,
    isRunning: timerState.isRunning,
    isLocked: timerState.isLocked
  });
});

function getLikesForIdea(ideaId) {
  const store = likeStore.get(ideaId);
  if (!store) return { count: 0, likers: [] };
  return {
    count: store.size,
    likers: Array.from(store)
  };
}

function getPublicIdea(idea) {
  const likes = getLikesForIdea(idea.id);
  return {
    id: idea.id,
    number: idea.number,
    content: idea.content,
    avatarColor: idea.avatarColor,
    initials: idea.initials,
    createdAt: idea.createdAt,
    likes: likes.count
  };
}

app.get('/ideas', (req, res) => {
  const publicIdeas = ideas.map(getPublicIdea);
  res.json(publicIdeas);
});

app.get('/ideas/all', (req, res) => {
  res.json(ideas);
});

app.post('/ideas', (req, res) => {
  const { content, participantName } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required.' });
  }
  
  if (!participantName || !participantName.trim()) {
    return res.status(400).json({ error: 'Participant name is required.' });
  }
  
  if (timerState.isLocked) {
    return res.status(403).json({ error: 'Timer has ended. Submissions are locked.' });
  }
  
  const newIdea = {
    id: uuidv4(),
    number: ideaNumberCounter++,
    content: content.trim(),
    participantName: participantName.trim(),
    avatarColor: getRandomColor(),
    initials: getInitials(participantName),
    createdAt: new Date().toISOString()
  };
  
  ideas.push(newIdea);
  likeStore.set(newIdea.id, new Set());
  
  res.status(201).json(getPublicIdea(newIdea));
});

app.delete('/ideas/:id', (req, res) => {
  const { id } = req.params;
  const index = ideas.findIndex(idea => idea.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Idea not found.' });
  }
  
  ideas.splice(index, 1);
  likeStore.delete(id);
  res.json({ success: true });
});

app.delete('/ideas', (req, res) => {
  ideas = [];
  ideaNumberCounter = 1;
  likeStore.clear();
  res.json({ success: true });
});

app.post('/ideas/group', (req, res) => {
  const { groupSize } = req.body;
  const size = parseInt(groupSize) || 3;
  
  if (size < 2 || size > 10) {
    return res.status(400).json({ error: 'Group size must be between 2 and 10.' });
  }
  
  const shuffled = [...ideas].sort(() => Math.random() - 0.5);
  const groups = [];
  
  for (let i = 0; i < shuffled.length; i += size) {
    const group = shuffled.slice(i, i + size).map(idea => {
      const publicIdea = getPublicIdea(idea);
      return publicIdea;
    });
    groups.push(group);
  }
  
  res.json(groups);
});

app.post('/ideas/:id/like', (req, res) => {
  const { id } = req.params;
  const { voterId } = req.body;

  const idea = ideas.find(i => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found.' });
  }

  if (!voterId || typeof voterId !== 'string' || !voterId.trim()) {
    return res.status(400).json({ error: 'voterId is required.' });
  }

  let store = likeStore.get(id);
  if (!store) {
    store = new Set();
    likeStore.set(id, store);
  }

  const trimmedVoter = voterId.trim();
  const alreadyLiked = store.has(trimmedVoter);

  if (alreadyLiked) {
    return res.status(409).json({
      error: 'Already liked.',
      likes: store.size,
      liked: true
    });
  }

  store.add(trimmedVoter);
  res.json({
    success: true,
    likes: store.size,
    liked: true
  });
});

app.get('/ideas/:id/likes', (req, res) => {
  const { id } = req.params;
  const { voterId } = req.query;

  const idea = ideas.find(i => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found.' });
  }

  const likes = getLikesForIdea(id);
  const liked = voterId && typeof voterId === 'string' && likes.likers.includes(voterId);

  res.json({
    likes: likes.count,
    liked: !!liked
  });
});

app.listen(PORT, () => {
  console.log(`Brainstorm server running on port ${PORT}`);
});
