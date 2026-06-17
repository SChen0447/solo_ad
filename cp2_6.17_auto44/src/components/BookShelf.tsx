/**
 * BookShelf 组件 - 书架详情页组件
 * 
 * 调用关系 & 数据流向：
 * 1. 由 App.tsx 传入 props: { shelfId, currentMember }
 *    - shelfId: 当前书架ID，通过 apiClient.getShelfBooks(shelfId) 获取该书架所有书籍
 *    - currentMember: 当前登录成员对象，用于判断是否可更新自己的书籍进度
 * 2. 组件内部通过 apiClient 调用后端接口：
 *    - GET /api/shelves/:shelfId/books → 获取书籍列表
 *    - GET /api/shelves/:shelfId/average-progress → 获取小组平均进度曲线数据
 *    - POST /api/shelves/:shelfId/books → 添加新书籍
 *    - POST /api/books/:bookId/progress → 更新阅读进度
 * 3. 渲染内容：
 *    - 顶部: 小组平均进度曲线图 (canvas绘制，含完整坐标轴/网格/日期标签)
 *    - 中部: 书籍卡片网格（含进度条、成员头像、更新按钮、最近3次更新时间线）
 *    - 模态框: 书籍详情、添加书籍、更新进度
 * 4. 子组件依赖: Modal.tsx (通用模态框组件)
 */

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../apiClient'
import type { Book, Member, AverageProgress, ReadingProgress, BookHistory } from '../types'
import Modal from './Modal'
import '../styles/BookShelf.css'

interface BookShelfProps {
  shelfId: string
  currentMember: Member | null
}

