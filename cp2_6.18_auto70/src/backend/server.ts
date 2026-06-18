import express from 'express';
import cors from 'cors';
import { parseResume } from './parser';
import { matchResume, JOB_TEMPLATES } from './matcher';
import type { ParsedResume, JobRequirement, MatchReport } from '../shared/types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/jobs', (_req, res) => {
  res.json(JOB_TEMPLATES);
});

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Invalid request: text is required' });
      return;
    }
    await new Promise(r => setTimeout(r, 200));
    const parsed: ParsedResume = parseResume(text);
    res.json(parsed);
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { resume, job } = req.body as { resume: ParsedResume; job: JobRequirement };
    if (!resume || !job) {
      res.status(400).json({ error: 'Invalid request: resume and job are required' });
      return;
    }
    await new Promise(r => setTimeout(r, 200));
    const report: MatchReport = matchResume(resume, job);
    res.json(report);
  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: 'Failed to match resume' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Resume Matcher API running on http://localhost:${PORT}`);
});
