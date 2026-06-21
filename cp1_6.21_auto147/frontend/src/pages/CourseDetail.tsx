import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { courseApi } from '../services/api'
import type { CourseDetail as CourseDetailType } from '../types'

function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return
      try {
        setLoading(true)
        const data = await courseApi.getById(Number(id))
        setCourse(data)
      } catch (err) {
        setError('加载课程详情失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [id])

  const handleChapterClick = (chapterId: number) => {
    if (!id) return
    navigate(`/quiz/${id}/${chapterId}`)
  }

  const getInstructorInitial = (name: string) => {
    return name ? name.charAt(0) : '讲'
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (error || !course) {
    return <div className="error">{error || '课程不存在'}</div>
  }

  return (
    <div>
      <Link to="/" className="back-link">
        ← 返回课程列表
      </Link>

      <div className="page-header">
        <h1 className="page-title">{course.title}</h1>
        <p className="page-subtitle">
          共 {course.total_chapters} 章节 · 已完成 {course.completed_chapters} 章 · 进度 {course.progress}%
        </p>
      </div>

      <div className="course-detail">
        <div className="course-detail-main">
          <div className="video-container">
            <iframe
              src={course.video_url}
              title={course.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="chapter-list">
            <h3 className="chapter-list-title">章节列表</h3>
            {course.chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="chapter-item"
                onClick={() => handleChapterClick(chapter.id)}
              >
                <div className="chapter-status">
                  {chapter.is_completed ? (
                    <span className="chapter-status-check">✓</span>
                  ) : (
                    <span className="chapter-status-dot" />
                  )}
                </div>
                <div className="chapter-info">
                  <div className="chapter-number">第 {index + 1} 章</div>
                  <div className="chapter-title">{chapter.title}</div>
                </div>
                <div className="chapter-duration">{chapter.duration}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="course-sidebar">
          <div className="sidebar-card">
            <h4 className="sidebar-title">课程简介</h4>
            <p className="sidebar-text">{course.description}</p>
          </div>

          <div className="sidebar-card">
            <h4 className="sidebar-title">讲师信息</h4>
            <div className="instructor-info">
              <div className="instructor-avatar">
                {getInstructorInitial(course.instructor)}
              </div>
              <div>
                <div className="instructor-name">{course.instructor}</div>
                <div className="instructor-role">资深讲师</div>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h4 className="sidebar-title">学习进度</h4>
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="progress-text">
                {course.progress}% 完成
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail
