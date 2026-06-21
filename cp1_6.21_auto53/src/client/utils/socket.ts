import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function emitJoinQuiz(quizId: string, studentId: string, nickname: string) {
  const s = getSocket()
  s.emit('join-quiz', { quizId, studentId, nickname })
}

export function emitJoinTeacher(quizId: string) {
  const s = getSocket()
  s.emit('join-teacher', { quizId })
}

export function emitStartQuiz(quizId: string, timerDuration?: number) {
  const s = getSocket()
  s.emit('start-quiz', { quizId, timerDuration })
}

export function emitNextQuestion(quizId: string) {
  const s = getSocket()
  s.emit('next-question', { quizId })
}

export function emitEndQuiz(quizId: string) {
  const s = getSocket()
  s.emit('end-quiz', { quizId })
}

export function emitRevealAnswer(quizId: string) {
  const s = getSocket()
  s.emit('reveal-answer', { quizId })
}

export function emitAnswerSubmitted(quizId: string) {
  const s = getSocket()
  s.emit('answer-submitted', { quizId })
}

export function onStatsUpdate(callback: (data: unknown) => void) {
  const s = getSocket()
  s.on('stats-update', callback)
  return () => { s.off('stats-update', callback) }
}

export function onQuizStatus(callback: (data: { status: string; currentQuestionIndex: number; timerDuration?: number }) => void) {
  const s = getSocket()
  s.on('quiz-status', callback)
  return () => { s.off('quiz-status', callback) }
}

export function onQuestionStart(callback: (data: { questionIndex: number; question: { type: string; text: string; options: string[] }; timerDuration: number }) => void) {
  const s = getSocket()
  s.on('question-start', callback)
  return () => { s.off('question-start', callback) }
}

export function onQuestionEnd(callback: (data: { autoSubmit: boolean; allDone?: boolean }) => void) {
  const s = getSocket()
  s.on('question-end', callback)
  return () => { s.off('question-end', callback) }
}

export function onTimerTick(callback: (data: { remaining: number }) => void) {
  const s = getSocket()
  s.on('timer-tick', callback)
  return () => { s.off('timer-tick', callback) }
}

export function onResultReveal(callback: (data: { quiz: { questions: Array<{ type: string; text: string; options: string[]; correctAnswers: number[] }> }; studentResults: Record<string, { score: number; details: Array<{ questionIndex: number; correct: boolean; studentAnswers: number[]; correctAnswers: number[] }> }> }) => void) {
  const s = getSocket()
  s.on('result-reveal', callback)
  return () => { s.off('result-reveal', callback) }
}

export function onStudentJoined(callback: (data: { studentId: string; nickname: string; totalStudents: number }) => void) {
  const s = getSocket()
  s.on('student-joined', callback)
  return () => { s.off('student-joined', callback) }
}

export function onSocketError(callback: (data: { message: string }) => void) {
  const s = getSocket()
  s.on('error', callback)
  return () => { s.off('error', callback) }
}
