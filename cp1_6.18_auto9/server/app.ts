import express from 'express';
import cors from 'cors';
import { questionBank, getRandomQuestions, Question } from './questionBank.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const examRouter = express.Router();

examRouter.get('/', (_req, res) => {
  const questions = getRandomQuestions(10);
  const safeQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    tags: q.tags,
  }));
  res.json({ questions: safeQuestions, fullQuestions: questions });
});

examRouter.post('/grade', (req, res) => {
  const { answers, questions } = req.body as {
    answers: (number | null)[];
    questions: Question[];
  };

  if (!answers || !questions) {
    return res.status(400).json({ error: '缺少必要参数：answers 和 questions' });
  }

  const results = questions.map((q, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === q.correctIndex;
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      userAnswer,
      correctAnswer: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
      tags: q.tags,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const score = Math.round((correctCount / totalCount) * 100);

  const tagStats: Record<string, { correct: number; total: number }> = {};
  results.forEach((r) => {
    r.tags.forEach((tag) => {
      if (!tagStats[tag]) {
        tagStats[tag] = { correct: 0, total: 0 };
      }
      tagStats[tag].total++;
      if (r.isCorrect) {
        tagStats[tag].correct++;
      }
    });
  });

  const knowledgeAnalysis = Object.entries(tagStats).map(([tag, stats]) => ({
    tag,
    correct: stats.correct,
    total: stats.total,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  res.json({
    results,
    score,
    correctCount,
    totalCount,
    knowledgeAnalysis,
  });
});

app.use('/api/exam', examRouter);

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});

export default app;
