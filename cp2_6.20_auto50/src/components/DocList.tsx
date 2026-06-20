import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp, CATEGORIES, pickColorForCategory, Document } from '../data/store'

export default function DocList() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const catFromQuery = params.get('cat')
  const [activeFilter, setActiveFilter] = useState<string>('全部')

  useEffect(() => {
    if (catFromQuery && CATEGORIES.includes(catFromQuery)) {
      setActiveFilter(catFromQuery)
    } else {
      setActiveFilter('全部')
    }
  }, [catFromQuery])

  const filteredDocs = useMemo<Document[]>(() => {
    const list = state.documents.slice()
    if (activeFilter !== '全部') {
      return list.filter((d) => d.category === activeFilter)
    }
    return list
  }, [state.documents, activeFilter])

  const openDoc = (id: string) => {
    navigate(`/doc/${id}`)
  }

  return (
    <div className="doclists-wrap">
      <div className="doclists-header">
        <div className="doclists-title">
          <h1>
            {activeFilter === '全部'
              ? '全部文档'
              : activeFilter}
          </h1>
          <p>
            共 {filteredDocs.length} 篇 · 由 {state.documents
              .reduce<Set<string>>((s, d) => s.add(d.author), new Set())
              .size}{' '}
            位团队成员维护
          </p>
        </div>

        <div className="doclists-filter">
          <button
            className={`filter-chip ${activeFilter === '全部' ? 'active' : ''}`}
            onClick={() => setActiveFilter('全部')}
          >
            全部
          </button>
          {CATEGORIES.map((c) => {
            const count = state.documents.filter((d) => d.category === c).length
            if (count === 0) return null
            return (
              <button
                key={c}
                className={`filter-chip ${activeFilter === c ? 'active' : ''}`}
                onClick={() => setActiveFilter(c)}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      <div className="doc-grid">
        {filteredDocs.map((doc) => {
          const color = pickColorForCategory(doc.category)
          const excerpt = doc.content
            .replace(/[#*`>\-\[\]\(\)]/g, '')
            .replace(/\s+/g, ' ')
            .slice(0, 70)
          return (
            <div
              key={doc.id}
              className="doc-card"
              style={{ ['--stripe' as string]: color }}
              onClick={() => openDoc(doc.id)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openDoc(doc.id)
              }}
            >
              <div className="doc-card-cat">{doc.category}</div>
              <h3>{doc.title}</h3>
              <p className="doc-card-excerpt">{excerpt || '暂无摘要'}…</p>
              <div className="doc-card-foot">
                <div className="author">
                  <span className="author-avatar-sm">{doc.author.slice(0, 1)}</span>
                  <span>{doc.author}</span>
                </div>
                <span>{doc.updatedAt.slice(5, 10)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredDocs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-400)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 15 }}>该分类下暂无文档</p>
        </div>
      )}
    </div>
  )
}
