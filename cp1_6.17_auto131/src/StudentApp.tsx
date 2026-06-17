import React, { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import QuestionBubble, { QuestionData } from './components/QuestionBubble'

interface CourseState {
  code: string
  name: string
  status: string
  remaining_time: number
  questions: QuestionData[]
  vote_active: boolean
  vote_questions: string[]
}

type View = 'enter' | 'qa' | 'vote' | 'results'

const StudentApp: React.FC = () => {
  const [view, setView] = useState<View>('enter')
  const [courseCode, setCourseCode] = useState('')
  const [course, setCourse] = useState<CourseState | null>(null)
  const [questionText, setQuestionText] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [votedQuestions, setVotedQuestions] = useState<Set<string>>(new Set())
  const [pageTransition, setPageTransition] = useState(false)
  const [studentId] = useState(() => `stu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const countdownRef = useRef<number | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeFromUrl = urlParams.get('code')
    if (codeFromUrl) {
      setCourseCode(codeFromUrl)
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  const changeView = (newView: View) => {
    setPageTransition(true)
    setTimeout(() => {
      setView(newView)
      setPageTransition(false)
    }, 400)
  }

  const enterCourse = () => {
    if (courseCode.length !== 6) {
      alert('请输入6位课程码')
      return
    }
    initSocket(courseCode)
  }

  const initSocket = (code: string) => {
    socketRef.current = io({ transports: ['websocket', 'polling'] })
    const socket = socketRef.current

    socket.on('connect', () => {
      socket.emit('join_course', { code })
    })

    socket.on('course_state', (state: CourseState) => {
      setCourse(state)

      if (state.status === 'qa_active') {
        changeView('qa')
        startCountdown(state.remaining_time)
      } else if (state.status === 'vote_active') {
        changeView('vote')
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }
      } else if (state.status === 'waiting') {
        changeView('qa')
      }
    })

    socket.on('new_question', (data: { code: string; question: QuestionData }) => {
      setCourse(prev => {
        if (!prev) return prev
        return { ...prev, questions: [...prev.questions, data.question] }
      })
    })

    socket.on('question_updated', (data: { code: string; question: QuestionData }) => {
      setCourse(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.id === data.question.id ? data.question : q
          )
        }
      })
    })

    socket.on('vote_updated', (data: { code: string; result: any }) => {
      setCourse(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.id === data.result.question_id
              ? {
                  ...q,
                  votes_agree: data.result.votes_agree,
                  votes_disagree: data.result.votes_disagree
                }
              : q
          )
        }
      })
    })

    socket.on('qa_started', (state: CourseState) => {
      setCourse(state)
      changeView('qa')
      startCountdown(state.remaining_time)
      setShowVoteModal(false)
    })

    socket.on('qa_ended', (state: CourseState) => {
      setCourse(state)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      setCountdown(0)
      changeView('vote')
      setShowVoteModal(true)
    })

    socket.on('error', (err: { message: string }) => {
      console.error('Socket error:', err.message)
    })
  }

  const startCountdown = (seconds: number) => {
    setCountdown(seconds)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    countdownRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const submitQuestion = () => {
    if (!questionText.trim() || !course || !socketRef.current) return
    if (questionText.length > 200) {
      alert('问题不能超过200字')
      return
    }
    socketRef.current.emit('submit_question', {
      code: course.code,
      content: questionText.trim()
    })
    setQuestionText('')
  }

  const handleVote = (questionId: string, agree: boolean) => {
    if (!course || !socketRef.current || votedQuestions.has(questionId)) return

    socketRef.current.emit('submit_vote', {
      code: course.code,
      question_id: questionId,
      student_id: studentId,
      agree: agree
    })

    setVotedQuestions(prev => new Set(prev).add(questionId))
  }

  const getVoteQuestions = () => {
    if (!course) return []
    return course.questions.filter(q => course.vote_questions.includes(q.id))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const navBar = (
    <div
      style={{
        height: '60px',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        gap: '20px'
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        课堂问答互动平台 · 学生端
      </div>
      {course && (
        <div style={{ fontSize: '14px', color: '#6B7280', background: '#F3F4F6', padding: '4px 12px', borderRadius: '8px' }}>
          课程码: <strong style={{ color: '#6366F1' }}>{course.code}</strong>
        </div>
      )}
    </div>
  )

  const transitionStyle: React.CSSProperties = {
    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    transform: pageTransition ? 'translateX(100%)' : 'translateX(0)',
    opacity: pageTransition ? 0 : 1
  }

  const renderCountdownClock = () => {
    const totalSeconds = 300
    const progress = countdown / totalSeconds
    const circumference = 2 * Math.PI * 65
    const strokeDashoffset = circumference * (1 - progress)
    const isUrgent = countdown <= 10

    return (
      <div
        style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          margin: '0 auto 24px'
        }}
      >
        <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="75"
            cy="75"
            r="65"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="10"
          />
          <circle
            cx="75"
            cy="75"
            r="65"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: 700,
            color: isUrgent ? '#EF4444' : '#6366F1',
            animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none'
          }}
        >
          {formatTime(countdown)}
        </div>
      </div>
    )
  }

  const renderEnterView = () => (
    <div style={transitionStyle}>
      <div style={{ maxWidth: '500px', margin: '60px auto', padding: '0 20px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎓</div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#1F2937' }}>
              加入课程
            </h1>
            <p style={{ color: '#6B7280' }}>
              输入教师提供的6位课程码，开始互动
            </p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontSize: '14px' }}>
              课程码
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={e => setCourseCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              placeholder="请输入6位课程码..."
              maxLength={6}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#6366F1'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') enterCourse()
              }}
            />
          </div>
          <button
            onClick={enterCourse}
            disabled={courseCode.length !== 6}
            style={{
              width: '100%',
              padding: '16px',
              background: courseCode.length === 6
                ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                : '#D1D5DB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: courseCode.length === 6 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: courseCode.length === 6 ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            进入课程
          </button>
        </div>
      </div>
    </div>
  )

  const renderQaView = () => (
    <div style={transitionStyle}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
        {course?.status === 'waiting' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '60px 32px',
              textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '24px', color: '#1F2937', marginBottom: '8px' }}>
              等待教师开始提问
            </h2>
            <p style={{ color: '#6B7280' }}>
              课程: {course.name}
            </p>
          </div>
        )}

        {course?.status === 'qa_active' && (
          <>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '24px',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
              }}
            >
              <h2 style={{ fontSize: '20px', color: '#1F2937', marginBottom: '16px' }}>
                匿名提问时段
              </h2>
              {renderCountdownClock()}
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  placeholder="请输入你的问题（限200字，匿名发送）..."
                  maxLength={200}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '15px',
                    resize: 'vertical',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#6366F1'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: questionText.length > 180 ? '#EF4444' : '#9CA3AF' }}>
                    {questionText.length}/200
                  </span>
                </div>
              </div>
              <button
                onClick={submitQuestion}
                disabled={!questionText.trim() || countdown === 0}
                style={{
                  padding: '12px 40px',
                  background: questionText.trim() && countdown > 0
                    ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                    : '#D1D5DB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: questionText.trim() && countdown > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
              >
                匿名发送
              </button>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
              }}
            >
              <h3 style={{ fontSize: '18px', color: '#1F2937', marginBottom: '16px' }}>
                所有问题 ({course?.questions.length || 0})
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                {course?.questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                    <p>暂无问题，成为第一个提问的人吧！</p>
                  </div>
                ) : (
                  course?.questions.map(q => (
                    <QuestionBubble
                      key={q.id}
                      question={q}
                      showVoteProgress={true}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @media (max-width: 768px) {
          div[style*="width: 150px"] {
            width: 100px !important;
            height: 100px !important;
          }
          div[style*="width: 150px"] svg {
            width: 100px !important;
            height: 100px !important;
          }
          div[style*="width: 150px"] svg circle {
            cx: 50px !important;
            cy: 50px !important;
            r: 42px !important;
          }
          div[style*="font-size: 36px"] {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  )

  const renderVoteView = () => {
    const voteQuestions = getVoteQuestions()

    return (
      <div style={transitionStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗳️</div>
              <h2 style={{ fontSize: '24px', color: '#1F2937', marginBottom: '8px' }}>
                投票环节
              </h2>
              <p style={{ color: '#6B7280' }}>
                请为以下问题投票，表达你的观点
              </p>
            </div>

            {showVoteModal && voteQuestions.length > 0 && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: '20px'
                }}
                onClick={() => setShowVoteModal(false)}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '32px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    animation: 'slideUp 0.4s ease-out'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h3 style={{ fontSize: '20px', color: '#1F2937', marginBottom: '20px', textAlign: 'center' }}>
                    教师选出了 {voteQuestions.length} 个问题
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      overflowX: 'auto',
                      padding: '8px 4px 16px',
                      flexWrap: 'nowrap'
                    }}
                  >
                    {voteQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        style={{
                          flex: '0 0 280px',
                          background: '#FFFFFF',
                          borderRadius: '16px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease',
                          border: `2px solid ${q.color}`
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                          问题 #{index + 1}
                        </div>
                        <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', marginBottom: '16px', minHeight: '60px' }}>
                          {q.content}
                        </div>
                        <QuestionBubble
                          question={q}
                          showVoteButton={true}
                          isTeacher={false}
                          onVote={handleVote}
                          voted={votedQuestions.has(q.id)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowVoteModal(false)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '16px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    完成投票
                  </button>
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '18px', color: '#1F2937', marginBottom: '16px' }}>
                投票问题列表
              </h3>
              {voteQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                  <p>教师还未选择投票问题</p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    padding: '8px 4px 16px'
                  }}
                >
                  {voteQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      style={{
                        flex: '0 0 320px',
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        border: `2px solid ${q.color}`
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
                        问题 #{index + 1}
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', marginBottom: '16px', minHeight: '60px' }}>
                        {q.content}
                      </div>
                      <QuestionBubble
                        question={q}
                        showVoteButton={true}
                        showVoteProgress={true}
                        isTeacher={false}
                        onVote={handleVote}
                        voted={votedQuestions.has(q.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {voteQuestions.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <button
                  onClick={() => setShowVoteModal(true)}
                  style={{
                    padding: '14px 40px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  打开投票面板
                </button>
              </div>
            )}
          </div>
        </div>
        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @media (max-width: 768px) {
            div[style*="display: flex"][style*="gap: 16px"][style*="overflowX"] {
              flex-direction: column !important;
              overflow-x: visible !important;
            }
            div[style*="flex: 0 0"] {
              flex: 1 1 auto !important;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF5' }}>
      {navBar}
      {view === 'enter' && renderEnterView()}
      {view === 'qa' && renderQaView()}
      {view === 'vote' && renderVoteView()}
    </div>
  )
}

export default StudentApp
