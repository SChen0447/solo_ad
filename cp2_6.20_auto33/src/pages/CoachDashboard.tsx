import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Course, api, User } from '../services/api'

interface CoachDashboardProps {
  user: User
  onLogout: () => void
}

export default function CoachDashboard({ user, onLogout }: CoachDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState('')

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await api.getCoachSchedule(selectedDate)
      setCourses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日程失败')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    setLoading(true)
    fetchSchedule()
  }, [fetchSchedule])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSchedule()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchSchedule])

  const handleCancelClick = (course: Course) => {
    setSelectedCourse(course)
    setCancelReason(course.cancelReason || '')
    if (course.status === 'cancelled') {
      setCancelReason(course.cancelReason || '')
    }
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedCourse || !cancelReason.trim()) {
      setError('请填写取消原因')
      return
    }

    try {
      const updatedCourse = await api.updateCourseStatus(
        selectedCourse.id,
        'cancelled',
        cancelReason
      )
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? updatedCourse : c))
      setShowCancelModal(false)
      setSelectedCourse(null)
      setCancelReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消课程失败')
    }
  }

  const handleRestoreCourse = async (courseId: string) => {
    try {
      const updatedCourse = await api.updateCourseStatus(courseId, 'normal')
      setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c))
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复课程失败')
    }
  }

  const dateOptions = []
  for (let i = 0; i < 7; i++) {
    const date = dayjs().add(i, 'day')
    dateOptions.push({
      value: date.format('YYYY-MM-DD'),
      label: i === 0 ? '今天' : i === 1 ? '明天' : date.format('MM/DD')
    })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h2>教练中心</h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>我的日程</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <img src={user.avatar} alt={user.name} />
            <div className="user-details">
              <div className="name">{user.name}</div>
              <div className="role">教练</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1>课程日程</h1>
          <p>查看和管理您的课程安排</p>
        </div>

        <div className="tabs" style={{ maxWidth: '400px' }}>
          {dateOptions.map(option => (
            <button
              key={option.value}
              className={`tab-item ${selectedDate === option.value ? 'active' : ''}`}
              onClick={() => setSelectedDate(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message error-shake" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>暂无课程安排</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map(course => (
              <div 
                key={course.id} 
                className={`course-card course-card-enter ${course.status === 'cancelled' ? 'cancelled' : ''}`}
              >
                {course.status === 'cancelled' && course.cancelReason && (
                  <div className="cancel-reason-bubble">
                    ❌ 已取消：{course.cancelReason}
                  </div>
                )}
                
                <div className="course-header">
                  <div>
                    <div className="course-name">{course.name}</div>
                    <div className="course-time">
                      {dayjs(course.startTime).format('HH:mm')} - {dayjs(course.endTime).format('HH:mm')}
                    </div>
                  </div>
                </div>

                <div className="capacity-info">
                  <span className="capacity-text">预约人数</span>
                  <span className="capacity-remaining">
                    {course.currentCapacity} / {course.maxCapacity}
                  </span>
                </div>

                <div className="attendance-list">
                  <h4>出勤名单</h4>
                  {course.members && course.members.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {course.members.map(member => (
                        <div key={member.id} className="attendance-item">
                          <img src={member.avatar} alt={member.name} />
                          <span style={{ fontSize: '14px' }}>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      暂无会员预约
                    </p>
                  )}
                </div>

                {course.status === 'normal' ? (
                  <button
                    className="btn-book"
                    style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
                    onClick={() => handleCancelClick(course)}
                  >
                    取消课程
                  </button>
                ) : (
                  <button
                    className="btn-book"
                    onClick={() => handleRestoreCourse(course.id)}
                  >
                    恢复课程
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>取消课程</h3>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>
                ×
              </button>
            </div>

            {selectedCourse && (
              <>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  确定要取消 <strong>{selectedCourse.name}</strong> 吗？
                </p>

                <div className="form-group">
                  <label htmlFor="cancelReason">取消原因 *</label>
                  <textarea
                    id="cancelReason"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="请输入取消原因"
                    required
                  />
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowCancelModal(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={handleConfirmCancel}
                  >
                    确认取消
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
