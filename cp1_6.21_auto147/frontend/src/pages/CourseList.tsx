import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { courseApi } from '../services/api'
import type { Course } from '../types'

function CourseList() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const data = await courseApi.getAll()
        setCourses(data)
      } catch (err) {
        setError('加载课程列表失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const handleCardClick = (courseId: number) => {
    navigate(`/course/${courseId}`)
  }

  const getCourseEmoji = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('react') || lowerTitle.includes('前端')) return '⚛️'
    if (lowerTitle.includes('typescript') || lowerTitle.includes('类型')) return '📘'
    if (lowerTitle.includes('node') || lowerTitle.includes('后端')) return '🟢'
    if (lowerTitle.includes('数据') || lowerTitle.includes('数据库')) return '🗄️'
    if (lowerTitle.includes('测试')) return '🧪'
    if (lowerTitle.includes('项目') || lowerTitle.includes('管理')) return '📊'
    return '📚'
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">课程中心</h1>
        <p className="page-subtitle">探索课程，提升技能，开启学习之旅</p>
      </div>

      <div className="course-grid">
        {courses.map(course => (
          <div
            key={course.id}
            className="course-card"
            onClick={() => handleCardClick(course.id)}
          >
            <div className={`course-card-badge ${course.is_completed ? 'badge-completed' : 'badge-pending'}`}>
              {course.is_completed ? '✓' : '⏱'}
            </div>

            <div className="course-thumbnail">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} />
              ) : (
                <span>{getCourseEmoji(course.title)}</span>
              )}
            </div>

            <div className="course-card-body">
              <h3 className="course-card-title">{course.title}</h3>
              <div className="progress-wrapper">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${course.progress || 0}%` }}
                  />
                </div>
                <div className="progress-text">
                  {course.completed_chapters || 0} / {course.total_chapters || 0} 章节 · {course.progress || 0}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="loading">暂无课程</div>
      )}
    </div>
  )
}

export default CourseList
