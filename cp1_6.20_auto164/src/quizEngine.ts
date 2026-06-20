import type { Difficulty, EngineState, Question } from '../types';

const DIFFICULTY_LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const THRESHOLD_UP = 3;
const THRESHOLD_HARD_WRONG_DOWN = 2;

export function getNextDifficulty(
  currentDifficulty: Difficulty,
  consecutiveCorrect: number,
  consecutiveHardWrong: number,
  isCorrect: boolean
): {
  difficulty: Difficulty;
  consecutiveCorrect: number;
  consecutiveHardWrong: number;
} {
  const newConsecutiveCorrect = isCorrect ? consecutiveCorrect + 1 : 0;

  const newConsecutiveHardWrong =
    currentDifficulty === 'hard' && !isCorrect
      ? consecutiveHardWrong + 1
      : 0;

  let newDifficulty = currentDifficulty;
  const currentIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);

  if (newConsecutiveCorrect >= THRESHOLD_UP && currentIndex < DIFFICULTY_LEVELS.length - 1) {
    newDifficulty = DIFFICULTY_LEVELS[currentIndex + 1];
    return {
      difficulty: newDifficulty,
      consecutiveCorrect: 0,
      consecutiveHardWrong: newConsecutiveHardWrong
    };
  }

  if (currentDifficulty === 'hard' && newConsecutiveHardWrong >= THRESHOLD_HARD_WRONG_DOWN) {
    return {
      difficulty: 'medium',
      consecutiveCorrect: newConsecutiveCorrect,
      consecutiveHardWrong: 0
    };
  }

  return {
    difficulty: newDifficulty,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveHardWrong: newConsecutiveHardWrong
  };
}

export function selectNextQuestion(
  questions: Question[],
  difficulty: Difficulty,
  answeredIds: number[]
): Question | null {
  const available = questions.filter(
    (q) => q.difficulty === difficulty && !answeredIds.includes(q.id)
  );

  if (available.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function createInitialState(): EngineState {
  return {
    currentDifficulty: 'easy',
    consecutiveCorrect: 0,
    consecutiveHardWrong: 0,
    answeredIds: []
  };
}

export function processAnswer(
  state: EngineState,
  isCorrect: boolean,
  questionId: number,
  questions: Question[]
): { state: EngineState; nextQuestion: Question | null } {
  const difficultyResult = getNextDifficulty(
    state.currentDifficulty,
    state.consecutiveCorrect,
    state.consecutiveHardWrong,
    isCorrect
  );

  const newAnsweredIds = [...state.answeredIds, questionId];

  const nextQuestion = selectNextQuestion(
    questions,
    difficultyResult.difficulty,
    newAnsweredIds
  );

  const newState: EngineState = {
    currentDifficulty: difficultyResult.difficulty,
    consecutiveCorrect: difficultyResult.consecutiveCorrect,
    consecutiveHardWrong: difficultyResult.consecutiveHardWrong,
    answeredIds: newAnsweredIds
  };

  return { state: newState, nextQuestion };
}

export const difficultyLabels: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};
