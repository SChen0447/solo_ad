import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
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

type View = 'create' | 'qa' | 'results'

const TeacherApp: React.FC = () => {
  const [view, setView] = useState<View>('create')
  const [courseName, setCourseName] = useState('')
  const [course, setCourse] = useState<CourseState | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [pageTransition, setPageTransition] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const countdownRef = useRef<number | null>(null)

  useEffect(() => {
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

  const createCourse = async () => {
    try {
      const res = await axios.post('/api/courses', { name: courseName || '未命名课程' })
      setCourse(res.data)
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/student?code=' + res.data.code)}`)
      initSocket(res.data.code)
      changeView('qa')
    } catch (err) {
      console.error('创建课程失败:', err)
    }
  }

  const initSocket = (code: string) => {
    socketRef.current = io({ transports: ['websocket', 'polling'] })
    const socket = socketRef.current

    socket.on('connect', () => {
      socket.emit('join_course', { code })
    })

    socket.on('course_state', (state: CourseState) => {
      setCourse(state)
      if (state.status === 'vote_active' && view !== 'results') {
        loadResults(code)
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
      startCountdown(state.remaining_time)
    })

    socket.on('qa_ended', (state: CourseState) => {
      setCourse(state)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      setCountdown(0)
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

  const startQaSession = async () => {
    if (!course) return
    try {
      const res = await axios.post(`/api/courses/${course.code}/start-qa`)
      setCourse(res.data)
      startCountdown(res.data.remaining_time)
    } catch (err) {
      console.error('启动问答失败:', err)
    }
  }

  const endQaSession = async () => {
    if (!course) return
    try {
      const res = await axios.post(`/api/courses/${course.code}/end-qa`)
      setCourse(res.data)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      setCountdown(0)
      loadResults(course.code)
    } catch (err) {
      console.error('结束问答失败:', err)
    }
  }

  const loadResults = async (code: string) => {
    try {
      const res = await axios.get(`/api/courses/${code}/results`)
      setResults(res.data)
      changeView('results')
    } catch (err) {
      console.error('加载结果失败:', err)
    }
  }

  const handleStar = async (questionId: string, starred: boolean) => {
    if (!course) return
    try {
      await axios.post(`/api/courses/${course.code}/questions/${questionId}/star`, { starred })
    } catch (err) {
      console.error('标记失败:', err)
    }
  }

  const handleMarkForVote = async (questionId: string, forVote: boolean) => {
    if (!course) return
    try {
      await axios.post(`/api/courses/${course.code}/questions/${questionId}/vote-mark`, { for_vote: forVote })
    } catch (err) {
      console.error('标记投票失败:', err)
    }
  }

  const exportResults = () => {
    if (!course) return
    window.open(`/api/courses/${course.code}/export`, '_blank')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getMedalIcon = (index: number) => {
    const medals = ['🥇', '🥈', '🥉']
    return medals[index] || ''
  }

  const getChartData = () => {
    if (!results) return []
    return results.vote_questions.map((q: any) => ({
      name: q.content.length > 15 ? q.content.substring(0, 15) + '...' : q.content,
      赞同: q.votes_agree,
      反对: q.votes_disagree
    }))
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
        课堂问答互动平台 · 教师端
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

  const renderCreateView = () => (
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
          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#1F2937', textAlign: 'center' }}>
            创建新课程
          </h1>
          <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '32px' }}>
            开启互动问答，让每位学生都能参与
          </p>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontSize: '14px' }}>
              课程名称
            </label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="请输入课程名称..."
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#6366F1'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
              }}
            />
          </div>
          <button
            onClick={createCourse}
            style={{
              width: '100%',
              padding: '16px',
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
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            创建课程
          </button>
        </div>
      </div>
    </div>
  )

  const renderQaView = () => (
    <div style={transitionStyle}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
        {course && course.status === 'waiting' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
              textAlign: 'center'
            }}
          >
            <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#1F2937' }}>
              分享课程给学生
            </h2>
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  letterSpacing: '8px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '16px'
                }}
              >
                {course.code}
              </div>
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="课程二维码"
                  style={{ width: '150px', height: '150px', borderRadius: '12px' }}
                />
              )}
              <p style={{ color: '#6B7280', marginTop: '12px', fontSize: '14px' }}>
                学生访问 <span style={{ color: '#6366F1' }}>/student</span> 输入课程码即可加入
              </p>
            </div>
            <button
              onClick={startQaSession}
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
              开启匿名提问 (5分钟)
            </button>
          </div>
        )}

        {course && course.status === 'qa_active' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: '#1F2937', margin: 0 }}>
                  实时提问墙
                </h2>
                <p style={{ color: '#6B7280', fontSize: '14px', margin: '4px 0 0 0' }}>
                  已收到 {course.questions.length} 个问题
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: countdown <= 10 ? '#EF4444' : '#6366F1',
                    animation: countdown <= 10 ? 'pulse 1s ease-in-out infinite' : 'none'
                  }}
                >
                  {formatTime(countdown)}
                </div>
                <button
                  onClick={endQaSession}
                  style={{
                    padding: '10px 20px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  结束提问
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: '500px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}
            >
              {course.questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <p>等待学生提问...</p>
                </div>
              ) : (
                course.questions.map(q => (
                  <QuestionBubble
                    key={q.id}
                    question={q}
                    showStarButton={true}
                    showVoteButton={true}
                    isTeacher={true}
                    onStar={handleStar}
                    onMarkForVote={handleMarkForVote}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {course && course.status === 'vote_active' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ fontSize: '24px', color: '#1F2937', marginBottom: '8px' }}>
              学生正在投票
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              已选择 {course.vote_questions.length} 个问题供全班投票
            </p>
            <button
              onClick={() => loadResults(course.code)}
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
              查看结果看板
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )

  const renderResultsView = () => (
    <div style={transitionStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1F2937', margin: 0 }}>
              投票结果看板
            </h1>
            {results && (
              <p style={{ color: '#6B7280', marginTop: '4px' }}>
                {results.course_name} · {results.vote_questions.length} 个问题参与投票
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => changeView('qa')}
              style={{
                padding: '12px 24px',
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              返回课程
            </button>
            <button
              onClick={exportResults}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              导出 JSON
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <h3 style={{ fontSize: '18px', color: '#1F2937', marginBottom: '20px' }}>
              问题排行 (按票数排序)
            </h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
              {results?.all_questions.map((q: any, index: number) => (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    background: q.is_starred
                      ? 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)'
                      : '#F9FAFB',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${q.color}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '24px', width: '32px', textAlign: 'center' }}>
                    {index < 3 ? getMedalIcon(index) : <span style={{ color: '#9CA3AF', fontSize: '18px' }}>#{index + 1}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' }}>
                      {q.content}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                      <span style={{ color: '#10B981' }}>👍 {q.votes_agree}</span>
                      <span style={{ color: '#EF4444' }}>👎 {q.votes_disagree}</span>
                      {q.is_starred && <span style={{ color: '#F59E0B' }}>★ 精选</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}
          >
            <h3 style={{ fontSize: '18px', color: '#1F2937', marginBottom: '20px' }}>
              投票分布图表
            </h3>
            {results && results.vote_questions.length > 0 ? (
              <div style={{ height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="赞同"
                      fill="url(#colorAgree)"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="反对"
                      fill="url(#colorDisagree)"
                      radius={[4, 0, 0, 4]}
                    />
                    <defs>
                      <linearGradient id="colorAgree" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                      </linearGradient>
                      <linearGradient id="colorDisagree" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#F87171" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📈</div>
                <p>暂无投票数据</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF5' }}>
      {navBar}
      {view === 'create' && renderCreateView()}
      {view === 'qa' && renderQaView()}
      {view === 'results' && renderResultsView()}
    </div>
  )
}

export default TeacherApp
