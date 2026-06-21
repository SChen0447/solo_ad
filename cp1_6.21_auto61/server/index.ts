import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTFOLIOS_FILE = path.join(DATA_DIR, 'portfolios.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const readJsonFile = <T>(filePath: string): T => {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  reply?: string;
  replyAt?: string;
}

interface Portfolio {
  id: string;
  name: string;
  coverImage: string;
  createdAt: string;
  tools: string[];
  description: string;
  images: string[];
  comments: Comment[];
}

interface Message {
  id: string;
  sender: 'client' | 'designer';
  content: string;
  createdAt: string;
}

interface Inquiry {
  id: string;
  budget: string;
  description: string;
  expectedDate: string;
  createdAt: string;
  status: 'pending' | 'replied' | 'completed';
  messages: Message[];
}

app.get('/api/portfolios', (_req: Request, res: Response<Portfolio[]>) => {
  try {
    const portfolios = readJsonFile<Portfolio[]>(PORTFOLIOS_FILE);
    res.json(portfolios);
  } catch (error) {
    res.status(500).json([] as unknown as Portfolio[]);
  }
});

app.get('/api/portfolio/:id', (req: Request, res: Response<Portfolio | { error: string }>) => {
  try {
    const portfolios = readJsonFile<Portfolio[]>(PORTFOLIOS_FILE);
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/portfolio', (req: Request, res: Response<Portfolio | { error: string }>) => {
  try {
    const { name, coverImage, createdAt, tools, description, images } = req.body;
    if (!name || !coverImage || !createdAt || !tools || !description || !images) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const portfolios = readJsonFile<Portfolio[]>(PORTFOLIOS_FILE);
    const newPortfolio: Portfolio = {
      id: uuidv4(),
      name,
      coverImage,
      createdAt,
      tools,
      description: description.slice(0, 300),
      images,
      comments: [],
    };
    portfolios.unshift(newPortfolio);
    writeJsonFile(PORTFOLIOS_FILE, portfolios);
    res.json(newPortfolio);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/portfolio/:id/comment', (req: Request, res: Response<Comment | { error: string }>) => {
  try {
    const { author, content } = req.body;
    if (!author || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const portfolios = readJsonFile<Portfolio[]>(PORTFOLIOS_FILE);
    const portfolioIndex = portfolios.findIndex(p => p.id === req.params.id);
    if (portfolioIndex === -1) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    const newComment: Comment = {
      id: uuidv4(),
      author,
      content,
      createdAt: new Date().toISOString(),
    };
    portfolios[portfolioIndex].comments.push(newComment);
    writeJsonFile(PORTFOLIOS_FILE, portfolios);
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/portfolio/:id/comment/:commentId/reply', (req: Request, res: Response<Comment | { error: string }>) => {
  try {
    const { reply } = req.body;
    if (!reply) {
      res.status(400).json({ error: 'Missing reply content' });
      return;
    }
    const portfolios = readJsonFile<Portfolio[]>(PORTFOLIOS_FILE);
    const portfolio = portfolios.find(p => p.id === req.params.id);
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found' });
      return;
    }
    const commentIndex = portfolio.comments.findIndex(c => c.id === req.params.commentId);
    if (commentIndex === -1) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    portfolio.comments[commentIndex].reply = reply;
    portfolio.comments[commentIndex].replyAt = new Date().toISOString();
    writeJsonFile(PORTFOLIOS_FILE, portfolios);
    res.json(portfolio.comments[commentIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/inquiries', (_req: Request, res: Response<Inquiry[]>) => {
  try {
    const inquiries = readJsonFile<Inquiry[]>(INQUIRIES_FILE);
    res.json(inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    res.status(500).json([] as unknown as Inquiry[]);
  }
});

app.post('/api/inquiry', (req: Request, res: Response<Inquiry | { error: string }>) => {
  try {
    const { budget, description, expectedDate } = req.body;
    if (!budget || !description || !expectedDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const inquiries = readJsonFile<Inquiry[]>(INQUIRIES_FILE);
    const newInquiry: Inquiry = {
      id: uuidv4(),
      budget,
      description,
      expectedDate,
      createdAt: new Date().toISOString(),
      status: 'pending',
      messages: [
        {
          id: uuidv4(),
          sender: 'client',
          content: description,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    inquiries.unshift(newInquiry);
    writeJsonFile(INQUIRIES_FILE, inquiries);
    res.json(newInquiry);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inquiry/:id/reply', (req: Request, res: Response<Inquiry | { error: string }>) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Missing reply content' });
      return;
    }
    const inquiries = readJsonFile<Inquiry[]>(INQUIRIES_FILE);
    const inquiryIndex = inquiries.findIndex(i => i.id === req.params.id);
    if (inquiryIndex === -1) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }
    const newMessage: Message = {
      id: uuidv4(),
      sender: 'designer',
      content,
      createdAt: new Date().toISOString(),
    };
    inquiries[inquiryIndex].messages.push(newMessage);
    if (inquiries[inquiryIndex].status === 'pending') {
      inquiries[inquiryIndex].status = 'replied';
    }
    writeJsonFile(INQUIRIES_FILE, inquiries);
    res.json(inquiries[inquiryIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/inquiry/:id/status', (req: Request, res: Response<Inquiry | { error: string }>) => {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'replied', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const inquiries = readJsonFile<Inquiry[]>(INQUIRIES_FILE);
    const inquiryIndex = inquiries.findIndex(i => i.id === req.params.id);
    if (inquiryIndex === -1) {
      res.status(404).json({ error: 'Inquiry not found' });
      return;
    }
    inquiries[inquiryIndex].status = status;
    writeJsonFile(INQUIRIES_FILE, inquiries);
    res.json(inquiries[inquiryIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
