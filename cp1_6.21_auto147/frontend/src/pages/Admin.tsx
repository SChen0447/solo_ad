import { useState, useEffect } from 'react'
import { courseApi, quizApi, progressApi } from '../services/api'
import type { Course, Chapter, Quiz, Question, Option } from '../types'

type TabType = 'dashboard' | 'courses' | 'chapters' | 'quizzes'

function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    instructor: '',
    video_url: '',
    thumbnail: ''
  })

  const [newChapter, setNewChapter] = useState({
    title: '',
    duration: '',
    video_start_time: 0
  })

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'single' as 'single' | 'multiple',
    options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      if (activeTab === 'dashboard') {
        const statsData = await progressApi.getAdminStats()
        setStats(statsData)
      }
      if (activeTab === 'courses' || activeTab === 'chapters' || activeTab === 'quizzes') {
        const coursesData = await courseApi.getAll()
        setCourses(coursesData)
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCourseSelect = async (course: Course) => {
    setSelectedCourse(course)
    try {
      const courseDetail = await courseApi.getById(course.id)
      setChapters(courseDetail.chapters)
    } catch (err) {
      console.error('加载章节失败:', err)
    }
  }

  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter)
    if (chapter.quiz_id) {
      try {
        const quizData = await quizApi.getByCourse(selectedCourse!.id, chapter.id)
        setSelectedQuiz(quizData)
      } catch (err) {
        console.error('加载测验失败:', err)
      }
    }
  }

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) {
      alert('请输入课程标题')
      return
    }
    try {
      await courseApi.create(newCourse)
      setNewCourse({ title: '', description: '', instructor: '', video_url: '', thumbnail: '' })
      loadData()
    } catch (err) {
      console.error('创建课程失败:', err)
      alert('创建课程失败')
    }
  }

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('确定删除此课程吗？相关章节和测验也会被删除。')) return
    try {
      await courseApi.delete(id)
      if (selectedCourse?.id === id) {
        setSelectedCourse(null)
      }
      loadData()
    } catch (err) {
      console.error('删除课程失败:', err)
      alert('删除课程失败')
    }
  }

  const handleCreateChapter = async () => {
    if (!selectedCourse || !newChapter.title.trim()) {
      alert('请选择课程并输入章节标题')
      return
    }
    try {
      await courseApi.addChapter(selectedCourse.id, newChapter)
      setNewChapter({ title: '', duration: '', video_start_time: 0 })
      handleCourseSelect(selectedCourse)
    } catch (err) {
      console.error('添加章节失败:', err)
      alert('添加章节失败')
    }
  }

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm('确定删除此章节吗？')) return
    try {
      await courseApi.deleteChapter(chapterId)
      if (selectedCourse) {
        handleCourseSelect(selectedCourse)
      }
    } catch (err) {
      console.error('删除章节失败:', err)
      alert('删除章节失败')
    }
  }

  const handleAddQuestion = async () => {
    if (!selectedQuiz || !newQuestion.question_text.trim()) {
      alert('请输入题目内容')
      return
    }
    const validOptions = newQuestion.options.filter(o => o.text.trim())
    if (validOptions.length < 3) {
      alert('至少需要3个选项')
      return
    }
    const hasCorrect = newQuestion.options.some(o => o.is_correct)
    if (!hasCorrect) {
      alert('至少需要一个正确答案')
      return
    }
    try {
      await quizApi.addQuestion(selectedQuiz.id, newQuestion)
      setNewQuestion({
        question_text: '',
        question_type: 'single',
        options: [
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      })
      if (selectedCourse && selectedChapter) {
        handleChapterSelect(selectedChapter)
      }
    } catch (err) {
      console.error('添加题目失败:', err)
      alert('添加题目失败')
    }
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('确定删除此题目吗？')) return
    try {
      await quizApi.deleteQuestion(questionId)
      if (selectedCourse && selectedChapter) {
        handleChapterSelect(selectedChapter)
      }
    } catch (err) {
      console.error('删除题目失败:', err)
      alert('删除题目失败')
    }
  }

  const handleAddOption = () => {
    setNewQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', is_correct: false }]
    }))
  }

  const handleOptionChange = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    setNewQuestion(prev => {
      const options = [...prev.options]
      if (field === 'text') {
        options[index] = { ...options[index], text: value as string }
      } else {
        if (prev.question_type === 'single') {
          options.forEach((opt, i) => {
            opt.is_correct = i === index ? value as boolean : false
          })
        } else {
          options[index] = { ...options[index], is_correct: value as boolean }
        }
      }
      return { ...prev, options }
    })
  }

  const handleRemoveOption = (index: number) => {
    if (newQuestion.options.length <= 3) return
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const handleCreateQuiz = async () => {
    if (!selectedCourse) {
      alert('请先选择课程')
      return
    }
    try {
      const quiz = await quizApi.create({
        course_id: selectedCourse.id,
        chapter_id: selectedChapter?.id || null,
        title: `${selectedChapter?.title || '课程'}测验`
      })
      if (selectedChapter) {
        await courseApi.updateChapter(selectedChapter.id, { quiz_id: quiz.id })
      }
      if (selectedCourse && selectedChapter) {
        handleChapterSelect(selectedChapter)
      }
    } catch (err) {
      console.error('创建测验失败:', err)
      alert('创建测验失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  const renderDashboard = () => (
    <div>
      <h2 className="admin-title">数据概览</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.overall?.total_courses || 0}</div>
          <div className="stat-label">课程总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.overall?.total_chapters || 0}</div>
          <div className="stat-label">章节总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.overall?.total_questions || 0}</div>
          <div className="stat-label">题目总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.overall?.total_users || 0}</div>
          <div className="stat-label">注册用户</div>
        </div>
      </div>

      <h3 className="admin-title" style={{ marginTop: '24px' }}>课程学习情况</h3>
      <div className="admin-list">
        {stats?.courses?.map((course: any) => (
          <div key={course.course_id} className="admin-list-item">
            <div className="admin-item-info">
              <div className="admin-item-title">{course.course_title}</div>
              <div className="admin-item-meta">
                讲师：{course.instructor} · {course.total_chapters} 个章节 · 平均得分：{course.avg_score ? Math.round(course.avg_score) : '-'} 分
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCourses = () => (
    <div>
      <div className="admin-header">
        <h2 className="admin-title">课程管理</h2>
      </div>

      <div className="admin-form">
        <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>创建新课程</h3>
        <div className="form-group">
          <label className="form-label">课程标题 *</label>
          <input
            type="text"
            className="form-input"
            value={newCourse.title}
            onChange={e => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
            placeholder="请输入课程标题"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">讲师</label>
            <input
              type="text"
              className="form-input"
              value={newCourse.instructor}
              onChange={e => setNewCourse(prev => ({ ...prev, instructor: e.target.value }))}
              placeholder="讲师姓名"
            />
          </div>
          <div className="form-group">
            <label className="form-label">视频链接</label>
            <input
              type="text"
              className="form-input"
              value={newCourse.video_url}
              onChange={e => setNewCourse(prev => ({ ...prev, video_url: e.target.value }))}
              placeholder="iframe嵌入链接"
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">课程简介</label>
          <textarea
            className="form-textarea"
            value={newCourse.description}
            onChange={e => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
            placeholder="请输入课程简介"
          />
        </div>
        <div className="form-group">
          <label className="form-label">封面图链接</label>
          <input
            type="text"
            className="form-input"
            value={newCourse.thumbnail}
            onChange={e => setNewCourse(prev => ({ ...prev, thumbnail: e.target.value }))}
            placeholder="可选"
          />
        </div>
        <button className="btn btn-primary" onClick={handleCreateCourse}>
          创建课程
        </button>
      </div>

      <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>课程列表</h3>
      <div className="admin-list">
        {courses.map(course => (
          <div
            key={course.id}
            className="admin-list-item"
            style={{
              borderColor: selectedCourse?.id === course.id ? 'var(--primary-blue)' : undefined
            }}
            onClick={() => handleCourseSelect(course)}
          >
            <div className="admin-item-info">
              <div className="admin-item-title">{course.title}</div>
              <div className="admin-item-meta">
                讲师：{course.instructor || '未设置'} · {course.total_chapters || 0} 章节
              </div>
            </div>
            <div className="admin-item-actions">
              <button
                className="btn btn-danger btn-sm"
                onClick={e => {
                  e.stopPropagation()
                  handleDeleteCourse(course.id)
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderChapters = () => (
    <div>
      <div className="admin-header">
        <h2 className="admin-title">章节管理</h2>
      </div>

      <div className="admin-form">
        <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>选择课程</h3>
        <div className="form-group">
          <select
            className="form-select"
            value={selectedCourse?.id || ''}
            onChange={e => {
              const course = courses.find(c => c.id === Number(e.target.value))
              if (course) handleCourseSelect(course)
            }}
          >
            <option value="">请选择课程</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedCourse && (
        <>
          <div className="admin-form">
            <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>添加章节</h3>
            <div className="form-group">
              <label className="form-label">章节标题 *</label>
              <input
                type="text"
                className="form-input"
                value={newChapter.title}
                onChange={e => setNewChapter(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入章节标题"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">时长</label>
                <input
                  type="text"
                  className="form-input"
                  value={newChapter.duration}
                  onChange={e => setNewChapter(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="如：15:30"
                />
              </div>
              <div className="form-group">
                <label className="form-label">视频起始时间（秒）</label>
                <input
                  type="number"
                  className="form-input"
                  value={newChapter.video_start_time}
                  onChange={e => setNewChapter(prev => ({ ...prev, video_start_time: Number(e.target.value) }))}
                />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreateChapter}>
              添加章节
            </button>
          </div>

          <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>章节列表</h3>
          <div className="admin-list">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="admin-list-item"
                style={{
                  borderColor: selectedChapter?.id === chapter.id ? 'var(--primary-blue)' : undefined
                }}
                onClick={() => handleChapterSelect(chapter)}
              >
                <div className="admin-item-info">
                  <div className="admin-item-title">
                    第 {index + 1} 章：{chapter.title}
                  </div>
                  <div className="admin-item-meta">
                    时长：{chapter.duration || '未设置'} · 测验：{chapter.quiz_id ? '已关联' : '未关联'}
                  </div>
                </div>
                <div className="admin-item-actions">
                  {!chapter.quiz_id && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedChapter(chapter)
                        handleCreateQuiz()
                      }}
                    >
                      创建测验
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteChapter(chapter.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const renderQuizzes = () => (
    <div>
      <div className="admin-header">
        <h2 className="admin-title">测验管理</h2>
      </div>

      <div className="admin-form">
        <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>选择课程和章节</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">课程</label>
            <select
              className="form-select"
              value={selectedCourse?.id || ''}
              onChange={e => {
                const course = courses.find(c => c.id === Number(e.target.value))
                if (course) {
                  setSelectedCourse(course)
                  setSelectedChapter(null)
                  setSelectedQuiz(null)
                  courseApi.getById(course.id).then(detail => {
                    setChapters(detail.chapters)
                  })
                }
              }}
            >
              <option value="">请选择课程</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">章节</label>
            <select
              className="form-select"
              value={selectedChapter?.id || ''}
              onChange={e => {
                const chapter = chapters.find(c => c.id === Number(e.target.value))
                if (chapter) handleChapterSelect(chapter)
              }}
              disabled={!selectedCourse}
            >
              <option value="">请选择章节</option>
              {chapters.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedQuiz && (
        <>
          <div className="admin-form">
            <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>
              添加题目（{selectedQuiz.title}）
            </h3>
            <div className="form-group">
              <label className="form-label">题目类型</label>
              <select
                className="form-select"
                value={newQuestion.question_type}
                onChange={e => {
                  const type = e.target.value as 'single' | 'multiple'
                  setNewQuestion(prev => ({
                    ...prev,
                    question_type: type,
                    options: prev.options.map((opt, i) => ({
                      ...opt,
                      is_correct: i === 0 ? true : false
                    }))
                  }))
                }}
              >
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">题目内容 *</label>
              <textarea
                className="form-textarea"
                value={newQuestion.question_text}
                onChange={e => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="请输入题目内容"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">选项（至少3个，勾选正确答案）</label>
              {newQuestion.options.map((opt, index) => (
                <div key={index} className="option-editor">
                  <input
                    type="checkbox"
                    checked={opt.is_correct}
                    onChange={e => handleOptionChange(index, 'is_correct', e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => handleOptionChange(index, 'text', e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                  />
                  {newQuestion.options.length > 3 && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveOption(index)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleAddOption}
                style={{ marginTop: '8px' }}
              >
                + 添加选项
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleAddQuestion}>
              添加题目
            </button>
          </div>

          <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600' }}>
            题目列表（共 {selectedQuiz.questions.length} 题）
          </h3>
          <div className="admin-list">
            {selectedQuiz.questions.map((q, idx) => (
              <div key={q.id} className="admin-list-item">
                <div className="admin-item-info">
                  <div className="admin-item-title">
                    第 {idx + 1} 题：{q.question_text}
                  </div>
                  <div className="admin-item-meta">
                    {q.question_type === 'single' ? '单选题' : '多选题'} · {q.options.length} 个选项
                  </div>
                </div>
                <div className="admin-item-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteQuestion(q.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">管理后台</h1>
        <p className="page-subtitle">管理课程、章节和测验内容</p>
      </div>

      <div className="admin-layout">
        <div className="admin-sidebar">
          <div
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 数据概览
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            📚 课程管理
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'chapters' ? 'active' : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            📖 章节管理
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            📝 测验管理
          </div>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'courses' && renderCourses()}
          {activeTab === 'chapters' && renderChapters()}
          {activeTab === 'quizzes' && renderQuizzes()}
        </div>
      </div>
    </div>
  )
}

export default Admin
