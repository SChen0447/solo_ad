import { Question, QuestionType } from './questionStore';

export interface AnswerDetail {
  questionId: string;
  userAnswer: string | string[] | null;
  correctAnswer: string | string[];
  isCorrect: boolean;
  score: number;
}

export interface ScoreResult {
  totalScore: number;
  percentage: number;
  details: AnswerDetail[];
  knowledgeStats: Record<string, { correct: number; total: number; percentage: number }>;
}

function normalizeAnswer(
  answer: string | string[] | null | undefined,
  type: QuestionType
): string[] {
  if (answer === null || answer === undefined) {
    return [];
  }

  if (type === 'multiple') {
    if (Array.isArray(answer)) {
      return answer.map((a) => a.trim().toUpperCase()).sort();
    }
    if (typeof answer === 'string') {
      return answer
        .split(/[,，;；\s]+/)
        .map((a) => a.trim().toUpperCase())
        .filter(Boolean)
        .sort();
    }
    return [];
  }

  if (type === 'fill') {
    if (Array.isArray(answer)) {
      return answer.map((a) => a.trim());
    }
    return [answer.trim()];
  }

  if (Array.isArray(answer)) {
    return answer.map((a) => a.trim().toUpperCase());
  }
  return [answer.trim().toUpperCase()];
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function gradeQuiz(
  questions: Question[],
  userAnswers: Record<string, string | string[] | null>
): ScoreResult {
  const details: AnswerDetail[] = [];
  const knowledgeStats: Record<
    string,
    { correct: number; total: number; percentage: number }
  > = {};

  let totalCorrect = 0;
  const totalQuestions = questions.length;
  const scorePerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;

  for (const question of questions) {
    const userAnswer = userAnswers[question.id] ?? null;
    const normalizedUser = normalizeAnswer(userAnswer, question.type);
    const normalizedCorrect = normalizeAnswer(question.correctAnswer, question.type);

    let isCorrect = false;

    if (question.type === 'fill') {
      isCorrect =
        normalizedUser.length > 0 &&
        normalizedCorrect.some(
          (correct) => correct.toLowerCase() === normalizedUser[0].toLowerCase()
        );
    } else {
      isCorrect = arraysEqual(normalizedUser, normalizedCorrect);
    }

    const score = isCorrect ? scorePerQuestion : 0;
    if (isCorrect) totalCorrect++;

    details.push({
      questionId: question.id,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      score,
    });

    if (!knowledgeStats[question.knowledge]) {
      knowledgeStats[question.knowledge] = { correct: 0, total: 0, percentage: 0 };
    }
    knowledgeStats[question.knowledge].total++;
    if (isCorrect) {
      knowledgeStats[question.knowledge].correct++;
    }
  }

  for (const knowledge of Object.keys(knowledgeStats)) {
    const stat = knowledgeStats[knowledge];
    stat.percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
  }

  const totalScore = Math.round(totalCorrect * scorePerQuestion);
  const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    totalScore,
    percentage,
    details,
    knowledgeStats,
  };
}
