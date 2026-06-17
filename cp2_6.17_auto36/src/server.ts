import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import type { Note, Group, Poll, VoteRecord, NoteColor } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let notes: Note[] = [];
let groups: Group[] = [
  {
    id: 'group-1',
    title: '待讨论',
    color: '#4A90D9',
    x: 20,
    y: 20,
    width: 400,
  },
  {
    id: 'group-2',
    title: '进行中',
    color: '#50C878',
    x: 440,
    y: 20,
    width: 400,
  },
  {
    id: 'group-3',
    title: '已完成',
    color: '#FF8C42',
    x: 860,
    y: 20,
    width: 400,
  },
];
let polls: Poll[] = [];
let voteRecords: VoteRecord[] = [];

app.get('/api/notes', (_req, res) => {
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { content, color, x, y, groupId } = req.body;
  const note: Note = {
    id: uuidv4(),
    content: content || '',
    color: color || '#4A90D9',
    x: x || 100,
    y: y || 250,
    groupId: groupId || null,
    createdAt: Date.now(),
  };
  notes.push(note);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { content, color, x, y, groupId } = req.body;
  const noteIndex = notes.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes[noteIndex] = {
    ...notes[noteIndex],
    content: content !== undefined ? content : notes[noteIndex].content,
    color: color !== undefined ? (color as NoteColor) : notes[noteIndex].color,
    x: x !== undefined ? x : notes[noteIndex].x,
    y: y !== undefined ? y : notes[noteIndex].y,
    groupId: groupId !== undefined ? groupId : notes[noteIndex].groupId,
  };
  res.json(notes[noteIndex]);
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const noteIndex = notes.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes.splice(noteIndex, 1);
  res.status(204).send();
});

app.get('/api/groups', (_req, res) => {
  res.json(groups);
});

app.get('/api/polls', (_req, res) => {
  res.json(polls);
});

app.post('/api/polls', (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || options.length < 2 || options.length > 4) {
    return res.status(400).json({ error: 'Invalid poll data' });
  }
  const poll: Poll = {
    id: uuidv4(),
    question,
    options: options.map((text: string) => ({
      id: uuidv4(),
      text,
      votes: 0,
    })),
    isActive: true,
    showResults: false,
    totalVotes: 0,
    createdAt: Date.now(),
  };
  polls.push(poll);
  res.status(201).json(poll);
});

app.post('/api/polls/:pollId/vote', (req, res) => {
  const { pollId } = req.params;
  const { optionId, voterId } = req.body;

  const poll = polls.find((p) => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  if (!poll.isActive) {
    return res.status(400).json({ error: 'Poll is not active' });
  }

  const existingVote = voteRecords.find(
    (r) => r.pollId === pollId && r.voterId === voterId
  );
  if (existingVote) {
    return res.status(400).json({ error: 'Already voted' });
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) {
    return res.status(404).json({ error: 'Option not found' });
  }

  option.votes += 1;
  poll.totalVotes += 1;

  voteRecords.push({ pollId, optionId, voterId });

  res.json({ success: true, poll });
});

app.post('/api/polls/:pollId/results', (req, res) => {
  const { pollId } = req.params;
  const poll = polls.find((p) => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  poll.showResults = true;
  poll.isActive = false;
  res.json(poll);
});

app.post('/api/polls/:pollId/reset', (req, res) => {
  const { pollId } = req.params;
  const poll = polls.find((p) => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  poll.options.forEach((o) => (o.votes = 0));
  poll.totalVotes = 0;
  poll.isActive = true;
  poll.showResults = false;
  voteRecords = voteRecords.filter((r) => r.pollId !== pollId);
  res.json(poll);
});

app.delete('/api/polls/:pollId', (req, res) => {
  const { pollId } = req.params;
  const pollIndex = polls.findIndex((p) => p.id === pollId);
  if (pollIndex === -1) {
    return res.status(404).json({ error: 'Poll not found' });
  }
  polls.splice(pollIndex, 1);
  voteRecords = voteRecords.filter((r) => r.pollId !== pollId);
  res.status(204).send();
});

app.get('/api/voter/:voterId/polls', (req, res) => {
  const { voterId } = req.params;
  const votedPollIds = voteRecords
    .filter((r) => r.voterId === voterId)
    .map((r) => r.pollId);
  res.json({ votedPollIds });
});

app.get('/api/state', (_req, res) => {
  res.json({
    notes,
    groups,
    polls,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
