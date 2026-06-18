import express from 'express';
import cors from 'cors';
import { generateSummary, matchMusic, generateExportHtml, SummaryItem, ExportPayload, MusicTrack } from './mockData';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

interface SummaryRequest {
  text: string;
}

interface SummaryResponse {
  summaries: SummaryItem[];
}

app.post('/api/summary', (req, res) => {
  try {
    const { text } = req.body as SummaryRequest;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供有效的文稿内容' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: '文稿内容不能超过5000字' });
    }
    const summaries = generateSummary(text);
    const response: SummaryResponse = { summaries };
    setTimeout(() => {
      res.json(response);
    }, 200 + Math.random() * 500);
  } catch (err) {
    res.status(500).json({ error: '摘要生成失败' });
  }
});

interface MatchMusicRequest {
  summaries: SummaryItem[];
}

interface MatchMusicResponse {
  matches: Record<string, MusicTrack[]>;
}

app.post('/api/match-music', (req, res) => {
  try {
    const { summaries } = req.body as MatchMusicRequest;
    if (!summaries || !Array.isArray(summaries)) {
      return res.status(400).json({ error: '请提供有效的摘要列表' });
    }
    const matches = matchMusic(summaries);
    const response: MatchMusicResponse = { matches };
    setTimeout(() => {
      res.json(response);
    }, 100 + Math.random() * 300);
  } catch (err) {
    res.status(500).json({ error: '音乐匹配失败' });
  }
});

interface ExportRequest extends ExportPayload {}

interface ExportResponse {
  html: string;
}

app.post('/api/export', (req, res) => {
  try {
    const payload = req.body as ExportRequest;
    if (!payload || !payload.summaries || !Array.isArray(payload.summaries)) {
      return res.status(400).json({ error: '请提供有效的导出数据' });
    }
    const html = generateExportHtml(payload);
    const response: ExportResponse = { html };
    setTimeout(() => {
      res.json(response);
    }, 100 + Math.random() * 200);
  } catch (err) {
    res.status(500).json({ error: '导出失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`[Server] API server running on http://localhost:${PORT}`);
});
