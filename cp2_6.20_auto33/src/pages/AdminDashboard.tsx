import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { Course, api, User, AdminUser } from '../services/api'

interface AdminDashboardProps {
  user: User
  onLogout: () => void
}

interface CourseFormData {
  name: string
  startTime: string
  endTime: string
  coachId: string
  maxCapacity: number
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'users'>('courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [coaches, setCoaches] = useState<{ id: string; name: string; avatar: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    startTime: '',
    endTime: '',
    coachId: '',
    maxCapacity: 15
  })
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)
  const [deletingCourseName, setDeletingCourseName] = useState('')
  
  const [newCourseId, setNewCourseId] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [courseTransforms, setCourseTransforms] = useState<Record<string, { x: number; y: number }>>({})
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const newCourseRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const fetchCourses = useCallback(async () => {
    try {
      const data = await api.getAdminCourses()
      setCourses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取课程失败')
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户失败')
    }
  }, [])

  const fetchCoaches = useCallback(async () => {
    try {
      const data = await api.getCoaches()
      setCoaches(data)
    } catch (err) {
      console.error('获取教练列表失败', err)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      if (activeTab === 'courses') {
        await Promise.all([fetchCourses(), fetchCoaches()])
      } else {
        await fetchUsers()
      }
      setLoading(false)
    }
    loadData()
  }, [activeTab, fetchCourses, fetchUsers, fetchCoaches])

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'courses') {
        fetchCourses()
      } else {
        fetchUsers()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [activeTab, fetchCourses, fetchUsers])

  const handleAddCourse = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
    setEditingCourse(null)
    setFormData({
      name: '',
      startTime: '',
      endTime: '',
      coachId: coaches[0]?.id || '',
      maxCapacity: 15
    })
    setShowCourseModal(true)
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      startTime: dayjs(course.startTime).format('YYYY-MM-DDTHH:mm'),
      endTime: dayjs(course.endTime).format('YYYY-MM-DDTHH:mm'),
      coachId: course.coachId,
      maxCapacity: course.maxCapacity
    })
    setShowCourseModal(true)
  }

  const handleDeleteClick = (courseId: string, courseName: string) => {
    setDeletingCourseId(courseId)
    setDeletingCourseName(courseName)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCourseId) return

    setDeletingIds(prev => new Set(prev).add(deletingCourseId!))
    
    setTimeout(async () => {
      try {
        await api.deleteCourse(deletingCourseId!)
        setCourses(prev => prev.filter(c => c.id !== deletingCourseId))
        setDeletingIds(prev => {
          const next = new Set(prev)
          next.delete(deletingCourseId!)
          return next
        })
        setShowDeleteConfirm(false)
        setDeletingCourseId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败')
        setDeletingIds(prev => {
          const next = new Set(prev)
          next.delete(deletingCourseId!)
          return next
        })
      }
    }, 200)
  }

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.startTime || !formData.endTime || !formData.coachId) {
      setError('请填写所有必填项')
      return
    }

    const submitData = {
      name: formData.name,
      startTime: dayjs(formData.startTime).format('YYYY-MM-DD HH:mm:ss'),
      endTime: dayjs(formData.endTime).format('YYYY-MM-DD HH:mm:ss'),
      coachId: formData.coachId,
      maxCapacity: formData.maxCapacity
    }

    try {
      if (editingCourse) {
        const updated = await api.updateCourse(editingCourse.id, submitData)
        setCourses(prev => prev.map(c => c.id === editingCourse.id ? updated : c))
      } else {
        const newCourse = await api.createCourse(submitData)
        setNewCourseId(newCourse.id)
        
        if (mousePosition && newCourseRef.current) {
          requestAnimationFrame(() => {
            const cardRect = newCourseRef.current?.getBoundingClientRect()
            if (cardRect) {
              const offsetX = mousePosition.x - (cardRect.left + cardRect.width / 2)
              const offsetY = mousePosition.y - (cardRect.top + cardRect.height / 2)
              setCourseTransforms(prev => ({
                ...prev,
                [newCourse.id]: { x: offsetX, y: offsetY }
              }))
              
              requestAnimationFrame(() => {
                setCourseTransforms(prev => ({
                  ...prev,
                  [newCourse.id]: { x: 0, y: 0 }
                }))
              })
            }
          })
        }
        
        setCourses(prev => [...prev, newCourse].sort((a, b) => 
          dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
        ))
        
        setTimeout(() => {
          setNewCourseId(null)
          setCourseTransforms(prev => {
            const next = { ...prev }
            delete next[newCourse.id]
            return next
          })
        }, 500)
      }
      setShowCourseModal(false)
      setMousePosition(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleToggleUser = async (userId: string) => {
    try {
      const updated = await api.toggleUserStatus(userId)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      member: '会员',
      coach: '教练',
      admin: '管理员'
    }
    return labels[role] || role
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

  const groupedCourses = groupByDate(courses)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h2>管理后台</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} 
            onClick={() => setActiveTab('courses')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>课程管理</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} 
            onClick={() => setActiveTab('users')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>用户管理</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <img src={user.avatar} alt={user.name} />
            <div className="user-details">
              <div className="name">{user.name}</div>
              <div className="role">管理员</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="admin-header">
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>
              {activeTab === 'courses' ? '课程管理' : '用户管理'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {activeTab === 'courses' ? '管理所有课程安排' : '管理系统用户账户'}
            </p>
          </div>
          {activeTab === 'courses' && (
            <div className="admin-actions">
              <button className="btn-primary" onClick={handleAddCourse}>
                + 新增课程
              </button>
            </div>
          )}
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
        ) : activeTab === 'courses' ? (
          courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <p>暂无课程，点击上方按钮添加</p>
            </div>
          ) : (
            Object.entries(groupedCourses).map(([date, dateCourses]) => (
              <div key={date} className="date-section">
                <h2>
                  <span className="date-badge">{dayjs(date).format('MM月DD日')}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                    共{dateCourses.length}节课
                  </span>
                </h2>
                
                <div className="courses-grid">
                  {dateCourses.map(course => {
                    const transform = courseTransforms[course.id]
                    const isNew = newCourseId === course.id
                    const isDeleting = deletingIds.has(course.id)
                    
                    const cardStyle: React.CSSProperties = {}
                    if (transform && isNew) {
                      cardStyle.transform = `translate(${transform.x}px, ${transform.y}px) scale(0.8)`
                      cardStyle.opacity = 0
                      cardStyle.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }
                    if (isDeleting) {
                      cardStyle.animation = 'cardExit 0.2s ease forwards'
                    }
                    
                    return (
                    <div
                      key={course.id}
                      ref={isNew ? newCourseRef : null}
                      style={cardStyle}
                      className={`course-card ${course.status === 'cancelled' ? 'cancelled' : ''} ${isNew ? 'course-card-enter' : ''}`}
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

                      <div className="coach-info">
                        <img src={course.coachAvatar} alt={course.coachName} className="coach-avatar" />
                        <span className="coach-name">{course.coachName}</span>
                      </div>

                      <div className="capacity-info">
                        <span className="capacity-text">名额</span>
                        <span className="capacity-remaining">
                          {course.currentCapacity} / {course.maxCapacity}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          className="btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => handleEditCourse(course)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-danger"
                          style={{ flex: 1 }}
                          onClick={() => handleDeleteClick(course.id, course.name)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          <div className="users-table">
            <div className="table-header">
              <span></span>
              <span>用户名</span>
              <span>姓名</span>
              <span>角色</span>
              <span>操作</span>
            </div>
            {users.map(u => (
              <div key={u.id} className="table-row">
                <img src={u.avatar} alt={u.name} className="table-avatar" />
                <div>
                  <div style={{ fontWeight: 500 }}>{u.username}</div>
                </div>
                <div>{u.name}</div>
                <div>
                  <span className={`badge ${u.role} ${u.disabled ? 'disabled' : ''}`}>
                    {u.disabled ? '已禁用' : getRoleLabel(u.role)}
                  </span>
                </div>
                <div>
                  <button
                    className={`btn-toggle ${u.disabled ? 'enable' : 'disable'}`}
                    onClick={() => handleToggleUser(u.id)}
                    disabled={u.role === 'admin'}
                    style={{ opacity: u.role === 'admin' ? 0.5 : 1 }}
                  >
                    {u.disabled ? '启用' : '禁用'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCourse ? '编辑课程' : '新增课程'}</h3>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitCourse}>
              <div className="form-group">
                <label htmlFor="courseName">课程名称 *</label>
                <input
                  id="courseName"
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入课程名称"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="startTime">开始时间 *</label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">结束时间 *</label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="coachId">授课教练 *</label>
                <select
                  id="coachId"
                  value={formData.coachId}
                  onChange={e => setFormData(prev => ({ ...prev, coachId: e.target.value }))}
                  required
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">请选择教练</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="maxCapacity">最大名额 *</label>
                <input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxCapacity}
                  onChange={e => setFormData(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCourseModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingCourse ? '保存修改' : '创建课程'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                ×
              </button>
            </div>

            <p style={{ marginBottom: '8px' }}>
              确定要删除课程 <strong>{deletingCourseName}</strong> 吗？
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              删除后无法恢复，请谨慎操作。
            </p>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn-danger"
                onClick={handleConfirmDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
