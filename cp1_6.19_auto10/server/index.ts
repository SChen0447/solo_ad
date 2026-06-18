import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Quiz, Question, Submission, QuestionResult, QuizStats } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const quizzes: Map<string, Quiz> = new Map();
const submissions: Map<string, Submission[]> = new Map();
const codeToQuizId: Map<string, string> = new Map();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function gradeSubmission(quiz: Quiz, answers: { questionId: string; answer: string | string[] | boolean }[]): {
  totalScore: number;
  correctCount: number;
  questionResults: QuestionResult[];
} {
  let totalScore = 0;
  let correctCount = 0;
  const questionResults: QuestionResult[] = [];

  for (const question of quiz.questions) {
    const studentAnswer = answers.find(a => a.questionId === question.id);
    const studentAns = studentAnswer ? studentAnswer.answer : '';
    let isCorrect = false;

    if (question.type === 'single') {
      isCorrect = studentAns === question.answer;
    } else if (question.type === 'multiple') {
      const correctArray = question.answer as string[];
      const studentArray = (studentAns as string[] || []).sort();
      isCorrect = JSON.stringify(correctArray.sort()) === JSON.stringify(studentArray);
    } else if (question.type === 'fill') {
      isCorrect = (studentAns as string).trim() === (question.answer as string).trim();
    } else if (question.type === 'judge') {
      isCorrect = studentAns === question.answer;
    }

    if (isCorrect) {
      totalScore += question.score;
      correctCount++;
    }

    questionResults.push({
      questionId: question.id,
      isCorrect,
      studentAnswer: studentAns,
      correctAnswer: question.answer,
      score: question.score,
      earnedScore: isCorrect ? question.score : 0,
    });
  }

  return { totalScore, correctCount, questionResults };
}

app.post('/api/quizzes', (req, res) => {
  const { title, questions } = req.body;
  
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: '标题和题目不能为空' });
  }

  let code = generateInviteCode();
  while (codeToQuizId.has(code)) {
    code = generateInviteCode();
  }

  const quizId = uuidv4();
  const quiz: Quiz = {
    id: quizId,
    code,
    title,
    questions: questions.map((q: Omit<Question, 'id'>) => ({
      ...q,
      id: uuidv4(),
    })),
    createdAt: new Date().toISOString(),
    isPublished: false,
  };

  quizzes.set(quizId, quiz);
  codeToQuizId.set(code, quizId);
  submissions.set(quizId, []);

  res.status(201).json(quiz);
});

app.get('/api/quizzes/:id', (req, res) => {
  const quiz = quizzes.get(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }
  res.json(quiz);
});

app.get('/api/quizzes/code/:code', (req, res) => {
  const quizId = codeToQuizId.get(req.params.code.toUpperCase());
  if (!quizId) {
    return res.status(404).json({ error: '邀请码无效' });
  }
  const quiz = quizzes.get(quizId);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }
  
  const quizWithoutAnswers = {
    ...quiz,
    questions: quiz.questions.map(q => {
      const { answer, ...rest } = q as any;
      return rest;
    }),
  };
  
  res.json(quizWithoutAnswers);
});

app.post('/api/quizzes/:id/submissions', (req, res) => {
  const quiz = quizzes.get(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }

  const { studentName, answers } = req.body;
  if (!studentName || !answers) {
    return res.status(400).json({ error: '学生姓名和答案不能为空' });
  }

  const submission: Submission = {
    id: uuidv4(),
    quizId: quiz.id,
    studentName,
    answers,
    submittedAt: new Date().toISOString(),
  };

  const quizSubmissions = submissions.get(quiz.id) || [];
  quizSubmissions.push(submission);
  submissions.set(quiz.id, quizSubmissions);

  res.status(201).json(submission);
});

app.get('/api/quizzes/:id/submissions', (req, res) => {
  const quiz = quizzes.get(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }

  const quizSubmissions = submissions.get(quiz.id) || [];
  res.json(quizSubmissions);
});

app.post('/api/quizzes/:id/publish', (req, res) => {
  const quiz = quizzes.get(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }

  quiz.isPublished = true;

  const quizSubmissions = submissions.get(quiz.id) || [];
  const gradedSubmissions = quizSubmissions.map(sub => {
    const { totalScore, correctCount, questionResults } = gradeSubmission(quiz, sub.answers);
    return {
      ...sub,
      totalScore,
      correctCount,
      questionResults,
    };
  });

  submissions.set(quiz.id, gradedSubmissions);

  res.json({
    quiz,
    submissions: gradedSubmissions,
  });
});

app.get('/api/quizzes/:id/stats', (req, res) => {
  const quiz = quizzes.get(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: '测验不存在' });
  }

  if (!quiz.isPublished) {
    return res.status(400).json({ error: '测验尚未公布结果' });
  }

  const quizSubmissions = submissions.get(quiz.id) || [];
  const totalStudents = quizSubmissions.length;

  const questionStats = quiz.questions.map(question => {
    let correctCount = 0;
    for (const sub of quizSubmissions) {
      const result = sub.questionResults?.find(r => r.questionId === question.id);
      if (result?.isCorrect) {
        correctCount++;
      }
    }
    return {
      questionId: question.id,
      questionContent: question.content,
      correctRate: totalStudents > 0 ? correctCount / totalStudents : 0,
      correctCount,
      totalCount: totalStudents,
    };
  });

  const stats: QuizStats = { questionStats };
  res.json(stats);
});

app.get('/api/quizzes', (_req, res) => {
  const allQuizzes = Array.from(quizzes.values());
  res.json(allQuizzes);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