function BookShelf({ shelfId, currentMember }: BookShelfProps) {
  // 书籍列表状态
  const [books, setBooks] = useState<Book[]>([])
  // 小组平均进度数据（用于绘制曲线图）
  const [averageProgress, setAverageProgress] = useState<AverageProgress[]>([])
  // 当前选中的书籍（用于详情模态框）
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  // 添加书籍模态框显示状态
  const [showAddBookModal, setShowAddBookModal] = useState(false)
  // 已展开历史记录的书籍ID集合
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  // 新书籍表单数据
  const [newBook, setNewBook] = useState({ title: '', author: '', totalPages: '' })
  // 更新进度表单数据
  const [updatePage, setUpdatePage] = useState('')
  // 当前选中的需要更新进度的书籍
  const [selectedBookForUpdate, setSelectedBookForUpdate] = useState<Book | null>(null)
  // 完整阅读历史模态框数据（通过 GET /api/books/:id/history 拉取）
  const [bookHistoryModal, setBookHistoryModal] = useState<BookHistory | null>(null)
  // 阅读历史加载中状态
  const [historyLoading, setHistoryLoading] = useState(false)
  // canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 组件挂载或 shelfId 变化时，加载书籍和平均进度数据
  useEffect(() => {
    loadBooks()
    loadAverageProgress()
  }, [shelfId])

  // 平均进度数据更新或窗口变化时，重新绘制曲线图
  useEffect(() => {
    if (averageProgress.length > 0 && canvasRef.current) {
      drawProgressChart()
    }
    // 监听窗口 resize 事件，确保图表响应式
    const handleResize = () => {
      if (averageProgress.length > 0 && canvasRef.current) {
        drawProgressChart()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [averageProgress])

  // 通过 apiClient.getShelfBooks(shelfId) 获取当前书架的所有书籍
  const loadBooks = async () => {
    try {
      const data = await apiClient.getShelfBooks(shelfId)
      setBooks(data)
    } catch (err) {
      console.error('Failed to load books:', err)
    }
  }

  // 通过 apiClient.getAverageProgress(shelfId) 获取小组平均进度数据
  const loadAverageProgress = async () => {
    try {
      const data = await apiClient.getAverageProgress(shelfId)
      setAverageProgress(data)
    } catch (err) {
      console.error('Failed to load average progress:', err)
    }
  }

  // 绘制小组平均进度曲线图：包含坐标轴、网格线、X轴日期标签、Y轴百分比刻度、曲线和填充区域
  const drawProgressChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 处理高清屏 (DPR)
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 30, right: 30, bottom: 50, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    if (averageProgress.length === 0) return

    const dates = averageProgress.map((d) => d.date)
    const maxY = 100
    const minY = 0
    const yTickCount = 5
    const xTickCount = Math.min(6, dates.length)

    // === 绘制 Y 轴网格线 + 刻度 + 百分比标签 ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight / yTickCount) * i
      // 横向网格线
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      // Y 轴刻度短线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'

      // Y 轴百分比文字
      ctx.fillStyle = '#8b949e'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const value = maxY - (maxY - minY) * (i / yTickCount)
      ctx.fillText(`${Math.round(value)}%`, padding.left - 10, y)
    }

    // === 绘制 X 轴网格线 + 刻度 + 日期标签 ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    for (let i = 0; i < xTickCount; i++) {
      const index = Math.round(i * (dates.length - 1) / (xTickCount - 1 || 1))
      const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * index

      // 纵向网格线
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()

      // X 轴刻度短线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.moveTo(x, height - padding.bottom)
      ctx.lineTo(x, height - padding.bottom + 5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'

      // X 轴日期文字
      ctx.fillStyle = '#8b949e'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(dates[index].slice(5), x, height - padding.bottom + 10)
    }

    // === 绘制 X 轴和 Y 轴主轴线 ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 1.5
    // X 轴
    ctx.beginPath()
    ctx.moveTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()
    // Y 轴
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.stroke()

    // === 计算数据点坐标 ===
    const points = averageProgress.map((d, i) => ({
      x: padding.left + (chartWidth / (averageProgress.length - 1 || 1)) * i,
      y: padding.top + chartHeight - (chartHeight * (d.percentage - minY)) / (maxY - minY),
      percentage: d.percentage,
      date: d.date,
    }))

    // === 绘制曲线填充区域（渐变透明） ===
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.35)')
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.02)')

    ctx.beginPath()
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y)
      } else {
        // 使用二次贝塞尔曲线让折线更平滑
        const prev = points[i - 1]
        const cpx = (prev.x + p.x) / 2
        ctx.quadraticCurveTo(cpx, prev.y, cpx, (prev.y + p.y) / 2)
        ctx.quadraticCurveTo(cpx, (prev.y + p.y) / 2, p.x, p.y)
      }
    })
    // 连接到 X 轴并闭合
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom)
    ctx.lineTo(points[0].x, height - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // === 绘制平滑曲线 ===
    ctx.beginPath()
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y)
      } else {
        const prev = points[i - 1]
        const cpx = (prev.x + p.x) / 2
        ctx.quadraticCurveTo(cpx, prev.y, cpx, (prev.y + p.y) / 2)
        ctx.quadraticCurveTo(cpx, (prev.y + p.y) / 2, p.x, p.y)
      }
    })
    ctx.stroke()

    // === 绘制数据点圆点 + 悬停提示 ===
    points.forEach((p) => {
      // 外圈光晕
      ctx.beginPath()
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 212, 255, 0.2)'
      ctx.fill()

      // 实心圆
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00d4ff'
      ctx.fill()

      // 白色内点
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    })

    // === 坐标轴标签 ===
    ctx.fillStyle = '#6e7681'
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    // X 轴标签
    ctx.fillText('日期', width / 2, height - 5)
    // Y 轴标签（旋转）
    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('平均进度(%)', 0, 0)
    ctx.restore()
  }

  // 添加书籍：调用 apiClient.addBook()
  const handleAddBook = async () => {
    if (!currentMember) {
      alert('请先加入书架')
      return
    }
    try {
      await apiClient.addBook(shelfId, {
        title: newBook.title,
        author: newBook.author,
        totalPages: parseInt(newBook.totalPages),
        memberId: currentMember.id,
      })
      setShowAddBookModal(false)
      setNewBook({ title: '', author: '', totalPages: '' })
      loadBooks()
      loadAverageProgress()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // 更新阅读进度：调用 apiClient.updateProgress()
  const handleUpdateProgress = async () => {
    if (!selectedBookForUpdate || !currentMember) return
    try {
      await apiClient.updateProgress(selectedBookForUpdate.id, {
        currentPage: parseInt(updatePage),
        memberId: currentMember.id,
      })
      setSelectedBookForUpdate(null)
      setUpdatePage('')
      loadBooks()
      loadAverageProgress()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // 切换书籍卡片底部的历史记录展开/收起状态（最近3次更新时间线）
  const toggleHistory = (bookId: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        next.add(bookId)
      }
      return next
    })
  }

  // 计算书籍的当前阅读百分比
  const getCurrentProgress = (book: Book): number => {
    if (book.progress.length === 0) return 0
    const latest = book.progress[book.progress.length - 1]
    return Math.min(100, (latest.currentPage / book.totalPages) * 100)
  }

  // 获取书籍最新的进度记录
  const getLatestProgress = (book: Book): ReadingProgress | null => {
    if (book.progress.length === 0) return null
    return book.progress[book.progress.length - 1]
  }

  // 获取最近3次进度更新记录（用于时间线展示）
  const getRecentHistory = (book: Book): ReadingProgress[] => {
    return [...book.progress].reverse().slice(0, 3)
  }

  // 计算进度变化量（相比上一次）
  const getProgressDelta = (book: Book, record: ReadingProgress): number | null => {
    const idx = book.progress.findIndex((p) => p.id === record.id)
    if (idx <= 0) return null
    const prev = book.progress[idx - 1]
    return record.currentPage - prev.currentPage
  }

  // 根据成员昵称生成随机头像背景色
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#6a11cb', '#2575fc', '#ff6b6b', '#51cf66',
      '#f59f00', '#845ef7', '#22b8cf', '#f06595'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // 判断当前成员是否可以更新某本书（只有书籍的拥有者可以更新）
  const canUpdateBook = (book: Book): boolean => {
    return currentMember !== null && book.memberId === currentMember.id
  }

  // 点击"📜 阅读历史"按钮：从后端拉取完整阅读历史并打开时间线模态框
  // 调用: apiClient.getBookHistory(bookId) → GET /api/books/:bookId/history
  const handleViewHistory = async (bookId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setHistoryLoading(true)
    try {
      const data = await apiClient.getBookHistory(bookId)
      setBookHistoryModal(data)
    } catch (err) {
      console.error('Failed to load book history:', err)
      alert('加载阅读历史失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="bookshelf-container">
      {/* 小组平均进度曲线图区域 */}
      <div className="progress-chart-section card">
        <h2 className="section-title">📈 小组平均进度</h2>
        <div className="chart-container">
          <canvas ref={canvasRef} className="progress-canvas" />
        </div>
      </div>

      {/* 书籍列表区域 */}
      <div className="books-section">
        <div className="section-header">
          <h2 className="section-title">📚 书架书籍</h2>
          <button className="btn-primary" onClick={() => setShowAddBookModal(true)}>
            + 添加书籍
          </button>
        </div>

        {books.length === 0 ? (
          <div className="empty-books card">
            <p>还没有添加书籍，点击上方按钮添加一本吧</p>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => {
              const progress = getCurrentProgress(book)
              const latest = getLatestProgress(book)
              const isExpanded = expandedHistory.has(book.id)
              const recentHistory = getRecentHistory(book)

              return (
                <div
                  key={book.id}
                  className="book-card card"
                  onClick={() => setSelectedBook(book)}
                >
                  {/* 成员昵称和头像 */}
                  <div className="book-avatar">
                    <div
                      className="avatar"
                      style={{ backgroundColor: getAvatarColor(book.memberNickname) }}
                    >
                      {book.memberNickname.charAt(0)}
                    </div>
                    <span className="book-member-name">{book.memberNickname}</span>
                  </div>

                  {/* 书籍封面占位图 */}
                  <div className="book-cover">
                    <div className="book-cover-placeholder">📖</div>
                  </div>

                  {/* 书名和作者 */}
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>

                  {/* 阅读进度条和百分比 */}
                  <div className="book-progress">
                    <div className="progress-percentage">已经读了{progress.toFixed(1)}%</div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="progress-detail">
                      {latest ? `${latest.currentPage} / ${book.totalPages} 页` : `共 ${book.totalPages} 页`}
                    </div>
                  </div>

                  {/* === 最近3次更新时间线（可展开/收起） === */}
                  <div className="book-history">
                    {/* 展开/收起按钮 */}
                    <button
                      className="history-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleHistory(book.id)
                      }}
                    >
                      <span className="history-icon">🕐</span>
                      <span>最近更新 ({recentHistory.length})</span>
                      <span className={`history-chevron ${isExpanded ? 'up' : ''}`}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>
                    {/* 展开后显示的时间线 */}
                    {isExpanded && (
                      <div
                        className="history-timeline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {recentHistory.length === 0 ? (
                          <p className="history-empty">暂无更新记录</p>
                        ) : (
                          recentHistory.map((record, idx) => {
                            const delta = getProgressDelta(book, record)
                            return (
                              <div key={record.id} className="history-item">
                                <div className="timeline-line-wrapper">
                                  <div className="history-dot" />
                                  {idx < recentHistory.length - 1 && <div className="history-connector" />}
                                </div>
                                <div className="history-content">
                                  <div className="history-date-row">
                                    <span className="history-date">{record.date}</span>
                                    {delta !== null && delta > 0 && (
                                      <span className="history-delta positive">+{delta} 页</span>
                                    )}
                                    {delta !== null && delta < 0 && (
                                      <span className="history-delta negative">{delta} 页</span>
                                    )}
                                  </div>
                                  <span className="history-page">
                                    当前进度：第 {record.currentPage} 页
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* 📜 独立阅读历史按钮（所有成员可见） */}
                  <button
                    className="btn-secondary view-history-btn"
                    onClick={(e) => handleViewHistory(book.id, e)}
                    title="查看完整阅读历史时间线"
                  >
                    📜 阅读历史
                  </button>

                  {/* 更新进度按钮（仅书籍拥有者可见） */}
                  {canUpdateBook(book) && (
                    <button
                      className="btn-secondary update-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBookForUpdate(book)
                        setUpdatePage(latest?.currentPage.toString() || '0')
                      }}
                    >
                      更新进度
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 书籍详情模态框 */}
      <Modal isOpen={!!selectedBook} onClose={() => setSelectedBook(null)} title="书籍详情">
        {selectedBook && (
          <div className="book-detail">
            <div className="book-detail-header">
              <div className="book-cover-large">📖</div>
              <div className="book-detail-info">
                <h3>{selectedBook.title}</h3>
                <p>作者：{selectedBook.author}</p>
                <p>总页数：{selectedBook.totalPages} 页</p>
                <p>读者：{selectedBook.memberNickname}</p>
              </div>
            </div>
            <div className="book-detail-progress">
              <div className="progress-percentage">
                已经读了{getCurrentProgress(selectedBook).toFixed(1)}%
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getCurrentProgress(selectedBook)}%` }}
                />
              </div>
            </div>
            <div className="book-detail-history">
              <h4>阅读历史</h4>
              {selectedBook.progress.length === 0 ? (
                <p className="history-empty">暂无阅读记录</p>
              ) : (
                <div className="history-list">
                  {[...selectedBook.progress].reverse().map((record) => (
                    <div key={record.id} className="history-row">
                      <span>{record.date}</span>
                      <span>第 {record.currentPage} 页</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 添加书籍模态框 */}
      <Modal isOpen={showAddBookModal} onClose={() => setShowAddBookModal(false)} title="添加书籍">
        <div className="form-group">
          <label>书名</label>
          <input
            type="text"
            value={newBook.title}
            onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
            placeholder="请输入书名"
          />
        </div>
        <div className="form-group">
          <label>作者</label>
          <input
            type="text"
            value={newBook.author}
            onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
            placeholder="请输入作者"
          />
        </div>
        <div className="form-group">
          <label>总页数</label>
          <input
            type="number"
            value={newBook.totalPages}
            onChange={(e) => setNewBook({ ...newBook, totalPages: e.target.value })}
            placeholder="请输入总页数"
          />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowAddBookModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleAddBook}>添加</button>
        </div>
      </Modal>

      {/* 更新进度模态框 */}
      <Modal
        isOpen={!!selectedBookForUpdate}
        onClose={() => setSelectedBookForUpdate(null)}
        title="更新阅读进度"
      >
        {selectedBookForUpdate && (
          <>
            <p className="update-book-info">
              正在更新：<strong>{selectedBookForUpdate.title}</strong>
            </p>
            <div className="form-group">
              <label>当前页数</label>
              <input
                type="number"
                value={updatePage}
                onChange={(e) => setUpdatePage(e.target.value)}
                placeholder={`0 - ${selectedBookForUpdate.totalPages}`}
                min={0}
                max={selectedBookForUpdate.totalPages}
              />
            </div>
            <p className="update-progress-hint">
              共 {selectedBookForUpdate.totalPages} 页
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedBookForUpdate(null)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleUpdateProgress}>
                更新
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* === 完整阅读历史时间线模态框（通过 GET /api/books/:bookId/history 获取） === */}
      <Modal
        isOpen={!!bookHistoryModal}
        onClose={() => setBookHistoryModal(null)}
        title={bookHistoryModal ? `📜 ${bookHistoryModal.book.title} - 阅读历史` : '阅读历史'}
      >
        {historyLoading && <p className="history-empty">加载中...</p>}

        {!historyLoading && bookHistoryModal && (
          <div className="full-history-modal">
            <div className="full-history-book-info">
              <p>作者：<strong>{bookHistoryModal.book.author}</strong></p>
              <p>读者：<strong>{bookHistoryModal.book.memberNickname}</strong></p>
              <p>总页数：<strong>{bookHistoryModal.book.totalPages} 页</strong></p>
              <p>更新次数：<strong>{bookHistoryModal.history.length} 次</strong></p>
            </div>

            {bookHistoryModal.history.length === 0 ? (
              <p className="history-empty">暂无阅读记录</p>
            ) : (
              <div className="full-history-timeline">
                {bookHistoryModal.history.map((record, idx) => (
                  <div key={record.id} className="full-history-item">
                    <div className="timeline-line-wrapper">
                      <div className="history-dot" />
                      {idx < bookHistoryModal.history.length - 1 && (
                        <div className="history-connector" />
                      )}
                    </div>
                    <div className="full-history-content">
                      <div className="history-date-row">
                        <span className="history-date">{record.date}</span>
                        {record.deltaPages !== null && record.deltaPages > 0 && (
                          <span className="history-delta positive">+{record.deltaPages} 页</span>
                        )}
                        {record.deltaPages !== null && record.deltaPages < 0 && (
                          <span className="history-delta negative">{record.deltaPages} 页</span>
                        )}
                        {record.deltaPages === null && (
                          <span className="history-delta">起点</span>
                        )}
                      </div>
                      <div className="full-history-page">
                        当前进度：第 {record.currentPage} / {bookHistoryModal.book.totalPages} 页
                      </div>
                      <div className="progress-bar full-history-progress">
                        <div
                          className="progress-fill"
                          style={{ width: `${record.percentage}%` }}
                        />
                      </div>
                      <div className="full-history-percentage">
                        {record.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BookShelf
