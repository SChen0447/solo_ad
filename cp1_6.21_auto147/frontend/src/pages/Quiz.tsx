import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quizApi } from '../services/api'
import type { Quiz as QuizType, QuizResult } from '../types'

function Quiz() {
  const { courseId, chapterId } = useParams<{ courseId: string; chapterId: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<QuizType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!courseId) return
      try {
        setLoading(true)
        const data = await quizApi.getByCourse(Number(courseId), Number(chapterId))
        setQuiz(data)
        const initialAnswers: Record<number, number[]> = {}
        data.questions.forEach(q => {
          initialAnswers[q.id] = []
        })
        setAnswers(initialAnswers)
      } catch (err) {
        setError('加载测验失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [courseId, chapterId])

  const handleOptionSelect = (questionId: number, optionId: number, questionType: string) => {
    if (submitted) return

    setAnswers(prev => {
      const current = prev[questionId] || []
      if (questionType === 'single') {
        return { ...prev, [questionId]: [optionId] }
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter(id => id !== optionId) }
        } else {
          return { ...prev, [questionId]: [...current, optionId] }
        }
      }
    })
  }

  const handleSubmit = async () => {
    if (!courseId || !chapterId || !quiz) return

    try {
      const data = await quizApi.submit(Number(courseId), Number(chapterId), answers)
      setResult(data)
      setSubmitted(true)
      setShowNotification(true)

      setTimeout(() => {
        setShowNotification(false)
      }, 5000)
    } catch (err) {
      console.error('提交失败:', err)
      alert('提交失败，请重试')
    }
  }

  const handleRetry = () => {
    if (!quiz) return
    const initialAnswers: Record<number, number[]> = {}
    quiz.questions.forEach(q => {
      initialAnswers[q.id] = []
    })
    setAnswers(initialAnswers)
    setSubmitted(false)
    setResult(null)
  }

  const isOptionSelected = (questionId: number, optionId: number) => {
    return (answers[questionId] || []).includes(optionId)
  }

  const getOptionClassName = (questionId: number, optionId: number, isCorrect: number) => {
    let className = 'option-item'
    const selected = isOptionSelected(questionId, optionId)

    if (selected) {
      className += ' selected'
    }

    if (submitted) {
      if (isCorrect) {
        className += ' correct'
      } else if (selected && !isCorrect) {
        className += ' incorrect'
      }
    }

    return className
  }

  const getQuestionResult = (questionId: number) => {
    if (!result) return null
    return result.results.find(r => r.question_id === questionId)
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (error || !quiz) {
    return <div className="error">{error || '测验不存在'}</div>
  }

  return (
    <div>
      <div className={`quiz-notification ${showNotification ? 'show' : ''}`}>
        你的得分：{result?.score}/{result?.total_questions}
      </div>

      <Link to={`/course/${courseId}`} className="back-link">
        ← 返回课程详情
      </Link>

      <div className="quiz-container">
        <div className="quiz-header">
          <h1 className="quiz-title">{quiz.title}</h1>
          <p className="quiz-subtitle">
            共 {quiz.questions.length} 道题目
            {submitted && result && (
              <span> · 得分：{result.score}/{result.total_questions}（{result.percentage}%）</span>
            )}
          </p>
        </div>

        {quiz.questions.map((question, qIndex) => {
          const qResult = getQuestionResult(question.id)
          return (
            <div key={question.id} className="question-card">
              <div className="question-header">
                <div className="question-number">{qIndex + 1}</div>
                <div>
                  <div className="question-text">{question.question_text}</div>
                  <div className="question-type">
                    {question.question_type === 'single' ? '单选题' : '多选题'}
                  </div>
                </div>
              </div>

              <div className="options-list">
                {question.options.map((option, oIndex) => (
                  <div
                    key={option.id}
                    className={getOptionClassName(question.id, option.id, option.is_correct)}
                    onClick={() => handleOptionSelect(question.id, option.id, question.question_type)}
                  >
                    {question.question_type === 'single' ? (
                      <div className="option-radio">
                        <div className="option-radio-inner" />
                      </div>
                    ) : (
                      <div className="option-checkbox">
                        {isOptionSelected(question.id, option.id) && '✓'}
                      </div>
                    )}
                    <span className="option-text">
                      {String.fromCharCode(65 + oIndex)}. {option.option_text}
                    </span>
                    {submitted && option.is_correct && (
                      <span className="option-feedback">✓ 正确答案</span>
                    )}
                    {submitted && qResult && !option.is_correct && isOptionSelected(question.id, option.id) && (
                      <span className="option-feedback incorrect-feedback">✗ 错误</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="submit-section">
          {!submitted ? (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={Object.values(answers).every(a => a.length === 0)}
            >
              提交答案
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handleRetry}>
                重新测验
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/course/${courseId}`)}
              >
                返回课程
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Quiz
