import { Question, QuestionResult, StudentAnswer } from '../types';

export function gradeQuestion(
  question: Question,
  studentAnswer: StudentAnswer | undefined
): QuestionResult {
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

  return {
    questionId: question.id,
    isCorrect,
    studentAnswer: studentAns,
    correctAnswer: question.answer,
    score: question.score,
    earnedScore: isCorrect ? question.score : 0,
  };
}

export function gradeAllQuestions(
  questions: Question[],
  answers: StudentAnswer[]
): {
  totalScore: number;
  correctCount: number;
  questionResults: QuestionResult[];
} {
  let totalScore = 0;
  let correctCount = 0;
  const questionResults: QuestionResult[] = [];

  for (const question of questions) {
    const studentAnswer = answers.find((a) => a.questionId === question.id);
    const result = gradeQuestion(question, studentAnswer);
    questionResults.push(result);
    if (result.isCorrect) {
      totalScore += result.score;
      correctCount++;
    }
  }

  return { totalScore, correctCount, questionResults };
}

export function calculateAccuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return (correctCount / totalQuestions) * 100;
}

export function formatAnswerDisplay(
  answer: string | string[] | boolean,
  options?: string[]
): string {
  if (typeof answer === 'boolean') {
    return answer ? '正确' : '错误';
  }
  if (Array.isArray(answer)) {
    if (options && options.length > 0) {
      return answer
        .map((a) => {
          const idx = options.indexOf(a);
          return idx >= 0 ? `${String.fromCharCode(65 + idx)}. ${a}` : a;
        })
        .join(', ');
    }
    return answer.join(', ');
  }
  if (options && options.length > 0) {
    const idx = options.indexOf(answer);
    return idx >= 0 ? `${String.fromCharCode(65 + idx)}. ${answer}` : answer;
  }
  return answer || '(未作答)';
}
