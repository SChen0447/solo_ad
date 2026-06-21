import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type {
  WordBank,
  Word,
  Test,
  Question,
  TestSubmission,
  DataStore,
  PartOfSpeech,
  QuestionType,
  DiagnosisDimension,
  WrongQuestion,
  DiagnosisReport,
  ScoreRank,
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

function readData(): DataStore {
  if (!fs.existsSync(DATA_FILE)) {
    const initial: DataStore = { wordbanks: [], tests: [], submissions: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content) as DataStore;
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(
  words: Word[],
  count: number,
  types: QuestionType[],
  pointsPerQuestion: number
): Question[] {
  const selectedWords = shuffle(words).slice(0, count);
  const questions: Question[] = [];

  for (let i = 0; i < selectedWords.length; i++) {
    const word = selectedWords[i];
    const type = types[i % types.length];

    if (type === 'choice') {
      const wrongChoices = shuffle(words.filter((w) => w.id !== word.id))
        .slice(0, 3)
        .map((w) => w.chinese);
      const options = shuffle([word.chinese, ...wrongChoices]);
      questions.push({
        id: uuidv4(),
        type: 'choice',
        wordId: word.id,
        word,
        prompt: `请选择单词 "${word.english}" 的中文释义：`,
        answer: word.chinese,
        options,
        points: pointsPerQuestion,
      });
    } else if (type === 'fill') {
      questions.push({
        id: uuidv4(),
        type: 'fill',
        wordId: word.id,
        word,
        prompt: `请根据中文释义填写单词："${word.chinese}"`,
        answer: word.english,
        points: pointsPerQuestion,
      });
    } else {
      questions.push({
        id: uuidv4(),
        type: 'dictation',
        wordId: word.id,
        word,
        prompt: '请听录音并拼写单词',
        answer: word.english,
        points: pointsPerQuestion,
      });
    }
  }

  return questions;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

function calculateDimensions(
  submission: TestSubmission,
  test: Test
): DiagnosisDimension[] {
  const { answers, totalScore, maxScore } = submission;
  const choiceQs = answers.filter((_, i) => test.questions[i].type === 'choice');
  const fillQs = answers.filter((_, i) => test.questions[i].type === 'fill');
  const dictQs = answers.filter((_, i) => test.questions[i].type === 'dictation');

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const correctChoice = choiceQs.filter((a) => a.isCorrect).length;
  const correctFill = fillQs.filter((a) => a.isCorrect).length;
  const correctDict = dictQs.filter((a) => a.isCorrect).length;

  const accuracy = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const breadth = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const spelling = fillQs.length > 0 ? Math.round((correctFill / fillQs.length) * 100) : 0;
  const listening = dictQs.length > 0 ? Math.round((correctDict / dictQs.length) * 100) : 0;
  const grammar = choiceQs.length > 0 ? Math.round((correctChoice / choiceQs.length) * 100) : 0;

  const avgTime = answers.length > 0
    ? answers.reduce((s, a) => s + a.timeSpent, 0) / answers.length
    : 0;
  const speed = Math.max(0, Math.min(100, Math.round(100 - avgTime / 100)));

  return [
    { dimension: '词汇广度', score: breadth, fullMark: 100 },
    { dimension: '拼写准确', score: spelling || accuracy, fullMark: 100 },
    { dimension: '语法理解', score: grammar || accuracy, fullMark: 100 },
    { dimension: '听力识别', score: listening || accuracy, fullMark: 100 },
    { dimension: '反应速度', score: speed, fullMark: 100 },
  ];
}

app.get('/api/wordbanks', (_req, res) => {
  try {
    const data = readData();
    res.json(data.wordbanks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wordbanks' });
  }
});

app.post('/api/wordbanks', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: '名称不能为空' });
      return;
    }
    const data = readData();
    const newBank: WordBank = {
      id: uuidv4(),
      name,
      description,
      words: [],
      createdAt: new Date().toISOString(),
    };
    data.wordbanks.push(newBank);
    writeData(data);
    res.status(201).json(newBank);
  } catch (err) {
    res.status(500).json({ error: '创建词汇库失败' });
  }
});

