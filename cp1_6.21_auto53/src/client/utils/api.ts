export interface Question {
  type: 'single' | 'multiple' | 'boolean'
  text: string
  options: string[]
  correctAnswers: number[]
}

export interface QuizStats {
  quiz: {
    id: string
    code: string
    title: string
    questions: Question[]
    status: 'waiting' | 'active' | 'finished' | 'revealed'
    currentQuestionIndex: number
    timerDuration: number
  }
  students: Array<{ id: string; nickname: string; joinedAt: number }>
  answeredStudents: Array<{ id: string; nickname: string; joinedAt: number }>
  unansweredStudents: Array<{ id: string; nickname: string; joinedAt: number }>
  answers: Array<{ studentId: string; questionIndex: number; answers: number[]; submittedAt: number }>
  stats: {
    totalStudents: number
    answeredStudents: number
    correctRate: number
    questionStats: Array<{
      questionIndex: number
      optionCounts: number[]
      correctCount: number
      correctRate: number
    }>
  }
}

export async function createQuiz(data: {
  title: string
  questions: Question[]
  timerDuration?: number
}): Promise<{ success: boolean; quizId?: string; code?: string; message?: string }> {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function joinQuiz(data: {
  code: string
  nickname: string
}): Promise<{
  success: boolean
  studentId?: string
  quizId?: string
  quizTitle?: string
  status?: string
  totalQuestions?: number
  message?: string
}> {
  const res = await fetch('/api/quiz/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function submitAnswer(data: {
  quizId: string
  studentId: string
  questionIndex: number
  answers: number[]
}): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getStats(quizId: string): Promise<QuizStats> {
  const res = await fetch(`/api/quiz/${quizId}/stats`)
  return res.json()
}
