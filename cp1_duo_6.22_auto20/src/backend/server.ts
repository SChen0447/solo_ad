import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import questionStore, { Question, Difficulty, QuestionType } from './questionStore';
import { gradeQuiz, ScoreResult } from './scorer';

const app = express();
const PORT = 5000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

function determineQuestionType(correctAnswer: string): QuestionType {
  const trimmed = correctAnswer.trim();
  if (/^[A-Da-d]$/.test(trimmed)) {
    return 'single';
  }
  if (/^[A-Da-d]{2,}$/.test(trimmed)) {
    return 'multiple';
  }
  return 'fill';
}

function parseDifficulty(diff: string): Difficulty {
  const d = diff.trim().toLowerCase();
  if (d === '简单' || d === 'easy' || d === 'e') return 'easy';
  if (d === '中等' || d === 'medium' || d === '中' || d === 'm') return 'medium';
  if (d === '困难' || d === 'hard' || d === '难' || d === 'h') return 'hard';
  return 'medium';
}

function parseCorrectAnswer(answer: string, type: QuestionType): string | string[] {
  const trimmed = answer.trim();
  if (type === 'multiple') {
    return trimmed.toUpperCase().split('').sort();
  }
  if (type === 'single') {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

app.post('/api/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传CSV文件' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const results: Omit<Question, 'id'>[] = [];

    const parser = parse({
      delimiter: ',',
      skip_empty_lines: true,
      from_line: 2,
      trim: true,
    });

    parser.on('data', (record: string[]) => {
      if (record.length < 8) return;

      const [questionText, optionA, optionB, optionC, optionD, correctAnswer, knowledge, difficulty] = record;

      if (!questionText || !correctAnswer) return;

      const type = determineQuestionType(correctAnswer);
      const diff = parseDifficulty(difficulty);

      const options: string[] = [];
      if (optionA) options.push(`A. ${optionA}`);
      if (optionB) options.push(`B. ${optionB}`);
      if (optionC) options.push(`C. ${optionC}`);
      if (optionD) options.push(`D. ${optionD}`);

      const parsedCorrect = parseCorrectAnswer(correctAnswer, type);

      results.push({
        type,
        question: questionText,
        options,
        correctAnswer: parsedCorrect,
        knowledge: knowledge.trim(),
        difficulty: diff,
      });
    });

    parser.on('end', () => {
      const count = questionStore.addQuestions(results);
      res.json({
        success: true,
        count,
        total: questionStore.getAllQuestions().length,
      });
    });

    parser.on('error', (err) => {
      console.error('CSV parse error:', err);
      res.status(500).json({ error: 'CSV解析失败' });
    });

    const stream = Readable.from(fileContent);
    stream.pipe(parser);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: '导入失败' });
  }
});

app.post('/api/generate', (req, res) => {
  try {
    const { knowledges, difficulties, count } = req.body;

    const numCount = parseInt(count, 10);
    if (isNaN(numCount) || numCount < 1 || numCount > 50) {
      res.status(400).json({ error: '题目数量必须在1-50之间' });
      return;
    }

    const questions = questionStore.getQuestionsByFilter({
      knowledges: knowledges && knowledges.length > 0 ? knowledges : undefined,
      difficulties: difficulties && difficulties.length > 0 ? difficulties : undefined,
      count: numCount,
    });

    res.json({
      success: true,
      questions,
      totalAvailable: questionStore.getQuestionsByFilter({
        knowledges: knowledges && knowledges.length > 0 ? knowledges : undefined,
        difficulties: difficulties && difficulties.length > 0 ? difficulties : undefined,
      }).length,
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: '生成试卷失败' });
  }
});

app.post('/api/grade', (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!questions || !Array.isArray(questions)) {
      res.status(400).json({ error: '请提供题目列表' });
      return;
    }

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: '请提供答案' });
      return;
    }

    const result: ScoreResult = gradeQuiz(questions, answers);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Grade error:', err);
    res.status(500).json({ error: '评分失败' });
  }
});

app.get('/api/questions', (req, res) => {
  try {
    const questions = questionStore.getAllQuestions();
    res.json({
      success: true,
      questions,
      total: questions.length,
    });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: '获取题目失败' });
  }
});

app.get('/api/knowledges', (req, res) => {
  try {
    const knowledges = questionStore.getKnowledges();
    res.json({
      success: true,
      knowledges,
    });
  } catch (err) {
    console.error('Get knowledges error:', err);
    res.status(500).json({ error: '获取知识点失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', totalQuestions: questionStore.getAllQuestions().length });
});

app.listen(PORT, () => {
  console.log(`QuizForge server is running on http://localhost:${PORT}`);
});
