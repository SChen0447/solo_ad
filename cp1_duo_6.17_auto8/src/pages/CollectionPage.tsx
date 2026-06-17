import { useState, useEffect, useCallback } from 'react'
import { Star, Loader2, FileText } from 'lucide-react'
import DocCard from '../components/DocCard'
import { getDocById, DocItem } from '../api/docSearch'

const TABS = [
  { label: '全部', value: 'all' },
  { label: 'React', value: 'React' },
  { label: 'TypeScript', value: 'TypeScript' },
  { label: 'Tailwind CSS', value: 'Tailwind CSS' },
]

function CollectionPage() {
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([])
  const [bookmarkedDocs, setBookmarkedDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    try {
      const savedIds: number[] = JSON.parse(localStorage.getItem('docrover_bookmarks') || '[]')
      setBookmarkIds(savedIds)

      const docs: DocItem[] = []
      for (const id of savedIds) {
        const doc = await getDocById(id)
        if (doc) {
          docs.push(doc)
        }
      }
      setBookmarkedDocs(docs)
    } catch (err) {
      console.error('Failed to load bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  const toggleBookmark = useCallback((id: number) => {
    setRemovingIds((prev) => new Set(prev).add(id))

    setTimeout(() => {
      const newIds = bookmarkIds.filter((b) => b !== id)
      setBookmarkIds(newIds)
      localStorage.setItem('docrover_bookmarks', JSON.stringify(newIds))
      window.dispatchEvent(new Event('bookmarkChange'))

      setBookmarkedDocs((prev) => prev.filter((doc) => doc.id !== id))
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }, [bookmarkIds])

  const filteredDocs = activeTab === 'all'
    ? bookmarkedDocs
    : bookmarkedDocs.filter((doc) => doc.techStack === activeTab)

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h1 className="collection-title">我的收藏</h1>
        <div className="collection-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={`collection-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" />
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="collection-list">
          {filteredDocs.map((doc) => (
            <DocCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              description={doc.description}
              codeSnippet={doc.codeSnippet}
              techStack={doc.techStack}
              isBookmarked={true}
              onBookmarkToggle={toggleBookmark}
              isRemoving={removingIds.has(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Star className="empty-state-icon" />
          <p className="empty-state-text">
            {bookmarkedDocs.length === 0
              ? '还没有收藏任何文档'
              : '该分类下没有收藏的文档'}
          </p>
        </div>
      )}
    </div>
  )
}

export default CollectionPage
