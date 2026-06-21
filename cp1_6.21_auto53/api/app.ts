import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

export interface Question {
  type: 'single' | 'multiple' | 'boolean'
  text: string
  options: string[]
  correctAnswers: number[]
}

export interface Quiz {
  id: string
  code: string
  title: string
  questions: Question[]
  status: 'waiting' | 'active' | 'finished' | 'revealed'
  currentQuestionIndex: number
  timerDuration: number
  createdAt: number
}

export interface Student {
  id: string
  nickname: string
  quizId: string
  joinedAt: number
}

export interface Answer {
  studentId: string
  questionIndex: number
  answers: number[]
  submittedAt: number
}

export interface QuizStats {
  totalStudents: number
  answeredStudents: number
  correctRate: number
  questionStats: QuestionStats[]
}

export interface QuestionStats {
  questionIndex: number
  optionCounts: number[]
  correctCount: number
  correctRate: number
}

const quizzes: Map<string, Quiz> = new Map()
const students: Map<string, Student> = new Map()
const answersMap: Map<string, Answer[]> = new Map()

export { quizzes, students, answersMap }

app.post('/api/quiz', (req: Request, res: Response): void => {
  const { title, questions, timerDuration } = req.body
  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ success: false, message: '标题和题目不能为空' })
    return
  }

  for (const q of questions) {
    if (!q.text || !q.options || q.options.length < 2 || q.correctAnswers === undefined || q.correctAnswers.length === 0) {
      res.status(400).json({ success: false, message: '每道题至少需要2个选项和1个正确答案' })
      return
    }
  }

  const id = uuidv4()
  const code = String(Math.floor(100000 + Math.random() * 900000))

  const quiz: Quiz = {
    id,
    code,
    title,
    questions,
    status: 'waiting',
    currentQuestionIndex: -1,
    timerDuration: timerDuration || 60,
    createdAt: Date.now(),
  }

  quizzes.set(id, quiz)
  answersMap.set(id, [])

  res.status(201).json({ success: true, quizId: id, code })
})

app.post('/api/quiz/join', (req: Request, res: Response): void => {
  const { code, nickname } = req.body
  if (!code || !nickname) {
    res.status(400).json({ success: false, message: '测验码和昵称不能为空' })
    return
  }

  let quiz: Quiz | undefined
  for (const q of quizzes.values()) {
    if (q.code === code) {
      quiz = q
      break
    }
  }

  if (!quiz) {
    res.status(404).json({ success: false, message: '测验码不存在' })
    return
  }

  const studentId = uuidv4()
  const student: Student = {
    id: studentId,
    nickname,
    quizId: quiz.id,
    joinedAt: Date.now(),
  }
  students.set(studentId, student)

  res.status(200).json({
    success: true,
    studentId,
    quizId: quiz.id,
    quizTitle: quiz.title,
    status: quiz.status,
    totalQuestions: quiz.questions.length,
  })
})

app.post('/api/answer', (req: Request, res: Response): void => {
  const { quizId, studentId, questionIndex, answers: studentAnswers } = req.body
  if (!quizId || !studentId || questionIndex === undefined || !studentAnswers) {
    res.status(400).json({ success: false, message: '参数不完整' })
    return
  }

  const quiz = quizzes.get(quizId)
  if (!quiz) {
    res.status(404).json({ success: false, message: '测验不存在' })
    return
  }

  if (quiz.status !== 'active') {
    res.status(400).json({ success: false, message: '当前不在答题状态' })
    return
  }

  const existingAnswers = answersMap.get(quizId) || []
  const alreadyAnswered = existingAnswers.find(
    (a) => a.studentId === studentId && a.questionIndex === questionIndex
  )
  if (alreadyAnswered) {
    res.status(400).json({ success: false, message: '已提交过答案' })
    return
  }

  const answer: Answer = {
    studentId,
    questionIndex,
    answers: studentAnswers,
    submittedAt: Date.now(),
  }
  existingAnswers.push(answer)
  answersMap.set(quizId, existingAnswers)

  res.status(200).json({ success: true, message: '提交成功' })
})

app.get('/api/quiz/:id/stats', (req: Request, res: Response): void => {
  const { id } = req.params
  const quiz = quizzes.get(id)
  if (!quiz) {
    res.status(404).json({ success: false, message: '测验不存在' })
    return
  }

  const quizStudents: Student[] = []
  for (const s of students.values()) {
    if (s.quizId === id) quizStudents.push(s)
  }

  const quizAnswers = answersMap.get(id) || []

  const questionStats: QuestionStats[] = quiz.questions.map((q, idx) => {
    const qAnswers = quizAnswers.filter((a) => a.questionIndex === idx)
    const optionCounts = q.options.map(() => 0)
    let correctCount = 0

    for (const a of qAnswers) {
      for (const optIdx of a.answers) {
        if (optIdx >= 0 && optIdx < optionCounts.length) {
          optionCounts[optIdx]++
        }
      }
      const sortedA = [...a.answers].sort()
      const sortedC = [...q.correctAnswers].sort()
      if (sortedA.length === sortedC.length && sortedA.every((v, i) => v === sortedC[i])) {
        correctCount++
      }
    }

    return {
      questionIndex: idx,
      optionCounts,
      correctCount,
      correctRate: qAnswers.length > 0 ? correctCount / qAnswers.length : 0,
    }
  })

  const currentIdx = quiz.currentQuestionIndex
  const currentQuestionAnswers = currentIdx >= 0
    ? quizAnswers.filter((a) => a.questionIndex === currentIdx)
    : []
  const currentCorrect = currentIdx >= 0 ? questionStats[currentIdx] : null

  const stats: QuizStats = {
    totalStudents: quizStudents.length,
    answeredStudents: currentQuestionAnswers.length,
    correctRate: currentCorrect ? currentCorrect.correctRate : 0,
    questionStats,
  }

  const answeredStudentIds = new Set(currentQuestionAnswers.map((a) => a.studentId))
  const answeredStudents = quizStudents.filter((s) => answeredStudentIds.has(s.id))
  const unansweredStudents = quizStudents.filter((s) => !answeredStudentIds.has(s.id))

  res.status(200).json({
    success: true,
    quiz,
    students: quizStudents,
    answeredStudents,
    unansweredStudents,
    answers: quizAnswers,
    stats,
  })
})

app.get('/api/quiz/code/:code', (req: Request, res: Response): void => {
  const { code } = req.params
  let quiz: Quiz | undefined
  for (const q of quizzes.values()) {
    if (q.code === code) {
      quiz = q
      break
    }
  }
  if (!quiz) {
    res.status(404).json({ success: false, message: '测验码不存在' })
    return
  }
  res.status(200).json({ success: true, quizId: quiz.id })
})

app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
