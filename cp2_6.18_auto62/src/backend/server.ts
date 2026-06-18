import express from 'express';
import cors from 'cors';
import { parseResume, type ParsedResume } from './parser';
import { matchResume, jobTemplates, type MatchReport, type JobRequirement } from './matcher';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/jobs', (req, res) => {
  res.json(jobTemplates);
});

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '简历文本不能为空' });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const parsed: ParsedResume = parseResume(text);
    
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('解析简历时出错:', error);
    res.status(500).json({ error: '简历解析失败' });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { resume, jobId } = req.body;
    
    if (!resume || !jobId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const job = jobTemplates.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ error: '职位不存在' });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const report: MatchReport = matchResume(resume as ParsedResume, job as JobRequirement);
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('匹配计算时出错:', error);
    res.status(500).json({ error: '匹配计算失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