app.post('/api/wordbanks/:id/words', (req, res) => {
  try {
    const { id } = req.params;
    const { words } = req.body as { words?: Array<Partial<Word> & { english: string; chinese: string }> };
    const data = readData();
    const bank = data.wordbanks.find((b) => b.id === id);
    if (!bank) {
      res.status(404).json({ error: '词汇库不存在' });
      return;
    }
    if (!words || !Array.isArray(words)) {
      res.status(400).json({ error: '词汇列表格式错误' });
      return;
    }
    const newWords: Word[] = words.map((w) => ({
      id: uuidv4(),
      english: w.english.trim(),
      chinese: w.chinese.trim(),
      example: w.example,
      partOfSpeech: (w.partOfSpeech || 'noun') as PartOfSpeech,
      createdAt: new Date().toISOString(),
    }));
    bank.words = [...bank.words, ...newWords];
    writeData(data);
    res.status(201).json({ words: newWords, totalCount: bank.words.length });
  } catch (err) {
    res.status(500).json({ error: '添加词汇失败' });
  }
});

app.post('/api/tests', (req, res) => {
  try {
    const { wordBankId, name, config } = req.body;
    const data = readData();
    const bank = data.wordbanks.find((b) => b.id === wordBankId);
    if (!bank) {
      res.status(404).json({ error: '词汇库不存在' });
      return;
    }
    if (bank.words.length < config.questionCount) {
      res.status(400).json({ error: `词汇不足，需要至少 ${config.questionCount} 个词汇` });
      return;
    }
    let code = generateCode();
    while (data.tests.some((t) => t.code === code)) {
      code = generateCode();
    }
    const questions = generateQuestions(
      bank.words,
      config.questionCount,
      config.questionTypes,
      config.pointsPerQuestion
    );
    const newTest: Test = {
      id: uuidv4(),
      wordBankId,
      wordBankName: bank.name,
      name,
      config,
      code,
      questions,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    data.tests.push(newTest);
    writeData(data);
    res.status(201).json(newTest);
  } catch (err) {
    res.status(500).json({ error: '创建测试失败' });
  }
});

app.get('/api/tests', (_req, res) => {
  try {
    const data = readData();
    const testsWithStats = data.tests.map((t) => {
      const subs = data.submissions.filter((s) => s.testId === t.id);
      return { ...t, submissions: subs.length };
    });
    res.json(testsWithStats);
  } catch (err) {
    res.status(500).json({ error: '加载测试列表失败' });
  }
});

app.patch('/api/tests/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: Test['status'] };
    if (!status || !['draft', 'active', 'closed'].includes(status)) {
      res.status(400).json({ error: '无效的状态' });
      return;
    }
    const data = readData();
    const test = data.tests.find((t) => t.id === id);
    if (!test) {
      res.status(404).json({ error: '测试不存在' });
      return;
    }
    test.status = status;
    writeData(data);
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: '更新状态失败' });
  }
});

app.get('/api/tests/:code/code', (req, res) => {
  try {
    const { code } = req.params;
    const data = readData();
    const test = data.tests.find((t) => t.code === code.toUpperCase());
    if (!test) {
      res.status(404).json({ error: '邀请码无效' });
      return;
    }
    if (test.status !== 'active') {
      res.status(400).json({ error: '测试未开始或已结束' });
      return;
    }
    const { questions, ...rest } = test;
    const safeQuestions = questions.map((q) => {
      const { answer, ...qRest } = q;
      return qRest;
    });
    res.json({ ...rest, questions: safeQuestions, totalQuestions: questions.length });
  } catch (err) {
    res.status(500).json({ error: '获取测试失败' });
  }
});

app.get('/api/tests/:id/scores', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const test = data.tests.find((t) => t.id === id);
    if (!test) {
      res.status(404).json({ error: '测试不存在' });
      return;
    }
    const subs = data.submissions
      .filter((s) => s.testId === id)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.timeSpent - b.timeSpent;
      })
      .map<ScoreRank>((s, i) => ({
        rank: i + 1,
        studentId: s.studentId,
        studentName: s.studentName,
        totalScore: s.totalScore,
        maxScore: s.maxScore,
        timeSpent: s.timeSpent,
        submittedAt: s.submittedAt,
      }));
    res.json({ test, scores: subs });
  } catch (err) {
    res.status(500).json({ error: '获取成绩失败' });
  }
});

app.post('/api/tests/submit', (req, res) => {
  try {
    const { testId, studentId, studentName, answers: rawAnswers } = req.body as {
      testId: string;
      studentId: string;
      studentName: string;
      answers: Array<{ questionId: string; answer: string; timeSpent: number }>;
    };
    const data = readData();
    const test = data.tests.find((t) => t.id === testId);
    if (!test) {
      res.status(404).json({ error: '测试不存在' });
      return;
    }
    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswers = test.questions.map((q) => {
      const raw = rawAnswers.find((r) => r.questionId === q.id);
      const studentAns = raw?.answer || '';
      const isCorrect = normalizeAnswer(studentAns) === normalizeAnswer(q.answer);
      if (isCorrect) totalScore += q.points;
      maxScore += q.points;
      return {
        questionId: q.id,
        answer: studentAns,
        isCorrect,
        timeSpent: raw?.timeSpent || 0,
      };
    });
    const totalTimeSpent = evaluatedAnswers.reduce((s, a) => s + a.timeSpent, 0);
    const submission: TestSubmission = {
      testId,
      studentId,
      studentName,
      answers: evaluatedAnswers,
      totalScore,
      maxScore,
      timeSpent: totalTimeSpent,
      submittedAt: new Date().toISOString(),
    };
    data.submissions.push(submission);
    writeData(data);

    const dimensions = calculateDimensions(submission, test);
    const wrongQuestions: WrongQuestion[] = evaluatedAnswers
      .map<WrongQuestion | null>((a, i) => {
        if (a.isCorrect) return null;
        const q = test.questions[i];
        return {
          question: q,
          studentAnswer: a.answer,
          correctAnswer: q.answer,
          type: q.type,
        };
      })
      .filter((x): x is WrongQuestion => x !== null);

    const report: DiagnosisReport = {
      studentId,
      studentName,
      testId,
      testName: test.name,
      completedAt: submission.submittedAt,
      timeSpent: submission.timeSpent,
      totalScore,
      maxScore,
      dimensions,
      wrongQuestions,
    };
    res.status(201).json({ submission, report });
  } catch (err) {
    res.status(500).json({ error: '提交失败' });
  }
});

app.get('/api/scores/:studentId', (req, res) => {
  try {
    const { studentId } = req.params;
    const data = readData();
    const subs = data.submissions.filter((s) => s.studentId === studentId);
    const reports = subs.map<DiagnosisReport | null>((sub) => {
      const test = data.tests.find((t) => t.id === sub.testId);
      if (!test) return null;
      const dimensions = calculateDimensions(sub, test);
      const wrongQuestions: WrongQuestion[] = sub.answers
        .map<WrongQuestion | null>((a, i) => {
          if (a.isCorrect) return null;
          const q = test.questions[i];
          return {
            question: q,
            studentAnswer: a.answer,
            correctAnswer: q.answer,
            type: q.type,
          };
        })
        .filter((x): x is WrongQuestion => x !== null);
      return {
        studentId: sub.studentId,
        studentName: sub.studentName,
        testId: sub.testId,
        testName: test.name,
        completedAt: sub.submittedAt,
        timeSpent: sub.timeSpent,
        totalScore: sub.totalScore,
        maxScore: sub.maxScore,
        dimensions,
        wrongQuestions,
      };
    }).filter((x): x is DiagnosisReport => x !== null);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: '获取报告失败' });
  }
});

app.get('/api/submission/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const sub = data.submissions.find((s) => {
      const key = `${s.testId}-${s.studentId}`;
      return key === id || s.testId === id;
    });
    if (!sub) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    const test = data.tests.find((t) => t.id === sub.testId)!;
    const dimensions = calculateDimensions(sub, test);
    const wrongQuestions: WrongQuestion[] = sub.answers
      .map<WrongQuestion | null>((a, i) => {
        if (a.isCorrect) return null;
        const q = test.questions[i];
        return {
          question: q,
          studentAnswer: a.answer,
          correctAnswer: q.answer,
          type: q.type,
        };
      })
      .filter((x): x is WrongQuestion => x !== null);
    const report: DiagnosisReport = {
      studentId: sub.studentId,
      studentName: sub.studentName,
      testId: sub.testId,
      testName: test.name,
      completedAt: sub.submittedAt,
      timeSpent: sub.timeSpent,
      totalScore: sub.totalScore,
      maxScore: sub.maxScore,
      dimensions,
      wrongQuestions,
    };
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: '获取报告失败' });
  }
});

app.listen(PORT, () => {
  console.log(`VocabTest API server running at http://localhost:${PORT}`);
});
