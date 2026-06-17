import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../apiClient'
import type { Book, Member, AverageProgress, ReadingProgress } from '../types'
import Modal from './Modal'
import '../styles/BookShelf.css'

interface BookShelfProps {
  shelfId: string
  currentMember: Member | null
}

function BookShelf({ shelfId, currentMember }: BookShelfProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [averageProgress, setAverageProgress] = useState<AverageProgress[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [showAddBookModal, setShowAddBookModal] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const [newBook, setNewBook] = useState({ title: '', author: '', totalPages: '' })
  const [updatePage, setUpdatePage] = useState('')
  const [selectedBookForUpdate, setSelectedBookForUpdate] = useState<Book | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadBooks()
    loadAverageProgress()
  }, [shelfId])

  useEffect(() => {
    if (averageProgress.length > 0 && canvasRef.current) {
      drawProgressChart()
    }
  }, [averageProgress])

  const loadBooks = async () => {
    try {
      const data = await apiClient.getShelfBooks(shelfId)
      setBooks(data)
    } catch (err) {
      console.error('Failed to load books:', err)
    }
  }

  const loadAverageProgress = async () => {
    try {
      const data = await apiClient.getAverageProgress(shelfId)
      setAverageProgress(data)
    } catch (err) {
      console.error('Failed to load average progress:', err)
    }
  }

  const drawProgressChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    if (averageProgress.length === 0) return

    const dates = averageProgress.map((d) => d.date)
    const percentages = averageProgress.map((d) => d.percentage)

    const maxY = 100
    const minY = 0

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      ctx.fillStyle = '#b0b0b0'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${maxY - (maxY - minY) * (i / 5)}%`, padding.left - 10, y + 4)
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.05)')

    ctx.beginPath()
    averageProgress.forEach((d, i) => {
      const x = padding.left + (chartWidth / (averageProgress.length - 1 || 1)) * i
      const y = padding.top + chartHeight - (chartHeight * (d.percentage - minY)) / (maxY - minY)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    const lastX = padding.left + chartWidth
    const firstX = padding.left
    ctx.lineTo(lastX, height - padding.bottom)
    ctx.lineTo(firstX, height - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    averageProgress.forEach((d, i) => {
      const x = padding.left + (chartWidth / (averageProgress.length - 1 || 1)) * i
      const y = padding.top + chartHeight - (chartHeight * (d.percentage - minY)) / (maxY - minY)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    averageProgress.forEach((d, i) => {
      const x = padding.left + (chartWidth / (averageProgress.length - 1 || 1)) * i
      const y = padding.top + chartHeight - (chartHeight * (d.percentage - minY)) / (maxY - minY)

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00d4ff'
      ctx.fill()
    })

    ctx.fillStyle = '#b0b0b0'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    const step = Math.ceil(dates.length / 6)
    dates.forEach((date, i) => {
      if (i % step === 0 || i === dates.length - 1) {
        const x = padding.left + (chartWidth / (dates.length - 1 || 1)) * i
        ctx.fillText(date.slice(5), x, height - padding.bottom + 20)
      }
    })
  }

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

  const getCurrentProgress = (book: Book): number => {
    if (book.progress.length === 0) return 0
    const latest = book.progress[book.progress.length - 1]
    return Math.min(100, (latest.currentPage / book.totalPages) * 100)
  }

  const getLatestProgress = (book: Book): ReadingProgress | null => {
    if (book.progress.length === 0) return null
    return book.progress[book.progress.length - 1]
  }

  const getRecentHistory = (book: Book): ReadingProgress[] => {
    return [...book.progress].reverse().slice(0, 3)
  }

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

  const canUpdateBook = (book: Book): boolean => {
    return currentMember !== null && book.memberId === currentMember.id
  }

  return (
    <div className="bookshelf-container">
      <div className="progress-chart-section card">
        <h2 className="section-title">📈 小组平均进度</h2>
        <div className="chart-container">
          <canvas ref={canvasRef} className="progress-canvas" />
        </div>
      </div>

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
                  <div className="book-avatar">
                    <div
                      className="avatar"
                      style={{ backgroundColor: getAvatarColor(book.memberNickname) }}
                    >
                      {book.memberNickname.charAt(0)}
                    </div>
                    <span className="book-member-name">{book.memberNickname}</span>
                  </div>

                  <div className="book-cover">
                    <div className="book-cover-placeholder">📖</div>
                  </div>

                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>

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

                  <div className="book-history" onClick={(e) => {
                    e.stopPropagation()
                    toggleHistory(book.id)
                  }}>
                    <div className="history-toggle">
                      <span>最近更新</span>
                      <span className="history-arrow">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && (
                      <div className="history-timeline">
                        {recentHistory.length === 0 ? (
                          <p className="history-empty">暂无记录</p>
                        ) : (
                          recentHistory.map((record, idx) => (
                            <div key={record.id} className="history-item">
                              <div className="history-dot" />
                              <div className="history-content">
                                <span className="history-date">{record.date}</span>
                                <span className="history-page">
                                  读到第 {record.currentPage} 页
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

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
    </div>
  )
}

export default BookShelf
