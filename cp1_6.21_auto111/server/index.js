import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const readJsonFile = (filename) => {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content || '[]');
};

const writeJsonFile = (filename, data) => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/repertoires', (req, res) => {
  const repertoires = readJsonFile('repertoires.json');
  res.json(repertoires);
});

app.get('/api/performers', (req, res) => {
  const performers = readJsonFile('performers.json');
  res.json(performers);
});

app.post('/api/rehearsals', (req, res) => {
  const { repertoireId, date, performerIds } = req.body;
  const rehearsals = readJsonFile('rehearsals.json');
  const newRehearsal = {
    id: `reh-${uuidv4()}`,
    repertoireId,
    date,
    performerIds,
    createdAt: new Date().toISOString(),
  };
  rehearsals.push(newRehearsal);
  writeJsonFile('rehearsals.json', rehearsals);

  const repertoires = readJsonFile('repertoires.json');
  const repIndex = repertoires.findIndex((r) => r.id === repertoireId);
  if (repIndex !== -1) {
    repertoires[repIndex].rehearsalCount += 1;
    repertoires[repIndex].progress = Math.min(100, repertoires[repIndex].progress + 5);
    writeJsonFile('repertoires.json', repertoires);
  }

  res.json(newRehearsal);
});

app.get('/api/performers/:id/scores', (req, res) => {
  const { id } = req.params;
  const scores = readJsonFile('scores.json');
  const performerScores = scores.filter((s) => s.performerId === id);
  res.json(performerScores);
});

app.get('/api/feedback/:performerId', (req, res) => {
  const { performerId } = req.params;
  const feedback = readJsonFile('feedback.json');
  const performerFeedback = feedback
    .filter((f) => f.performerId === performerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(performerFeedback);
});

app.post('/api/feedback', (req, res) => {
  const { performerId, fromId, fromName, score, content } = req.body;
  const feedback = readJsonFile('feedback.json');
  const newFeedback = {
    id: `fb-${uuidv4()}`,
    performerId,
    fromId,
    fromName,
    score,
    content,
    likes: 0,
    replies: [],
    createdAt: new Date().toISOString(),
  };
  feedback.push(newFeedback);
  writeJsonFile('feedback.json', feedback);

  const scores = readJsonFile('scores.json');
  const newScore = {
    id: `sc-${uuidv4()}`,
    rehearsalId: `reh-${uuidv4()}`,
    performerId,
    score,
    comment: content,
    createdAt: new Date().toISOString(),
  };
  scores.push(newScore);
  writeJsonFile('scores.json', scores);

  res.json(newFeedback);
});

app.post('/api/feedback/:id/like', (req, res) => {
  const { id } = req.params;
  const feedback = readJsonFile('feedback.json');
  const fbIndex = feedback.findIndex((f) => f.id === id);
  if (fbIndex === -1) {
    return res.status(404).json({ error: 'Feedback not found' });
  }
  feedback[fbIndex].likes += 1;
  writeJsonFile('feedback.json', feedback);
  res.json({ success: true, likes: feedback[fbIndex].likes });
});

app.post('/api/feedback/:id/reply', (req, res) => {
  const { id } = req.params;
  const { fromName, content } = req.body;
  const feedback = readJsonFile('feedback.json');
  const fbIndex = feedback.findIndex((f) => f.id === id);
  if (fbIndex === -1) {
    return res.status(404).json({ error: 'Feedback not found' });
  }
  const newReply = {
    id: `r-${uuidv4()}`,
    fromName,
    content,
    createdAt: new Date().toISOString(),
  };
  feedback[fbIndex].replies.push(newReply);
  writeJsonFile('feedback.json', feedback);
  res.json(feedback[fbIndex]);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
