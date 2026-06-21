import { Server as SocketIOServer, type Socket } from 'socket.io'
import { quizzes, students, answersMap } from './app.js'
import type { Quiz, Answer } from './app.js'

interface TimerState {
  remaining: number
  interval: ReturnType<typeof setInterval> | null
}

const activeTimers: Map<string, TimerState> = new Map()

function computeStats(quizId: string) {
  const quiz = quizzes.get(quizId)
  if (!quiz) return null

  const quizStudents: Array<{ id: string; nickname: string; joinedAt: number }> = []
  for (const s of students.values()) {
    if (s.quizId === quizId) quizStudents.push(s)
  }

  const quizAnswers = answersMap.get(quizId) || []

  const questionStats = quiz.questions.map((q, idx) => {
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

  const answeredStudentIds = new Set(currentQuestionAnswers.map((a) => a.studentId))
  const answeredStudents = quizStudents.filter((s) => answeredStudentIds.has(s.id))
  const unansweredStudents = quizStudents.filter((s) => !answeredStudentIds.has(s.id))

  return {
    quiz,
    students: quizStudents,
    answeredStudents,
    unansweredStudents,
    answers: quizAnswers,
    stats: {
      totalStudents: quizStudents.length,
      answeredStudents: currentQuestionAnswers.length,
      correctRate: currentCorrect ? currentCorrect.correctRate : 0,
      questionStats,
    },
  }
}

function emitStatsUpdate(io: SocketIOServer, quizId: string) {
  const stats = computeStats(quizId)
  if (stats) {
    io.to(`quiz-${quizId}`).emit('stats-update', stats)
  }
}

function startTimer(io: SocketIOServer, quizId: string, duration: number) {
  clearTimer(quizId)

  let remaining = duration
  const timerState: TimerState = { remaining, interval: null }
  activeTimers.set(quizId, timerState)

  io.to(`quiz-${quizId}`).emit('timer-tick', { remaining })

  timerState.interval = setInterval(() => {
    remaining--
    timerState.remaining = remaining
    io.to(`quiz-${quizId}`).emit('timer-tick', { remaining })

    if (remaining <= 0) {
      clearTimer(quizId)
      autoSubmitCurrentQuestion(io, quizId)
    }
  }, 1000)
}

function clearTimer(quizId: string) {
  const timer = activeTimers.get(quizId)
  if (timer?.interval) {
    clearInterval(timer.interval)
  }
  activeTimers.delete(quizId)
}

function autoSubmitCurrentQuestion(io: SocketIOServer, quizId: string) {
  const quiz = quizzes.get(quizId)
  if (!quiz || quiz.status !== 'active') return

  const quizStudents: Array<{ id: string }> = []
  for (const s of students.values()) {
    if (s.quizId === quizId) quizStudents.push(s)
  }

  const quizAnswers = answersMap.get(quizId) || []
  const currentIdx = quiz.currentQuestionIndex
  const answeredIds = new Set(
    quizAnswers
      .filter((a) => a.questionIndex === currentIdx)
      .map((a) => a.studentId)
  )

  for (const s of quizStudents) {
    if (!answeredIds.has(s.id)) {
      const blankAnswer: Answer = {
        studentId: s.id,
        questionIndex: currentIdx,
        answers: [],
        submittedAt: Date.now(),
      }
      quizAnswers.push(blankAnswer)
    }
  }
  answersMap.set(quizId, quizAnswers)

  io.to(`quiz-${quizId}`).emit('question-end', { autoSubmit: true })
  emitStatsUpdate(io, quizId)
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id)

    socket.on('join-quiz', (data: { quizId: string; studentId: string; nickname: string }) => {
      const { quizId, studentId, nickname } = data
      const quiz = quizzes.get(quizId)
      if (!quiz) {
        socket.emit('error', { message: '测验不存在' })
        return
      }

      socket.join(`quiz-${quizId}`)
      socket.data = { quizId, studentId, nickname }

      io.to(`quiz-${quizId}`).emit('student-joined', {
        studentId,
        nickname,
        totalStudents: Array.from(students.values()).filter((s) => s.quizId === quizId).length,
      })

      emitStatsUpdate(io, quizId)
      console.log(`Student ${nickname} joined quiz ${quizId}`)
    })

    socket.on('join-teacher', (data: { quizId: string }) => {
      const { quizId } = data
      socket.join(`quiz-${quizId}`)
      socket.data = { quizId, isTeacher: true }
      console.log(`Teacher joined quiz ${quizId}`)
    })

    socket.on('start-quiz', (data: { quizId: string; timerDuration?: number }) => {
      const { quizId, timerDuration } = data
      const quiz = quizzes.get(quizId)
      if (!quiz) {
        socket.emit('error', { message: '测验不存在' })
        return
      }

      quiz.status = 'active'
      quiz.currentQuestionIndex = 0
      if (timerDuration !== undefined) {
        quiz.timerDuration = Math.max(5, Math.min(300, timerDuration))
      }

      io.to(`quiz-${quizId}`).emit('quiz-status', {
        status: quiz.status,
        currentQuestionIndex: quiz.currentQuestionIndex,
        timerDuration: quiz.timerDuration,
      })

      io.to(`quiz-${quizId}`).emit('question-start', {
        questionIndex: 0,
        question: quiz.questions[0],
        timerDuration: quiz.timerDuration,
      })

      startTimer(io, quizId, quiz.timerDuration)
      emitStatsUpdate(io, quizId)
    })

    socket.on('next-question', (data: { quizId: string }) => {
      const { quizId } = data
      const quiz = quizzes.get(quizId)
      if (!quiz) return

      clearTimer(quizId)

      const nextIdx = quiz.currentQuestionIndex + 1
      if (nextIdx >= quiz.questions.length) {
        quiz.status = 'finished'
        io.to(`quiz-${quizId}`).emit('quiz-status', {
          status: quiz.status,
          currentQuestionIndex: quiz.currentQuestionIndex,
        })
        io.to(`quiz-${quizId}`).emit('question-end', { autoSubmit: false, allDone: true })
        emitStatsUpdate(io, quizId)
        return
      }

      quiz.currentQuestionIndex = nextIdx
      quiz.status = 'active'

      io.to(`quiz-${quizId}`).emit('quiz-status', {
        status: quiz.status,
        currentQuestionIndex: nextIdx,
        timerDuration: quiz.timerDuration,
      })

      io.to(`quiz-${quizId}`).emit('question-start', {
        questionIndex: nextIdx,
        question: quiz.questions[nextIdx],
        timerDuration: quiz.timerDuration,
      })

      startTimer(io, quizId, quiz.timerDuration)
      emitStatsUpdate(io, quizId)
    })

    socket.on('end-quiz', (data: { quizId: string }) => {
      const { quizId } = data
      const quiz = quizzes.get(quizId)
      if (!quiz) return

      clearTimer(quizId)

      autoSubmitCurrentQuestion(io, quizId)

      quiz.status = 'finished'
      io.to(`quiz-${quizId}`).emit('quiz-status', {
        status: quiz.status,
        currentQuestionIndex: quiz.currentQuestionIndex,
      })
      io.to(`quiz-${quizId}`).emit('question-end', { autoSubmit: false, allDone: true })
      emitStatsUpdate(io, quizId)
    })

    socket.on('reveal-answer', (data: { quizId: string }) => {
      const { quizId } = data
      const quiz = quizzes.get(quizId)
      if (!quiz) return

      quiz.status = 'revealed'
      const quizAnswers = answersMap.get(quizId) || []

      const studentResults: Record<string, { score: number; details: Array<{ questionIndex: number; correct: boolean; studentAnswers: number[]; correctAnswers: number[] }> }> = {}
      const quizStudents: Array<{ id: string; nickname: string; joinedAt: number }> = []
      for (const s of students.values()) {
        if (s.quizId === quizId) {
          quizStudents.push(s)
          studentResults[s.id] = { score: 0, details: [] }
        }
      }

      for (const q of quiz.questions) {
        const idx = quiz.questions.indexOf(q)
        const qAnswers = quizAnswers.filter((a) => a.questionIndex === idx)

        for (const student of quizStudents) {
          const studentAnswer = qAnswers.find((a) => a.studentId === student.id)
          const sa = studentAnswer ? studentAnswer.answers : []
          const sortedA = [...sa].sort()
          const sortedC = [...q.correctAnswers].sort()
          const correct = sortedA.length === sortedC.length && sortedA.every((v, i) => v === sortedC[i])

          if (studentResults[student.id]) {
            studentResults[student.id].details.push({
              questionIndex: idx,
              correct,
              studentAnswers: sa,
              correctAnswers: q.correctAnswers,
            })
            if (correct) {
              studentResults[student.id].score += Math.round(100 / quiz.questions.length)
            }
          }
        }
      }

      io.to(`quiz-${quizId}`).emit('quiz-status', {
        status: quiz.status,
        currentQuestionIndex: quiz.currentQuestionIndex,
      })

      io.to(`quiz-${quizId}`).emit('result-reveal', {
        quiz,
        studentResults,
      })

      emitStatsUpdate(io, quizId)
    })

    socket.on('answer-submitted', (data: { quizId: string }) => {
      emitStatsUpdate(io, data.quizId)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id)
    })
  })
}
