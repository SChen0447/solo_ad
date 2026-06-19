import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseResume } from './parser';
import { calculateSkillMatch, getSuggestedKeywords } from './matcher';
import { ParsedResume, JOB_TEMPLATES, JobRequirement, MatchResult } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 54321;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('只支持PDF文件上传'));
    }
  }
});

const resumeStore = new Map<string, ParsedResume>();

app.get('/api/jobs', (req, res) => {
  res.json({
    success: true,
    data: JOB_TEMPLATES
  });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const job = JOB_TEMPLATES.find(j => j.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({
      success: false,
      error: '岗位模板不存在'
    });
  }
  res.json({
    success: true,
    data: job
  });
});

app.post('/api/upload', upload.single('resume'), async (req, res) => {
  try {
    let resumeText = '';

    if (req.file) {
      const fileBuffer = req.file.buffer;
      const textFromBuffer = fileBuffer.toString('utf8');
      const hasPdfHeader = textFromBuffer.startsWith('%PDF');
      
      if (hasPdfHeader) {
        resumeText = extractTextFromPdfBuffer(fileBuffer);
      } else {
        resumeText = textFromBuffer;
      }
    } else if (req.body.text) {
      resumeText = req.body.text;
    } else {
      return res.status(400).json({
        success: false,
        error: '请上传PDF文件或粘贴简历文本'
      });
    }

    if (!resumeText.trim()) {
      return res.status(400).json({
        success: false,
        error: '简历内容为空'
      });
    }

    const parsedResume = parseResume(resumeText);
    resumeStore.set(parsedResume.id, parsedResume);

    setTimeout(() => {
      resumeStore.delete(parsedResume.id);
    }, 3600000);

    res.json({
      success: true,
      data: parsedResume
    });
  } catch (error: any) {
    console.error('[Upload Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || '简历解析失败'
    });
  }
});

app.get('/api/skill-match/:resumeId', (req, res) => {
  try {
    const { resumeId } = req.params;
    const { jobId } = req.query;

    const parsedResume = resumeStore.get(resumeId);
    if (!parsedResume) {
      return res.status(404).json({
        success: false,
        error: '简历数据不存在或已过期'
      });
    }

    let jobRequirement: JobRequirement;
    if (jobId && typeof jobId === 'string') {
      const found = JOB_TEMPLATES.find(j => j.id === jobId);
      if (!found) {
        return res.status(404).json({
          success: false,
          error: '岗位模板不存在'
        });
      }
      jobRequirement = found;
    } else {
      jobRequirement = JOB_TEMPLATES[0];
    }

    const matchResult = calculateSkillMatch(parsedResume.skills, jobRequirement);

    const skillsWithSuggestions = matchResult.skills.map(skill => ({
      ...skill,
      suggestions: skill.score < 50 ? getSuggestedKeywords(skill.skill, jobRequirement.skills) : []
    }));

    res.json({
      success: true,
      data: {
        ...matchResult,
        skills: skillsWithSuggestions,
        job: jobRequirement
      }
    });
  } catch (error: any) {
    console.error('[Match Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || '技能匹配失败'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Resume Parser API is running',
    timestamp: new Date().toISOString()
  });
});

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const text = buffer.toString('utf8');
  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    return matches
      .map(m => m.slice(1, -1))
      .filter(t => t.trim().length > 1)
      .join(' ');
  }
  return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:!?()\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

app.listen(PORT, () => {
  console.log(`[Server] Resume Parser API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
