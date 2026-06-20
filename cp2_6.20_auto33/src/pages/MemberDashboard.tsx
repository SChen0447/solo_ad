import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { Course, api, User } from '../services/api'

interface MemberDashboardProps {
  user: User
  onLogout: () => void
}

export default function MemberDashboard({ user, onLogout }: MemberDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [error, setError] = useState('')
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set())
  const [justBookedIds, setJustBookedIds] = useState<Set<string>>(new Set())

  const fetchCourses = useCallback(async () => {
    try {
      const data = activeTab === 'all' 
        ? await api.getUpcomingCourses() 
        : await api.getMyBookings()
      setCourses(data)
      setBookedIds(new Set(data.filter(c => c.isBooked).map(c => c.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取课程失败')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    setLoading(true)
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCourses()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchCourses])

  const handleBook = async (courseId: string) => {
    try {
      setError('')
      const updatedCourse = await api.bookCourse(courseId)
      setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c))
      setBookedIds(prev => new Set(prev).add(courseId))
      setJustBookedIds(prev => new Set(prev).add(courseId))
      setTimeout(() => {
        setJustBookedIds(prev => {
          const next = new Set(prev)
          next.delete(courseId)
          return next
        })
      }, 250)
    } catch (err) {
      setError(err instanceof Error ? err.message : '预约失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleCancelBooking = async (courseId: string) => {
    try {
      const updatedCourse = await api.cancelBooking(courseId)
      setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c))
      setBookedIds(prev => {
        const next = new Set(prev)
        next.delete(courseId)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消预约失败')
      setTimeout(() => setError(''), 3000)
    }
  }

  const groupByDate = (courses: Course[]) => {
    const groups: Record<string, Course[]> = {}
    courses.forEach(course => {
      const date = dayjs(course.startTime).format('YYYY-MM-DD')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(course)
    })
    return groups
  }

  const formatDateLabel = (dateStr: string) => {
    const date = dayjs(dateStr)
    const today = dayjs().format('YYYY-MM-DD')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    
    if (dateStr === today) return '今天'
    if (dateStr === tomorrow) return '明天'
    return date.format('MM月DD日 dddd').replace('周', '星期')
  }

  const getCapacityClass = (remaining: number, max: number) => {
    if (remaining === 0) return 'full'
    if (remaining <= 3) return 'few'
    return ''
  }

  const isFull = (course: Course) => course.currentCapacity >= course.maxCapacity

  const groupedCourses = groupByDate(courses)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h2>健身中心</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>全部课程</span>
          </button>
          <button className={`nav-item ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>我的预约</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <img src={user.avatar} alt={user.name} />
            <div className="user-details">
              <div className="name">{user.name}</div>
              <div className="role">会员</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1>{activeTab === 'all' ? '课程预约' : '我的预约'}</h1>
          <p>
            {activeTab === 'all' 
              ? '浏览并预约未来7天的健身课程' 
              : '查看您已预约的所有课程'}
          </p>
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
            <div className="empty-state-icon">📭</div>
            <p>暂无课程数据</p>
          </div>
        ) : (
          Object.entries(groupedCourses).map(([date, dateCourses]) => (
            <div key={date} className="date-section">
              <h2>
                <span className="date-badge">{formatDateLabel(date)}</span>
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                  {dayjs(date).format('YYYY年MM月DD日')} · 共{dateCourses.length}节课
                </span>
              </h2>
              
              <div className="courses-grid">
                {dateCourses.map(course => (
                  <div 
                    key={course.id} 
                    className={`course-card course-card-enter ${course.status === 'cancelled' ? 'cancelled' : ''}`}
                  >
                    {course.status === 'cancelled' && course.cancelReason && (
                      <div className="cancel-reason-bubble">
                        ❌ 课程已取消：{course.cancelReason}
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

                    <div className="coach-info">
                      <img src={course.coachAvatar} alt={course.coachName} className="coach-avatar" />
                      <span className="coach-name">{course.coachName}</span>
                    </div>

                    <div className="capacity-info">
                      <span className="capacity-text">剩余名额</span>
                      <span className={`capacity-remaining ${getCapacityClass(course.maxCapacity - course.currentCapacity, course.maxCapacity)}`}>
                        {isFull(course) ? '已满' : course.maxCapacity - course.currentCapacity}
                      </span>
                    </div>

                    {bookedIds.has(course.id) ? (
                      <div className={`booked-tag ${justBookedIds.has(course.id) ? 'booked-tag-enter' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        已预约
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelBooking(course.id);
                          }}
                          className="cancel-booking-btn"
                        >
                          取消预约
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`btn-book ${isFull(course) || course.status === 'cancelled' ? 'full' : ''}`}
                        disabled={isFull(course) || course.status === 'cancelled'}
                        onClick={() => handleBook(course.id)}
                      >
                        {course.status === 'cancelled' ? '课程已取消' : isFull(course) ? '已满员' : '立即预约'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
