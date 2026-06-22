import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import CardList from './components/CardList'
import CardEditor from './components/CardEditor'
import ReviewPanel from './components/ReviewPanel'
import Sidebar from './components/Sidebar'
import {
  Card,
  TagInfo,
  ViewMode,
  fetchCards,
  fetchTags,
  createCard,
  updateCard,
  reviewCard,
  deleteCard,
  ReviewGrade,
} from './api'

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    timerRef.current = setTimeout(() => setDebounced(value), delay)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [value, delay])
  return debounced
}

export default function App() {
  const [view, setView] = useState<ViewMode>('list')
  const [cards, setCards] = useState<Card[]>([])
  const [tags, setTags] = useState<TagInfo[]>([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search, 200)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [c, t] = await Promise.all([
        fetchCards(debouncedSearch, activeTag),
        fetchTags(),
      ])
      setCards(c)
      setTags(t)
    } catch (e) {
      showToast((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, activeTag, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const dueCount = useMemo(() => {
    const now = Date.now()
    return cards.filter(c => c.nextReviewAt <= now).length
  }, [cards])

  const handleNewCard = () => {
    setEditingCard(null)
    setView('editor')
  }

  const handleEditCard = (card: Card) => {
    setEditingCard(card)
    setView('editor')
  }

  const handleSaveCard = async (data: { title: string; content: string; tags: string[] }) => {
    try {
      if (editingCard) {
        const updated = await updateCard(editingCard.id, data)
        setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
        showToast('卡片已更新')
      } else {
        const created = await createCard(data)
        setCards(prev => [created, ...prev])
        setEditingCard(created)
        showToast('卡片已创建')
      }
      await loadData()
    } catch (e) {
      showToast((e as Error).message)
      throw e
    }
  }

  const handleDeleteCard = async (id: string) => {
    if (!confirm('确定删除这张卡片吗？')) return
    try {
      await deleteCard(id)
      setCards(prev => prev.filter(c => c.id !== id))
      if (editingCard?.id === id) {
        setEditingCard(null)
        setView('list')
      }
      showToast('卡片已删除')
    } catch (e) {
      showToast((e as Error).message)
    }
  }

  const handleReviewCard = async (id: string, grade: ReviewGrade) => {
    try {
      const updated = await reviewCard(id, grade)
      setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
    } catch (e) {
      showToast((e as Error).message)
    }
  }

  const handleBack = () => {
    setEditingCard(null)
    setView('list')
    loadData()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">📚 知识卡片</h1>
          {view === 'list' && (
            <div className="search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="搜索卡片标题或内容..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </div>
          )}
          <div className="header-actions">
            {view === 'list' && (
              <>
                <button className="btn btn-primary" onClick={handleNewCard}>
                  ＋ 新建卡片
                </button>
                <button
                  className={`btn ${view === 'review' ? 'btn-accent' : 'btn-secondary'}`}
                  onClick={() => setView(view === 'review' ? 'list' : 'review')}
                >
                  🔄 复习{dueCount > 0 && <span className="badge">{dueCount}</span>}
                </button>
              </>
            )}
            {view !== 'list' && (
              <button className="btn btn-secondary" onClick={handleBack}>
                ← 返回列表
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {view === 'list' && (
          <div className="card-list-layout">
            <Sidebar
              tags={tags}
              activeTag={activeTag}
              totalCards={cards.length}
              dueCount={dueCount}
              onTagClick={t => setActiveTag(activeTag === t ? undefined : t)}
              onStartReview={() => setView('review')}
            />
            <CardList
              cards={cards}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              loading={loading}
            />
          </div>
        )}
        {view === 'editor' && (
          <CardEditor
            card={editingCard}
            onSave={handleSaveCard}
            onDelete={editingCard ? () => handleDeleteCard(editingCard.id) : undefined}
            onBack={handleBack}
          />
        )}
        {view === 'review' && (
          <ReviewPanel
            onReview={handleReviewCard}
            onBack={() => { setView('list'); loadData() }}
            onEditCard={handleEditCard}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
