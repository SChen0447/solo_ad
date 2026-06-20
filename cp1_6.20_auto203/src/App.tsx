import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BookCard from './components/BookCard'
import Dashboard from './components/Dashboard'
import {
  api,
  Book,
  BookDetail,
  Recommendation,
  CategoriesResponse,
  getCategoryColor,
  formatDate,
  formatShortDate,
  NAV_ITEMS,
  CATEGORY_COLORS
} from './api'

const CATEGORY_KEYS = Object.keys(CATEGORY_COLORS)

const App: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const getPageKey = (): string => {
    const path = location.pathname.replace('/', '')
    return path || 'dashboard'
  }

  const [activePage, setActivePage] = useState<string>(getPageKey())
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [subtagFilter, setSubtagFilter] = useState('')
  const [categories, setCategories] = useState<CategoriesResponse['categories']>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [detailBook, setDetailBook] = useState<BookDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '', author: '', isbn: '', year: new Date().getFullYear(), description: '', category: '', subtag: ''
  })

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recLoading, setRecLoading] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    const key = getPageKey()
    setActivePage(key)
    loadCategories()
  }, [location.pathname])

  useEffect(() => {
    loadBooks()
  }, [location.pathname, search, subtagFilter])

  const loadCategories = async () => {
    try {
      const res = await api.getCategories()
      setCategories(res.data.categories)
    } catch (e) {
      console.error(e)
    }
  }

  const loadBooks = async () => {
    const key = getPageKey()
    const params: { category?: string; subtag?: string; search?: string } = {}
    if (CATEGORY_KEYS.includes(key)) {
      params.category = key
    }
    if (key === 'books') {
    }
    if (search) params.search = search
    if (subtagFilter) params.subtag = subtagFilter

    if (key === 'dashboard' || key === 'recommend') return

    try {
      setLoading(true)
      const res = await api.getBooks(params)
      setBooks(res.data.books)
    } catch (e) {
      showToast('加载图书列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleNavClick = (key: string) => {
    setSubtagFilter('')
    setSearch('')
    setSelectedTags([])
    setRecommendations([])
    navigate(key === 'dashboard' ? '/' : `/${key}`)
  }

  const handleBookClick = async (book: Book) => {
    try {
      const res = await api.getBook(book.id)
      setDetailBook(res.data)
      setShowDetail(true)
    } catch (e) {
      showToast('加载图书详情失败', 'error')
    }
  }

  const openCreateForm = () => {
    setEditingBook(null)
    setFormData({
      title: '', author: '', isbn: '', year: new Date().getFullYear(), description: '', category: '', subtag: ''
    })
    setShowForm(true)
  }

  const openEditForm = (book: Book) => {
    setEditingBook(book)
    setFormData({ ...book })
    setShowForm(true)
    setShowDetail(false)
  }

  const handleDeleteBook = async (book: Book) => {
    if (!confirm(`确定要删除《${book.title}》吗？`)) return
    try {
      await api.deleteBook(book.id)
      showToast('删除成功')
      setShowDetail(false)
      loadBooks()
    } catch (e) {
      showToast('删除失败', 'error')
    }
  }

  const handleSubmitForm = async () => {
    if (!formData.title || !formData.author) {
      showToast('请填写书名和作者', 'error')
      return
    }
    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, formData)
        showToast('更新成功')
      } else {
        await api.createBook(formData)
        showToast('添加成功')
      }
      setShowForm(false)
      loadBooks()
    } catch (e) {
      showToast(editingBook ? '更新失败' : '添加失败', 'error')
    }
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag)
      }
      if (prev.length >= 3) {
        showToast('最多选择3个标签', 'error')
        return prev
      }
      return [...prev, tag]
    })
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  const handleGenerateRec = async () => {
    if (selectedTags.length === 0) {
      showToast('请至少选择一个标签', 'error')
      return
    }
    try {
      setRecLoading(true)
      const res = await api.getRecommendations(selectedTags)
      setRecommendations(res.data.recommendations)
      if (res.data.recommendations.length === 0) {
        showToast('暂无匹配图书，试试其他标签')
      }
    } catch (e) {
      showToast('生成推荐失败', 'error')
    } finally {
      setRecLoading(false)
    }
  }

  const handleAddRecord = async (type: '借阅' | '购买' = '借阅') => {
    if (!detailBook) return
    try {
      await api.addRecord(detailBook.book.id, type, true)
      showToast(`添加${type}记录成功`)
      const res = await api.getBook(detailBook.book.id)
      setDetailBook(res.data)
    } catch (e) {
      showToast('添加记录失败', 'error')
    }
  }

  const getTagColor = (tag: string): string => {
    for (const cat of CATEGORY_KEYS) {
      if (tag === cat) return CATEGORY_COLORS[cat]
      const cfg = categories[cat]
      if (cfg && cfg.subtags.includes(tag)) return cfg.color
    }
    return '#888'
  }

  const renderNavItem = (item: typeof NAV_ITEMS[0]) => {
    const isActive = activePage === item.key
    return (
      <div
        key={item.key}
        className={`nav-item ${isActive ? 'active' : ''}`}
        style={{ '--active-color': item.color } as React.CSSProperties}
        onClick={() => handleNavClick(item.key)}
      >
        <span className="icon">{item.icon}</span>
        <span>{item.label}</span>
      </div>
    )
  }

  const renderBookList = () => {
    const pageKey = getPageKey()
    let title = '全部图书'
    let desc = '查看和管理所有图书库存'
    if (CATEGORY_KEYS.includes(pageKey)) {
      title = pageKey
      desc = `${pageKey}分类下的所有图书`
    }

    const currentCategory = CATEGORY_KEYS.includes(pageKey) ? pageKey : ''
    const subtags = currentCategory && categories[currentCategory]
      ? categories[currentCategory].subtags
      : []

    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">{title}</div>
            <div className="page-desc">{desc} · 共 {books.length} 本</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn secondary" onClick={() => loadBooks()}>
              🔄 刷新
            </button>
            <button className="btn" onClick={openCreateForm}>
              ➕ 新增图书
            </button>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-box" style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              className="input"
              placeholder="搜索书名或作者..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
              🔍
            </span>
          </div>
          {subtags.length > 0 && (
            <select
              className="select"
              style={{ width: 180 }}
              value={subtagFilter}
              onChange={e => setSubtagFilter(e.target.value)}
            >
              <option value="">全部子类</option>
              {subtags.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {!currentCategory && (
          <div className="category-tabs">
            <div
              className={`category-tab ${subtagFilter === '' && !CATEGORY_KEYS.includes(pageKey) ? 'active' : ''}`}
              style={subtagFilter === '' && !CATEGORY_KEYS.includes(pageKey) ? { background: '#2C3E50', borderColor: '#2C3E50' } : {}}
              onClick={() => { navigate('/books'); setSubtagFilter('') }}
            >
              全部
            </div>
            {CATEGORY_KEYS.map(cat => (
              <div
                key={cat}
                className={`category-tab ${pageKey === cat ? 'active' : ''}`}
                style={pageKey === cat ? { background: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
                onClick={() => handleNavClick(cat)}
              >
                {cat}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>正在加载图书列表...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>暂无图书，点击右上角「新增图书」开始添加</p>
            <button className="btn" onClick={openCreateForm}>➕ 新增第一本图书</button>
          </div>
        ) : (
          <div className="book-grid">
            {books.map((book, idx) => (
              <BookCard key={book.id} book={book} index={idx} onClick={handleBookClick} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderDashboardPage = () => (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">仪表盘</div>
          <div className="page-desc">查看书店运营概览数据</div>
        </div>
      </div>
      <Dashboard onShowToast={showToast} />
    </div>
  )

  const renderRecommendPage = () => {
    const allTags: { tag: string; color: string }[] = []
    for (const cat of CATEGORY_KEYS) {
      const cfg = categories[cat]
      if (cfg) {
        allTags.push({ tag: cat, color: cfg.color })
        cfg.subtags.forEach(s => allTags.push({ tag: s, color: cfg.color }))
      }
    }

    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">智能推荐书单</div>
            <div className="page-desc">根据读者兴趣标签生成个性化推荐</div>
          </div>
        </div>

        <div className="expand-panel" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
            选择读者兴趣方向 <span style={{ color: '#999', fontWeight: 400 }}>（最多选择3个标签）</span>
          </div>

          {CATEGORY_KEYS.map(cat => {
            const cfg = categories[cat]
            if (!cfg) return null
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 13,
                  color: cfg.color,
                  fontWeight: 600,
                  marginBottom: 8,
                  paddingLeft: 8,
                  borderLeft: `3px solid ${cfg.color}`
                }}>
                  {cat}
                </div>
                <div className="tag-picker" style={{ paddingLeft: 12 }}>
                  {cfg.subtags.map(subtag => {
                    const isSel = selectedTags.includes(subtag)
                    return (
                      <div
                        key={subtag}
                        className={`tag-capsule ${isSel ? 'selected' : ''}`}
                        style={{
                          '--selected-color': cfg.color
                        } as React.CSSProperties}
                        onClick={() => handleTagToggle(subtag)}
                      >
                        {isSel && <span className="remove" onClick={e => { e.stopPropagation(); removeTag(subtag) }}>✕</span>}
                        {subtag}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {selectedTags.length > 0 && (
            <div style={{
              padding: '14px 16px',
              background: '#F8F9FA',
              borderRadius: 8,
              marginTop: 8,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, color: '#666', marginRight: 4 }}>已选标签：</span>
              {selectedTags.map(tag => (
                <div
                  key={tag}
                  className="tag-capsule selected"
                  style={{ '--selected-color': getTagColor(tag) } as React.CSSProperties}
                >
                  <span className="remove" onClick={() => removeTag(tag)}>✕</span>
                  {tag}
                </div>
              ))}
              <button
                className="btn small secondary"
                style={{ marginLeft: 'auto' }}
                onClick={() => setSelectedTags([])}
              >
                清空
              </button>
            </div>
          )}

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              className="btn"
              style={{ padding: '12px 40px', fontSize: 15 }}
              onClick={handleGenerateRec}
              disabled={recLoading}
            >
              {recLoading ? '⏳ 生成中...' : '✨ 生成推荐书单'}
            </button>
          </div>
        </div>

        <div className="recommendation-section">
          {recommendations.length > 0 ? (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  📖 推荐书单 <span style={{ color: '#999', fontWeight: 400, fontSize: 13 }}>（共 {recommendations.length} 本匹配）</span>
                </div>
              </div>
              <div className="recommendation-panel">
                {recommendations.map((rec, idx) => {
                  const color = getCategoryColor(rec.book.category)
                  return (
                    <div key={rec.book.id} className="rec-item" onClick={() => handleBookClick(rec.book)} style={{ cursor: 'pointer' }}>
                      <div
                        className="rec-cover"
                        style={{
                          background: `linear-gradient(135deg, ${color}, ${color}99)`
                        }}
                      >
                        {rec.book.title.charAt(0)}
                      </div>
                      <div className="rec-info">
                        <div className="rec-title">{rec.book.title}</div>
                        <div className="rec-author">
                          {rec.book.author} · {rec.book.category} / {rec.book.subtag}
                        </div>
                        <div className="rec-match-bar">
                          <div
                            className="rec-match-fill"
                            style={{
                              width: `${rec.matchScore}%`,
                              background: `linear-gradient(90deg, ${color}, ${color}CC)`
                            }}
                          />
                        </div>
                        <div className="rec-match-text">匹配度 {rec.matchScore}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            !recLoading && (
              <div className="empty-state" style={{ background: 'white', borderRadius: 8, boxShadow: 'var(--shadow-panel)' }}>
                <div className="empty-icon">✨</div>
                <p>选择标签后点击生成按钮，即可获得个性化推荐</p>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    const key = getPageKey()
    if (key === 'dashboard') return renderDashboardPage()
    if (key === 'recommend') return renderRecommendPage()
    return renderBookList()
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <h1>📚 墨香书阁</h1>
            <div className="subtitle">独立书店管理系统</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group-title">概览</div>
          {NAV_ITEMS.slice(0, 2).map(renderNavItem)}
          <div className="nav-group-title" style={{ marginTop: 8 }}>图书分类</div>
          {NAV_ITEMS.slice(2, 7).map(renderNavItem)}
          <div className="nav-group-title" style={{ marginTop: 8 }}>工具</div>
          {NAV_ITEMS.slice(7).map(renderNavItem)}
        </nav>
        <div className="sidebar-footer">
          💡 提示：<br />
          · 点击卡片查看图书详情<br />
          · 推荐器支持多标签组合<br />
          · Ctrl+F 可快速搜索
        </div>
      </aside>

      <main className="main">
        <div className="main-content">
          {renderContent()}
        </div>
      </main>

      <AnimatePresence>
        {showDetail && detailBook && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowDetail(false) }}
          >
            <div className="modal-content" style={{ maxWidth: 720 }}>
              <div className="modal-header">
                <h2>📖 图书详情</h2>
                <button className="modal-close" onClick={() => setShowDetail(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-header">
                  <div
                    className="detail-cover"
                    style={{ background: `linear-gradient(135deg, ${getCategoryColor(detailBook.book.category)}, ${getCategoryColor(detailBook.book.category)}99)` }}
                  >
                    {detailBook.book.title.charAt(0)}
                  </div>
                  <div className="detail-info">
                    <div className="detail-title">{detailBook.book.title}</div>
                    <div className="detail-meta">
                      <div><strong>作者：</strong>{detailBook.book.author}</div>
                      <div><strong>ISBN：</strong>{detailBook.book.isbn || '-'}</div>
                      <div><strong>出版年份：</strong>{detailBook.book.year}</div>
                      <div><strong>分类：</strong>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 10,
                          background: `${getCategoryColor(detailBook.book.category)}15`,
                          color: getCategoryColor(detailBook.book.category),
                          fontSize: 12,
                          marginRight: 6
                        }}>{detailBook.book.category}</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 10,
                          background: '#F0F0F0',
                          fontSize: 12
                        }}>{detailBook.book.subtag}</span>
                      </div>
                      <div><strong>入库时间：</strong>{formatDate(detailBook.book.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {detailBook.book.description && (
                  <div className="detail-section">
                    <h3>📝 内容简介</h3>
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8 }}>{detailBook.book.description}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h3>
                    📊 借阅记录
                    <span style={{
                      float: 'right',
                      fontSize: 13,
                      fontWeight: 400,
                      color: '#888'
                    }}>
                      共 {detailBook.records.borrowCount} 次
                    </span>
                  </h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button className="btn small" onClick={() => handleAddRecord('借阅')}>
                      📖 新增借阅
                    </button>
                    <button className="btn small secondary" onClick={() => handleAddRecord('购买')}>
                      💰 新增购买
                    </button>
                  </div>

                  <div className="timeline">
                    {detailBook.records.history.length > 0 ? (
                      <div>
                        <div className="timeline-track" />
                        <div className="timeline-nodes">
                          {detailBook.records.history.slice(0, 6).map((h, i) => (
                            <div key={i} className="timeline-node">
                              <div className="timeline-node-info">
                                <div className="timeline-node-date">{formatShortDate(h.date)}</div>
                                <div>{h.type}</div>
                              </div>
                              <div className={`timeline-dot ${h.completed ? 'done' : ''}`} />
                              <div className="timeline-node-info">
                                <div style={{ color: h.completed ? 'var(--color-timeline-done)' : '#999' }}>
                                  {h.completed ? '已完成' : '进行中'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
                        暂无借阅/购买记录
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn danger" onClick={() => handleDeleteBook(detailBook.book)}>
                  🗑️ 删除
                </button>
                <button className="btn secondary" onClick={() => openEditForm(detailBook.book)}>
                  ✏️ 编辑
                </button>
                <button className="btn" onClick={() => setShowDetail(false)}>关闭</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingBook ? '✏️ 编辑图书' : '➕ 新增图书'}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-item">
                    <label className="form-label">书名 *</label>
                    <input
                      className="input"
                      placeholder="请输入书名"
                      value={formData.title || ''}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="form-item">
                    <label className="form-label">作者 *</label>
                    <input
                      className="input"
                      placeholder="请输入作者"
                      value={formData.author || ''}
                      onChange={e => setFormData({ ...formData, author: e.target.value })}
                    />
                  </div>
                  <div className="form-item">
                    <label className="form-label">ISBN</label>
                    <input
                      className="input"
                      placeholder="请输入ISBN"
                      value={formData.isbn || ''}
                      onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                    />
                  </div>
                  <div className="form-item">
                    <label className="form-label">出版年份</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="2024"
                      value={formData.year || ''}
                      onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-item">
                    <label className="form-label">大类</label>
                    <select
                      className="select"
                      value={formData.category || ''}
                      onChange={e => {
                        const cat = e.target.value
                        const subtag = cat && categories[cat] ? categories[cat].subtags[0] : ''
                        setFormData({ ...formData, category: cat, subtag })
                      }}
                    >
                      <option value="">自动归类</option>
                      {CATEGORY_KEYS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-item">
                    <label className="form-label">子类标签</label>
                    <select
                      className="select"
                      value={formData.subtag || ''}
                      onChange={e => setFormData({ ...formData, subtag: e.target.value })}
                      disabled={!formData.category}
                    >
                      <option value="">自动匹配</option>
                      {formData.category && categories[formData.category]?.subtags.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-item full">
                    <label className="form-label">简介</label>
                    <textarea
                      className="textarea"
                      placeholder="请输入图书简介，帮助系统自动归类..."
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn secondary" onClick={() => setShowForm(false)}>取消</button>
                <button className="btn" onClick={handleSubmitForm}>
                  {editingBook ? '保存修改' : '确认添加'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast ${toast.type}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const AppWithRoutes: React.FC = () => (
  <Routes>
    <Route path="/*" element={<App />} />
  </Routes>
)

export default AppWithRoutes
