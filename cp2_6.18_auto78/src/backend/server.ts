import express from 'express';
import cors from 'cors';
import { parseResume } from './parser';
import { matchResumeToJob } from './matcher';
import type { ParsedResume, JobRequirement, MatchReport } from '../types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '简历文本不能为空' });
    }
    await delay(200);
    const parsed: ParsedResume = parseResume(text);
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('解析错误:', error);
    res.status(500).json({ error: '解析简历失败' });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { resume, job } = req.body as { resume: ParsedResume; job: JobRequirement };
    if (!resume || !job) {
      return res.status(400).json({ error: '简历数据和职位要求不能为空' });
    }
    await delay(200);
    const report: MatchReport = matchResumeToJob(resume, job);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('匹配错误:', error);
    res.status(500).json({ error: '匹配计算失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Resume Matcher API Server running on http://localhost:${PORT}`);
});
